/**
 * OPTOPROFIT ENGINE — Comprehensive Optimizer Test Suite
 * =======================================================
 * Covers:
 *   1. calculateNmin  — Theoretical Minimum Workstations
 *   2. detectCircularDependency — DAG cycle detection
 *   3. runOptimization — Contract tests for LTF, MFT, and RPW heuristics
 *      with a deterministic 5-task assembly line.
 *
 * Run with:  npm run test
 */

import { describe, it, expect } from 'vitest';
import { calculateNmin, detectCircularDependency, runOptimization } from './optimizer';

// ──────────────────────────────────────────────────────────────────────────────
// Shared deterministic task set (Digital Oscilloscope subset — 5 tasks)
// Total work content: 12 + 18 + 15 + 10 + 20 = 75 min
// Takt time used: 30 min → Nmin = ceil(75/30) = 3 stations
//
// Precedence chain:
//   A (12min, no predecessors)
//   B (18min, predecessor: A)
//   C (15min, predecessor: A)
//   D (10min, predecessor: A)
//   E (20min, predecessors: B, C)
// ──────────────────────────────────────────────────────────────────────────────
const SAMPLE_TASKS = [
  { id: 'A', time: 12, predecessors: [],        zoning: 'None' },
  { id: 'B', time: 18, predecessors: ['A'],     zoning: 'None' },
  { id: 'C', time: 15, predecessors: ['A'],     zoning: 'None' },
  { id: 'D', time: 10, predecessors: ['A'],     zoning: 'None' },
  { id: 'E', time: 20, predecessors: ['B', 'C'], zoning: 'None' },
];

const TAKT_TIME = 30; // minutes — allows 3 ideal stations
const EMPTY_CONFIG = {};

