/**
 * OPTOPROFIT ENGINE - Line Balancing Optimizer
 * Aligned with TEIRAC Industrial Standards.
 */

/* ─── Cycle Time (C) ─── */
// C = Available Production Time / Daily Demand
export const calculateTaktTime = (availableTime, demand) => {
  if (!demand || demand <= 0) return 0;
  return availableTime / demand;
};

/* ─── Theoretical Minimum Workstations (Nmin) ─── */
// Nmin = Sum(t) / C
export const calculateNmin = (tasks, taktTime) => {
  if (!taktTime || taktTime <= 0) return 0;
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
      if (!Object.prototype.hasOwnProperty.call(graph, neighbor)) continue;
      if (recStack.has(neighbor)) {
        errors.push({
          taskId: nodeId,
          cycle: [...path, nodeId, neighbor],
          message: `Circular Dependency! Task ${nodeId} relies on Task ${neighbor}, which relies on Task ${nodeId}.`
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

/* ─── Count Following Tasks (MFT heuristic) ─── */
const getFollowers = (taskId, tasks) => {
  const forward = {};
  tasks.forEach(t => { forward[t.id] = []; });
  tasks.forEach(t => {
    t.predecessors.filter(p => p && p !== 'None').forEach(pId => {
      if (forward[pId]) forward[pId].push(t.id);
    });
  });
  const visited = new Set();
  const queue = [taskId];
  while (queue.length > 0) {
    const current = queue.shift();
    (forward[current] || []).forEach(fId => {
      if (!visited.has(fId)) { visited.add(fId); queue.push(fId); }
    });
  }
  return visited;
};

/* ─── Ranked Positional Weight (RPW) Calculation ─── */
const calculateRPW = (taskId, tasks) => {
  const followers = getFollowers(taskId, tasks);
  const task = tasks.find(t => t.id === taskId);
  const followerTime = tasks
    .filter(t => followers.has(t.id))
    .reduce((sum, t) => sum + t.time, 0);
  return task.time + followerTime;
};

/* ─── Main Optimization Engine ─── */
export const runOptimization = (tasks, taktTime, heuristic = 'LTF') => {
  if (!taktTime || taktTime <= 0 || tasks.length === 0) {
    return { stations: [], efficiency: '0.00', nActual: 0, totalIdleTime: 0, balanceDelay: '0.00' };
  }

  // Heuristic Sorting
  let sortedTasks;
  if (heuristic === 'MFT') {
    sortedTasks = [...tasks].sort((a, b) => getFollowers(b.id, tasks).size - getFollowers(a.id, tasks).size);
  } else if (heuristic === 'RPW') {
    sortedTasks = [...tasks].sort((a, b) => calculateRPW(b.id, tasks) - calculateRPW(a.id, tasks));
  } else {
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

    const candidates = unassigned.filter(t => {
      if (!t.predecessors || t.predecessors.length === 0 || t.predecessors[0] === 'None' || t.predecessors[0] === '') return true;
      return t.predecessors.every(pId => assignedIds.has(pId));
    });

    if (candidates.length === 0) {
      if (currentStation.tasks.length > 0) {
        stations.push(currentStation);
        currentStation = { tasks: [], time: 0 };
      } else break;
      continue;
    }

    let sortedCandidates;
    if (heuristic === 'MFT') {
      sortedCandidates = [...candidates].sort((a, b) => getFollowers(b.id, tasks).size - getFollowers(a.id, tasks).size);
    } else if (heuristic === 'RPW') {
      sortedCandidates = [...candidates].sort((a, b) => calculateRPW(b.id, tasks) - calculateRPW(a.id, tasks));
    } else {
      sortedCandidates = [...candidates].sort((a, b) => b.time - a.time);
    }

    let bestTask = null;
    for (const task of sortedCandidates) {
      const fitsTime = (currentStation.time + task.time <= taktTime);
      if (!fitsTime) continue;

      const stationPosZones = currentStation.tasks.map(t => t.zoning).filter(z => z && z.startsWith('Positive'));
      if (task.zoning && task.zoning.startsWith('Positive')) {
        if (stationPosZones.length > 0 && !stationPosZones.includes(task.zoning)) continue;
      } else {
        if (stationPosZones.length > 0) continue; 
      }

      const stationNegZones = currentStation.tasks.map(t => t.zoning).filter(z => z && z.startsWith('Negative'));
      if (task.zoning && task.zoning.startsWith('Negative')) {
        if (stationNegZones.length > 0 && stationNegZones.some(z => z !== task.zoning)) continue;
      }

      bestTask = task;
      break;
    }

    if (bestTask) {
      currentStation.tasks.push(bestTask);
      currentStation.time += bestTask.time;
      assignedIds.add(bestTask.id);
      unassigned = unassigned.filter(t => t.id !== bestTask.id);
    } else {
      stations.push(currentStation);
      currentStation = { tasks: [], time: 0 };
    }
  }

  if (currentStation.tasks.length > 0) {
    stations.push(currentStation);
  }

  /* ─── Mathematical Performance Metrics (PDF Aligned) ─── */
  const totalTaskTime = tasks.reduce((sum, t) => sum + t.time, 0);
  const nActual = stations.length;
  
  const efficiency = nActual > 0 ? (totalTaskTime / (nActual * taktTime)) * 100 : 0;
  const totalIdleTime = (nActual * taktTime) - totalTaskTime;
  const balanceDelay = 100 - efficiency;

  return {
    stations,
    efficiency: efficiency.toFixed(2),
    balanceDelay: balanceDelay.toFixed(2),
    nActual,
    actualCycleTime: stations.length > 0 ? Math.max(...stations.map(s => s.time)) : 0,
    totalIdleTime: totalIdleTime > 0 ? totalIdleTime : 0,
    totalTaskTime
  };
};
