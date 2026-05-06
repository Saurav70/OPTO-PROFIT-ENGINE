/**
 * OPTOPROFIT ENGINE - Line Balancing Optimizer
 * Aligned with TEIRAC Industrial Standards.
 */

import { buildContext, evaluateFormula, getVariableValue } from './formulaEngine';

/* ─── Private Helpers ─── */
const toFiniteNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const getTaskTime = (task) => Math.max(0, toFiniteNumber(task?.time, 0));

const getTotalTaskTime = (tasks) => tasks.reduce((sum, task) => sum + getTaskTime(task), 0);

/* ─── Cycle Time (C) ─── */
// C = Available Production Time / Daily Demand
export const calculateTaktTime = (config) => {
  const formulas = config?.formulas || {};
  const variables = config?.variables || [];
  
  if (formulas.TaktTime) {
    const context = buildContext(variables);
    return evaluateFormula(formulas.TaktTime, context);
  }

  // Fallback to legacy fields or variable keys
  const availableTime = getVariableValue(variables, 'shift_time', config?.shiftTime || 0);
  const demand = getVariableValue(variables, 'demand', config?.demand || 0);
  
  if (demand <= 0) return 0;
  return availableTime / demand;
};

/* ─── Theoretical Minimum Workstations (Nmin) ─── */
// Nmin = Sum(t) / C
export const calculateNmin = (tasks, taktTime) => {
  if (!taktTime || taktTime <= 0) return 0;
  const totalTime = getTotalTaskTime(tasks);
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
    .reduce((sum, t) => sum + getTaskTime(t), 0);
  return getTaskTime(task) + followerTime;
};

/* ─── Main Optimization Engine ─── */
export const runOptimization = (tasks, taktTime, heuristic = 'LTF', config = {}) => {
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
    sortedTasks = [...tasks].sort((a, b) => getTaskTime(b) - getTaskTime(a));
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
      sortedCandidates = [...candidates].sort((a, b) => getTaskTime(b) - getTaskTime(a));
    }

    let bestTask = null;
    for (const task of sortedCandidates) {
      const taskTime = getTaskTime(task);
      const fitsTime = (currentStation.time + taskTime <= taktTime) || currentStation.tasks.length === 0;
      if (!fitsTime) continue;

      // ── Dynamic Zone Exclusion Check (reads from config.zone_exclusions) ──
      const exclusions = config?.zone_exclusions || {};
      const stationZones = currentStation.tasks.map(t => t.zoning).filter(z => z && z !== 'None');

      if (task.zoning && task.zoning !== 'None') {
        const isExcluded = stationZones.some(sz => {
          if (exclusions[sz]?.includes(task.zoning)) return true;
          if (exclusions[task.zoning]?.includes(sz)) return true;
          return false;
        });
        if (isExcluded) continue;
      }

      bestTask = task;
      break;
    }

    if (bestTask) {
      const bestTaskTime = getTaskTime(bestTask);
      currentStation.tasks.push(bestTask);
      currentStation.time += bestTaskTime;
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
  const totalTaskTime = getTotalTaskTime(tasks);
  const nActual = stations.length;
  
  const efficiency = nActual > 0 ? (totalTaskTime / (nActual * taktTime)) * 100 : 0;
  const totalIdleTime = (nActual * taktTime) - totalTaskTime;
  const balanceDelay = 100 - efficiency;

  // Smoothness Index (SI) Calculation
  const actualCycleTime = stations.length > 0 ? Math.max(...stations.map(s => s.time)) : 0;
  const smoothnessIndex = stations.length > 0 
    ? Math.sqrt(stations.reduce((sum, s) => sum + Math.pow(actualCycleTime - s.time, 2), 0))
    : 0;

  return {
    stations,
    efficiency: efficiency.toFixed(2),
    balanceDelay: balanceDelay.toFixed(2),
    nActual,
    actualCycleTime,
    totalIdleTime: totalIdleTime > 0 ? totalIdleTime : 0,
    totalTaskTime,
    smoothnessIndex: smoothnessIndex.toFixed(2)
  };
};

/* ─── Critical Path Analysis (Forward-Backward Pass) ─── */
// Returns the station number (1-indexed) containing the critical path bottleneck.
export const calculateCriticalPath = (tasks, stations) => {
  if (!tasks || tasks.length === 0) return { criticalStation: 1, projectDuration: 0, criticalTaskIds: [] };

  // Build adjacency maps
  const taskMap = {};
  tasks.forEach(t => { taskMap[t.id] = t; });

  const getTime = (id) => Math.max(0, toFiniteNumber(taskMap[id]?.time, 0));

  // --- Forward Pass: compute ES and EF ---
  const ES = {}; // Early Start
  const EF = {}; // Early Finish
  const topoOrder = [];
  const inDegree = {};
  const adj = {}; // id -> [successor ids]
  tasks.forEach(t => { inDegree[t.id] = 0; adj[t.id] = []; });
  tasks.forEach(t => {
    (t.predecessors || []).filter(p => p && p !== 'None' && p !== '').forEach(pId => {
      if (adj[pId]) adj[pId].push(t.id);
      inDegree[t.id] = (inDegree[t.id] || 0) + 1;
    });
  });

  const queue = tasks.filter(t => (inDegree[t.id] || 0) === 0).map(t => t.id);
  tasks.forEach(t => { ES[t.id] = 0; });

  while (queue.length > 0) {
    const current = queue.shift();
    topoOrder.push(current);
    EF[current] = ES[current] + getTime(current);
    (adj[current] || []).forEach(succId => {
      ES[succId] = Math.max(ES[succId] || 0, EF[current]);
      inDegree[succId]--;
      if (inDegree[succId] === 0) queue.push(succId);
    });
  }

  const projectDuration = Math.max(0, ...Object.values(EF));

  // --- Backward Pass: compute LF and LS ---
  const LF = {};
  const LS = {};
  tasks.forEach(t => { LF[t.id] = projectDuration; });

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const id = topoOrder[i];
    (adj[id] || []).forEach(succId => {
      LF[id] = Math.min(LF[id], LS[succId] !== undefined ? LS[succId] : projectDuration);
    });
    LS[id] = LF[id] - getTime(id);
  }

  // --- Identify Critical Tasks (Total Float = 0) ---
  const criticalTaskIds = tasks
    .filter(t => Math.abs((LS[t.id] || 0) - (ES[t.id] || 0)) < 0.001)
    .map(t => t.id);

  // --- Find which station contains the most critical tasks ---
  let criticalStation = 1;
  if (stations && stations.length > 0) {
    let maxCritical = -1;
    stations.forEach((st, idx) => {
      const count = st.tasks.filter(t => criticalTaskIds.includes(t.id)).length;
      if (count > maxCritical) {
        maxCritical = count;
        criticalStation = idx + 1;
      }
    });
  }

  return { criticalStation, projectDuration, criticalTaskIds };
};