// ──────────────────────────────────────────────────────────────────────────────
// Section 1: calculateNmin
// ──────────────────────────────────────────────────────────────────────────────
describe('calculateNmin (Theoretical Minimum Workstations)', () => {
  it('should calculate correct stations under normal conditions', () => {
    const tasks = [
      { id: 'A', time: 10 },
      { id: 'B', time: 15 },
      { id: 'C', time: 20 }
    ];
    // Sum = 45. Takt = 20. 45/20 = 2.25 → Ceil is 3.
    expect(calculateNmin(tasks, 20)).toBe(3);
  });

  it('should return 0 if taktTime is <= 0 or invalid', () => {
    const tasks = [{ id: 'A', time: 10 }];
    expect(calculateNmin(tasks, 0)).toBe(0);
    expect(calculateNmin(tasks, -5)).toBe(0);
    expect(calculateNmin(tasks, null)).toBe(0);
  });

  it('should handle empty task list', () => {
    expect(calculateNmin([], 10)).toBe(0);
  });

  it('should return 1 when total time fits exactly in 1 takt period', () => {
    const tasks = [{ id: 'A', time: 30 }];
    expect(calculateNmin(tasks, 30)).toBe(1);
  });

  it('should correctly apply ceiling when result is not an integer', () => {
    // Sum = 75, Takt = 30 → 75/30 = 2.5 → ceil = 3
    expect(calculateNmin(SAMPLE_TASKS, TAKT_TIME)).toBe(3);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Section 2: detectCircularDependency
// ──────────────────────────────────────────────────────────────────────────────
describe('detectCircularDependency', () => {
  it('should pass on an empty or acyclic list of tasks', () => {
    const tasks = [
      { id: 'A', predecessors: [] },
      { id: 'B', predecessors: ['A'] },
      { id: 'C', predecessors: ['B'] }
    ];
    expect(detectCircularDependency(tasks).length).toBe(0);
  });

  it('should detect direct circular dependencies (A → B → A)', () => {
    const tasks = [
      { id: 'A', predecessors: ['B'] },
      { id: 'B', predecessors: ['A'] }
    ];
    const errors = detectCircularDependency(tasks);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Circular Dependency');
  });

  it('should detect complex circular dependencies (A → B → C → A)', () => {
    const tasks = [
      { id: 'A', predecessors: ['C'] },
      { id: 'B', predecessors: ['A'] },
      { id: 'C', predecessors: ['B'] }
    ];
    const errors = detectCircularDependency(tasks);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Circular Dependency');
  });

  it('should pass on the 5-task SAMPLE_TASKS (valid DAG)', () => {
    expect(detectCircularDependency(SAMPLE_TASKS).length).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Section 3: runOptimization — Contract tests for all 3 heuristics
// ──────────────────────────────────────────────────────────────────────────────
describe('runOptimization — LTF heuristic (Longest Task First)', () => {
  const result = runOptimization(SAMPLE_TASKS, TAKT_TIME, 'LTF', EMPTY_CONFIG);

  it('should return a non-empty stations array', () => {
    expect(result.stations.length).toBeGreaterThan(0);
  });

  it('should assign ALL tasks — no task left unassigned', () => {
    const assigned = result.stations.flatMap(s => s.tasks.map(t => t.id));
    const originalIds = SAMPLE_TASKS.map(t => t.id).sort();
    expect(assigned.sort()).toEqual(originalIds);
  });

  it('should respect precedence: A must be assigned before or with B, C, D (not after)', () => {
    const stationOf = {};
    result.stations.forEach((s, idx) => s.tasks.forEach(t => { stationOf[t.id] = idx; }));
    // A must be in the same or earlier station than B, C, D (co-station is valid when takt allows)
    expect(stationOf['A']).toBeLessThanOrEqual(stationOf['B']);
    expect(stationOf['A']).toBeLessThanOrEqual(stationOf['C']);
    expect(stationOf['A']).toBeLessThanOrEqual(stationOf['D']);
  });

  it('should respect precedence: B and C must be assigned before or with E (not after)', () => {
    const stationOf = {};
    result.stations.forEach((s, idx) => s.tasks.forEach(t => { stationOf[t.id] = idx; }));
    expect(stationOf['B']).toBeLessThanOrEqual(stationOf['E']);
    expect(stationOf['C']).toBeLessThanOrEqual(stationOf['E']);
  });

  it('should not exceed takt time in any station (except forced overflows)', () => {
    result.stations.forEach((station) => {
      // A station with a single task may exceed takt only if the task itself does
      const hasSingleOversize = station.tasks.length === 1 && station.tasks[0].time > TAKT_TIME;
      if (!hasSingleOversize) {
        expect(station.time).toBeLessThanOrEqual(TAKT_TIME + 0.001); // float tolerance
      }
    });
  });

  it('should return a valid efficiency value between 0 and 100+', () => {
    const eff = parseFloat(result.efficiency);
    expect(eff).toBeGreaterThanOrEqual(0);
    expect(eff).toBeLessThanOrEqual(200); // sanity upper bound
  });

  it('should return a non-negative totalIdleTime', () => {
    expect(result.totalIdleTime).toBeGreaterThanOrEqual(0);
  });

  it('should return a non-negative smoothnessIndex', () => {
    expect(parseFloat(result.smoothnessIndex)).toBeGreaterThanOrEqual(0);
  });

  it('balanceDelay should equal 100 - efficiency', () => {
    const eff = parseFloat(result.efficiency);
    const bd  = parseFloat(result.balanceDelay);
    expect(bd).toBeCloseTo(100 - eff, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('runOptimization — MFT heuristic (Most Following Tasks)', () => {
  const result = runOptimization(SAMPLE_TASKS, TAKT_TIME, 'MFT', EMPTY_CONFIG);

  it('should return a non-empty stations array', () => {
    expect(result.stations.length).toBeGreaterThan(0);
  });

  it('should assign ALL tasks — no task left unassigned', () => {
    const assigned = result.stations.flatMap(s => s.tasks.map(t => t.id));
    expect(assigned.sort()).toEqual(SAMPLE_TASKS.map(t => t.id).sort());
  });

  it('should respect precedence chain under MFT sort', () => {
    const stationOf = {};
    result.stations.forEach((s, idx) => s.tasks.forEach(t => { stationOf[t.id] = idx; }));
    // A → B, C, D (co-station valid when takt allows packing)
    expect(stationOf['A']).toBeLessThanOrEqual(stationOf['B']);
    expect(stationOf['A']).toBeLessThanOrEqual(stationOf['C']);
    expect(stationOf['A']).toBeLessThanOrEqual(stationOf['D']);
    // B, C → E
    expect(stationOf['B']).toBeLessThanOrEqual(stationOf['E']);
    expect(stationOf['C']).toBeLessThanOrEqual(stationOf['E']);
  });

  it('should not exceed takt time per station (excluding single-task overflows)', () => {
    result.stations.forEach(station => {
      const hasSingleOversize = station.tasks.length === 1 && station.tasks[0].time > TAKT_TIME;
      if (!hasSingleOversize) {
        expect(station.time).toBeLessThanOrEqual(TAKT_TIME + 0.001);
      }
    });
  });

  it('should return numeric and valid efficiency/balanceDelay values', () => {
    const eff = parseFloat(result.efficiency);
    const bd  = parseFloat(result.balanceDelay);
    expect(isNaN(eff)).toBe(false);
    expect(isNaN(bd)).toBe(false);
    expect(bd).toBeCloseTo(100 - eff, 1);
  });

  it('MFT result: task A (2 immediate followers) should be in station 1', () => {
    // A has followers B, C, D — highest follower count → assigned first → station 1
    const station1Tasks = result.stations[0]?.tasks?.map(t => t.id) || [];
    expect(station1Tasks).toContain('A');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('runOptimization — RPW heuristic (Ranked Positional Weight)', () => {
  const result = runOptimization(SAMPLE_TASKS, TAKT_TIME, 'RPW', EMPTY_CONFIG);

  it('should return a non-empty stations array', () => {
    expect(result.stations.length).toBeGreaterThan(0);
  });

  it('should assign ALL tasks — no task left unassigned', () => {
    const assigned = result.stations.flatMap(s => s.tasks.map(t => t.id));
    expect(assigned.sort()).toEqual(SAMPLE_TASKS.map(t => t.id).sort());
  });

  it('should respect all precedence constraints under RPW sort', () => {
    const stationOf = {};
    result.stations.forEach((s, idx) => s.tasks.forEach(t => { stationOf[t.id] = idx; }));
    // Co-station is valid when takt budget allows A+B together
    expect(stationOf['A']).toBeLessThanOrEqual(stationOf['B']);
    expect(stationOf['A']).toBeLessThanOrEqual(stationOf['C']);
    expect(stationOf['A']).toBeLessThanOrEqual(stationOf['D']);
    expect(stationOf['B']).toBeLessThanOrEqual(stationOf['E']);
    expect(stationOf['C']).toBeLessThanOrEqual(stationOf['E']);
  });

  it('should not exceed takt time per station (excluding single-task overflows)', () => {
    result.stations.forEach(station => {
      const hasSingleOversize = station.tasks.length === 1 && station.tasks[0].time > TAKT_TIME;
      if (!hasSingleOversize) {
        expect(station.time).toBeLessThanOrEqual(TAKT_TIME + 0.001);
      }
    });
  });

  it('RPW result: task A should have the highest RPW and be in station 1', () => {
    // RPW(A) = 12 + 18 + 15 + 10 + 20 = 75  (A's time + all descendants)
    // This is the highest RPW in the task set → assigned to station 1
    const station1Tasks = result.stations[0]?.tasks?.map(t => t.id) || [];
    expect(station1Tasks).toContain('A');
  });

  it('should produce a smoothnessIndex >= 0', () => {
    expect(parseFloat(result.smoothnessIndex)).toBeGreaterThanOrEqual(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Section 4: Cross-heuristic invariants
// ──────────────────────────────────────────────────────────────────────────────
describe('runOptimization — Cross-heuristic invariants', () => {
  const ltfResult  = runOptimization(SAMPLE_TASKS, TAKT_TIME, 'LTF', EMPTY_CONFIG);
  const mftResult  = runOptimization(SAMPLE_TASKS, TAKT_TIME, 'MFT', EMPTY_CONFIG);
  const rpwResult  = runOptimization(SAMPLE_TASKS, TAKT_TIME, 'RPW', EMPTY_CONFIG);

  it('all 3 heuristics assign all 5 tasks', () => {
    [ltfResult, mftResult, rpwResult].forEach(r => {
      const assigned = r.stations.flatMap(s => s.tasks.map(t => t.id)).sort();
      expect(assigned).toEqual(['A', 'B', 'C', 'D', 'E'].sort());
    });
  });

  it('all 3 heuristics produce a positive efficiency score', () => {
    [ltfResult, mftResult, rpwResult].forEach(r => {
      expect(parseFloat(r.efficiency)).toBeGreaterThan(0);
    });
  });

  it('efficiency + balanceDelay ≈ 100 for all heuristics', () => {
    [ltfResult, mftResult, rpwResult].forEach(r => {
      const sum = parseFloat(r.efficiency) + parseFloat(r.balanceDelay);
      expect(sum).toBeCloseTo(100, 1);
    });
  });

  it('edge case: empty task list returns empty stations for all heuristics', () => {
    ['LTF', 'MFT', 'RPW'].forEach(h => {
      const r = runOptimization([], TAKT_TIME, h, EMPTY_CONFIG);
      expect(r.stations).toEqual([]);
      expect(r.nActual).toBe(0);
    });
  });

  it('edge case: zero or negative taktTime returns empty result', () => {
    ['LTF', 'MFT', 'RPW'].forEach(h => {
      const r = runOptimization(SAMPLE_TASKS, 0, h, EMPTY_CONFIG);
      expect(r.stations).toEqual([]);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Section 5: Constraint enforcement
// ──────────────────────────────────────────────────────────────────────────────
describe('runOptimization — Constraint enforcement', () => {
  it('Zone exclusion: tasks in excluded zones must NOT share a station', () => {
    const tasks = [
      { id: 'X', time: 10, predecessors: [], zoning: 'Wet'        },
      { id: 'Y', time: 10, predecessors: [], zoning: 'HighVoltage' },
      { id: 'Z', time: 10, predecessors: [], zoning: 'None'        },
    ];
    const configWithExclusions = {
      zone_exclusions: { 'Wet': ['HighVoltage'], 'HighVoltage': ['Wet'] },
    };
    const r = runOptimization(tasks, 30, 'LTF', configWithExclusions);

    r.stations.forEach(station => {
      const zones = station.tasks.map(t => t.zoning);
      const hasWet = zones.includes('Wet');
      const hasHV  = zones.includes('HighVoltage');
      expect(hasWet && hasHV).toBe(false);
    });
  });

  it('Separation: separated tasks must NOT share a station', () => {
    const tasks = [
      { id: 'P', time: 12, predecessors: [], zoning: 'None' },
      { id: 'Q', time: 10, predecessors: [], zoning: 'None' },
      { id: 'R', time: 8,  predecessors: [], zoning: 'None' },
    ];
    const configWithSeparations = { separations: [['P', 'Q']] };
    const r = runOptimization(tasks, 30, 'LTF', configWithSeparations);

    r.stations.forEach(station => {
      const ids = station.tasks.map(t => t.id);
      const hasBoth = ids.includes('P') && ids.includes('Q');
      expect(hasBoth).toBe(false);
    });
  });
});
