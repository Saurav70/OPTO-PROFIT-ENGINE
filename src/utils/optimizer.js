/**
 * OPTOPROFIT ENGINE - Line Balancing Optimizer
 * Implements "Longest Task First" (LTF) and "Most Following Tasks" (MFT) Heuristics.
 */

/* ─── Takt Time ─── */
export const calculateTaktTime = (availableTime, demand) => {
  if (!demand || demand <= 0) return 0;
  return availableTime / demand;
};

/* ─── Theoretical Minimum Workstations ─── */
export const calculateNmin = (tasks, taktTime) => {
  if (!taktTime) return 0;
  const totalTime = tasks.reduce((sum, t) => sum + t.time, 0);
  return Math.ceil(totalTime / taktTime);
};

/* ─── Circular Dependency Detection ─── */
export const detectCircularDependency = (tasks) => {
  const graph = {};
  tasks.forEach(t => { graph[t.id] = t.predecessors.filter(p => p && p !== 'None'); });

  const visited = new Set();
  const recStack = new Set();
  const errors = [];

  const dfs = (nodeId, path) => {
    visited.add(nodeId);
    recStack.add(nodeId);
    const neighbors = graph[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!graph.hasOwnProperty(neighbor)) continue;          // skip unknown IDs
      if (recStack.has(neighbor)) {
        errors.push({
          taskId: nodeId,
          cycle: [...path, nodeId, neighbor],
          message: `Circular Dependency! Task ${nodeId} relies on Task ${neighbor}, which relies on Task ${nodeId} via ${path.join(' → ')}.`
        });
        return;
      }
      if (!visited.has(neighbor)) dfs(neighbor, [...path, nodeId]);
    }
    recStack.delete(nodeId);
  };

  Object.keys(graph).forEach(id => { if (!visited.has(id)) dfs(id, []); });
  return errors;
};

/* ─── Count Following Tasks (for MFT heuristic) ─── */
const countFollowers = (taskId, tasks) => {
  // Build a forward adjacency: for each task, who depends on it?
  const forward = {};
  tasks.forEach(t => { forward[t.id] = []; });
  tasks.forEach(t => {
    t.predecessors.filter(p => p && p !== 'None').forEach(pId => {
      if (forward[pId]) forward[pId].push(t.id);
    });
  });
  // BFS to count all transitive followers
  const visited = new Set();
  const queue = [taskId];
  while (queue.length > 0) {
    const current = queue.shift();
    (forward[current] || []).forEach(fId => {
      if (!visited.has(fId)) { visited.add(fId); queue.push(fId); }
    });
  }
  return visited.size;
};

/* ─── Main Optimization Engine ─── */
export const runOptimization = (tasks, taktTime, heuristic = 'LTF') => {
  if (!taktTime || taktTime <= 0 || tasks.length === 0) {
    return { stations: [], efficiency: '0.00', nActual: 0, totalIdleTime: 0 };
  }

  // Sort based on chosen heuristic
  let sortedTasks;
  if (heuristic === 'MFT') {
    sortedTasks = [...tasks].sort((a, b) => countFollowers(b.id, tasks) - countFollowers(a.id, tasks));
  } else {
    // LTF (default)
    sortedTasks = [...tasks].sort((a, b) => b.time - a.time);
  }

  let unassigned = [...sortedTasks];
  const stations = [];
  let currentStation = { tasks: [], time: 0 };
  const assignedIds = new Set();

  let safetyCounter = 0;
  const maxIterations = tasks.length * tasks.length + 100;

  while (unassigned.length > 0 && safetyCounter < maxIterations) {
    safetyCounter++;

    // Find tasks whose predecessors are all assigned
    const candidates = unassigned.filter(t => {
      if (!t.predecessors || t.predecessors.length === 0 || t.predecessors[0] === 'None' || t.predecessors[0] === '') return true;
      return t.predecessors.every(pId => assignedIds.has(pId));
    });

    if (candidates.length === 0) {
      // All remaining tasks have unmet predecessors → push current station, start new
      if (currentStation.tasks.length > 0) {
        stations.push(currentStation);
        currentStation = { tasks: [], time: 0 };
      } else {
        // True deadlock (circular dependency) — break
        break;
      }
      continue;
    }

    // Re-sort candidates by heuristic priority
    let sortedCandidates;
    if (heuristic === 'MFT') {
      sortedCandidates = [...candidates].sort((a, b) => countFollowers(b.id, tasks) - countFollowers(a.id, tasks));
    } else {
      sortedCandidates = [...candidates].sort((a, b) => b.time - a.time);
    }

    // Try to find a candidate that fits in the current station
    let bestTask = null;
    for (const task of sortedCandidates) {
      if (currentStation.time + task.time <= taktTime) {
        bestTask = task;
        break;
      }
    }

    if (bestTask) {
      currentStation.tasks.push(bestTask);
      currentStation.time += bestTask.time;
      assignedIds.add(bestTask.id);
      unassigned = unassigned.filter(t => t.id !== bestTask.id);
    } else {
      // Current station is full — start new one
      stations.push(currentStation);
      currentStation = { tasks: [], time: 0 };
    }
  }

  // Push the final station
  if (currentStation.tasks.length > 0) {
    stations.push(currentStation);
  }

  // Calculate efficiency based on actual achieved bottleneck cycle time
  const totalTaskTime = tasks.reduce((sum, t) => sum + t.time, 0);
  const actualCycleTime = stations.length > 0 ? Math.max(...stations.map(s => s.time)) : 0;
  
  // Real efficiency uses the bottle neck time, not the target takt time
  const totalCycleTimeUsed = stations.length * actualCycleTime;
  const efficiency = totalCycleTimeUsed > 0 ? (totalTaskTime / totalCycleTimeUsed) * 100 : 0;

  return {
    stations,
    efficiency: efficiency.toFixed(2),
    nActual: stations.length,
    actualCycleTime, // Bottleneck cycle time
    totalIdleTime: totalCycleTimeUsed > 0 ? totalCycleTimeUsed - totalTaskTime : 0,
    totalTaskTime
  };
};