/* ─── Formula Trace Generator ─── */
// Returns a structured array of formula derivation steps for live display.
export const generateFormulaTrace = (tasks, config, optimization) => {
  const variables = config?.variables || [];
  const T = getVariableValue(variables, 'shift_time', toFiniteNumber(config?.shiftTime, 480));
  const D = getVariableValue(variables, 'demand', toFiniteNumber(config?.demand, 1));
  const C = calculateTaktTime(config); // Use the dynamic calculator
  const sumT = getTotalTaskTime(tasks);
  const Nmin = C > 0 ? Math.ceil(sumT / C) : 0;
  const N = optimization?.nActual || 0;
  const E = N > 0 && C > 0 ? (sumT / (N * C)) * 100 : 0;
  const BD = 100 - E;
  const SI = toFiniteNumber(optimization?.smoothnessIndex, 0);
  const idleTotal = toFiniteNumber(optimization?.totalIdleTime, 0);

  return [
    {
      label: 'Cycle Time (Takt)',
      symbol: 'C',
      formula: config?.formulas?.TaktTime || 'shift_time ÷ demand',
      substituted: `${T} ÷ ${D}`,
      result: `${C.toFixed(2)} min`,
      color: 'var(--accent-primary)'
    },
    {
      label: 'Total Work Content',
      symbol: 'Σt',
      formula: 'Σ all task times',
      substituted: tasks.map(t => t.time).join(' + '),
      result: `${sumT} min`,
      color: '#0dcaf0'
    },
    {
      label: 'Min Workstations',
      symbol: 'N_min',
      formula: '⌈Σt ÷ C⌉',
      substituted: `⌈${sumT} ÷ ${C.toFixed(2)}⌉`,
      result: `${Nmin} Stations`,
      color: 'var(--accent-secondary)'
    },
    {
      label: 'Line Efficiency',
      symbol: 'E',
      formula: '(Σt ÷ N×C) × 100',
      substituted: `(${sumT} ÷ ${N}×${C.toFixed(2)}) × 100`,
      result: `${E.toFixed(2)}%`,
      color: 'var(--accent-primary)'
    },
    {
      label: 'Balance Delay',
      symbol: 'BD',
      formula: '100 − E',
      substituted: `100 − ${E.toFixed(2)}`,
      result: `${BD.toFixed(2)}%`,
      color: 'var(--accent-warning)'
    },
    {
      label: 'Total Idle Time',
      symbol: 'Σi',
      formula: '(N × C) − Σt',
      substituted: `(${N} × ${C.toFixed(2)}) − ${sumT}`,
      result: `${idleTotal.toFixed(2)} min`,
      color: 'var(--accent-danger)'
    },
    {
      label: 'Smoothness Index',
      symbol: 'SI',
      formula: '√Σ(C_max − C_i)²',
      substituted: `√Σ(bottleneck − station_i)²`,
      result: `${Number(SI).toFixed(2)} coef`,
      color: 'var(--accent-secondary)'
    },
  ];
};

/* ─── Financial ROI Calculations ─── */
export const calculateROI = (tasks, config, optimization) => {
  const variables = config?.variables || [];
  const formulas = config?.formulas || {};
  const context = buildContext(variables, {
    total_task_time: getTotalTaskTime(tasks),
    n_actual: optimization?.nActual || 0,
    takt_time: calculateTaktTime(config)
  });

  // Dynamic Monthly Profit
  let monthlyProfit = 0;
  if (formulas.MonthlyProfit) {
    monthlyProfit = evaluateFormula(formulas.MonthlyProfit, context);
  } else {
    // Fallback
    const unitPrice = getVariableValue(variables, 'unit_price', config?.unitPrice || 0);
    const unitCost = getVariableValue(variables, 'unit_cost', config?.unitCost || 0);
    const demand = getVariableValue(variables, 'demand', config?.demand || 0);
    const workDays = getVariableValue(variables, 'work_days', config?.workDaysPerMonth || 0);
    monthlyProfit = demand * workDays * (unitPrice - unitCost);
  }

  // Dynamic ROI Efficiency (Demonstrates conditional logic)
  let profitIncrease = 0;
  if (formulas.ROI_Efficiency) {
    profitIncrease = evaluateFormula(formulas.ROI_Efficiency, context);
  } else {
    profitIncrease = monthlyProfit * 0.1; // Default 10% lift
  }

  return {
    monthlyProfit,
    profitIncrease,
    dailyProduction: getVariableValue(variables, 'demand', 0)
  };
};
