import React, { useMemo, useState, useEffect } from 'react';
import { calculateTaktTime, runOptimization } from '../utils/optimizer';
import { useEngineStore } from '../stores/useEngineStore';
import { 
  CheckCircle, 
  AlertTriangle, 
  Zap, 
  Sliders, 
  Info, 
  TrendingDown, 
  Award, 
  RefreshCw, 
  Lock, 
  Edit3, 
  Camera, 
  UserCheck, 
  BarChart3 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A small utility component that calculates and displays the delta (difference) between a baseline metric and the current metric.
 * It uses a color-coded format (green for improvement, red for regression) to give visual feedback.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {number|string} props.baseline - The baseline metric value to compare against.
 * @param {number|string} props.current - The current simulation metric value.
 * @param {boolean} [props.lowerIsBetter=false] - Whether a lower number indicates a better metric (e.g. Cycle Time, Idle Time).
 * @param {Function} [props.formatter] - Optional formatting function for the delta value.
 * @param {string} [props.suffix=''] - Suffix string to append to the delta (e.g. '%' or 'm').
 * @returns {JSX.Element|null} The visual delta indicator or null if inputs are invalid.
 */
const MetricDelta = ({ baseline, current, lowerIsBetter = false, formatter, suffix = '' }) => {
  const bVal = parseFloat(baseline);
  const cVal = parseFloat(current);
  if (isNaN(bVal) || isNaN(cVal)) return null;

  const diff = cVal - bVal;
  if (Math.abs(diff) < 0.001) {
    return <span style={{ color: 'var(--text-sub)', fontSize: '0.72rem', fontWeight: 700, marginLeft: '6px' }}>(=)</span>;
  }

  const isImprovement = lowerIsBetter ? diff < 0 : diff > 0;
  const color = isImprovement ? 'var(--teirac-teal)' : 'var(--teirac-red)';
  const sign = diff > 0 ? '+' : '';
  const displayDiff = formatter ? formatter(diff) : diff.toFixed(1);

  return (
    <span style={{ color, fontSize: '0.72rem', fontWeight: 900, marginLeft: '6px' }}>
      ({sign}{displayDiff}{suffix})
    </span>
  );
};

/**
 * Main Line Optimization interactive dashboard component. 
 * Provides a sandbox for heuristic line balancing, allowing users to tweak cycle times, efficiency targets, 
 * and balancing algorithms (LTF, MFT, RPW). It provides a side-by-side comparison against a captured baseline.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Array<Object>} [props.tasks=[]] - The list of tasks available for optimization.
 * @param {Object} [props.config={}] - Current optimization parameters and configurations.
 * @param {Function} props.setConfig - Callback to update the optimization parameters in the parent state.
 * @param {boolean} [props.embedded=false] - Whether the component is rendered within another layout or in standalone mode.
 * @returns {JSX.Element} The rendered LineOptimization dashboard layout.
 */
const LineOptimization = ({ tasks = [], config = {}, setConfig, embedded = false }) => {
  const currentSimulationState = useEngineStore(state => state.currentSimulationState);
  const baselineState = useEngineStore(state => state.baselineState);
  const setBaselineState = useEngineStore(state => state.setBaselineState);

  const [simTakt, setSimTakt] = useState(0);
  const [baselineTakt, setBaselineTakt] = useState(0);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load takt times asynchronously
  useEffect(() => {
    let cancelled = false;
    calculateTaktTime(config).then(t => { if (!cancelled) setSimTakt(t); });
    if (baselineState?.config) {
      calculateTaktTime(baselineState.config).then(t => { if (!cancelled) setBaselineTakt(t); });
    }
    return () => { cancelled = true; };
  }, [config, baselineState]);

  // Simulation parameters
  const simTasks = useMemo(() => tasks || [], [tasks]);
  const simConfig = useMemo(() => config || {}, [config]);
  const simVariables = useMemo(() => simConfig.variables || [], [simConfig.variables]);
  
  const simHeuristic = simConfig.heuristic || 'LTF';
  const simCycleTime = useMemo(() => {
    const target = simVariables.find(v => v.key === 'target_cycle_time')?.value;
    return target > 0 ? target : simTakt;
  }, [simVariables, simTakt]);
  
  const simOperators = useMemo(() => {
    return Math.max(1, Number(simVariables.find(v => v.key === 'current_operators')?.value) || 1);
  }, [simVariables]);

  const simOpt = useMemo(() => {
    return runOptimization(simTasks, simCycleTime, simHeuristic, simConfig);
  }, [simTasks, simCycleTime, simHeuristic, simConfig]);

  const simTotalTaskTime = useMemo(() => simTasks.reduce((sum, t) => sum + (t.time || 0), 0), [simTasks]);
  const simLP = useMemo(() => {
    return simOperators > 0 && simCycleTime > 0
      ? ((simTotalTaskTime / (simOperators * simCycleTime)) * 100).toFixed(1)
      : '0.0';
  }, [simOperators, simCycleTime, simTotalTaskTime]);

  // Baseline parameters
  const baselineTasks = useMemo(() => baselineState?.tasks || [], [baselineState?.tasks]);
  const baselineConfig = useMemo(() => baselineState?.config || {}, [baselineState?.config]);
  const baselineVariables = useMemo(() => baselineConfig.variables || [], [baselineConfig.variables]);
  
  const baselineHeuristic = baselineConfig.heuristic || 'LTF';
  const baselineCycleTime = useMemo(() => {
    const target = baselineVariables.find(v => v.key === 'target_cycle_time')?.value;
    return target > 0 ? target : baselineTakt;
  }, [baselineVariables, baselineTakt]);
  
  const baselineOperators = useMemo(() => {
    return Math.max(1, Number(baselineVariables.find(v => v.key === 'current_operators')?.value) || 1);
  }, [baselineVariables]);

  const baselineOpt = useMemo(() => {
    if (!baselineState) return null;
    return runOptimization(baselineTasks, baselineCycleTime, baselineHeuristic, baselineConfig);
  }, [baselineState, baselineTasks, baselineCycleTime, baselineHeuristic, baselineConfig]);

  const baselineTotalTaskTime = useMemo(() => baselineTasks.reduce((sum, t) => sum + (t.time || 0), 0), [baselineTasks]);
  const baselineLP = useMemo(() => {
    if (!baselineState) return '0.0';
    return baselineOperators > 0 && baselineCycleTime > 0
      ? ((baselineTotalTaskTime / (baselineOperators * baselineCycleTime)) * 100).toFixed(1)
      : '0.0';
  }, [baselineState, baselineOperators, baselineCycleTime, baselineTotalTaskTime]);

  // Handle baseline snapshot copy
  const handleSetBaseline = () => {
    if (currentSimulationState) {
      setBaselineState({
        ...currentSimulationState,
        optimization: simOpt
      });
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2500);
    }
  };

  // Helper to update config parameters in parent App state
  const handleUpdateParam = (field, value) => {
    let updatedVariables = [...simVariables];
    let updatedHeuristic = simHeuristic;
    let updatedTargetEfficiency = simConfig.target_efficiency;

    if (field === 'heuristic') {
      updatedHeuristic = value;
    } else if (field === 'target_efficiency') {
      updatedTargetEfficiency = Number(value);
    } else if (field === 'target_cycle_time') {
      const idx = updatedVariables.findIndex(v => v.key === 'target_cycle_time');
      if (idx !== -1) {
        updatedVariables[idx] = { ...updatedVariables[idx], value: Number(value) };
      } else {
        updatedVariables.push({ key: 'target_cycle_time', name: 'Target Cycle Time', value: Number(value) });
      }
    } else if (field === 'current_operators') {
      const idx = updatedVariables.findIndex(v => v.key === 'current_operators');
      if (idx !== -1) {
        updatedVariables[idx] = { ...updatedVariables[idx], value: Number(value) };
      } else {
        updatedVariables.push({ key: 'current_operators', name: 'Current Operators', value: Number(value) });
      }
    }

    const updatedConfig = {
      ...simConfig,
      heuristic: updatedHeuristic,
      target_efficiency: updatedTargetEfficiency,
      variables: updatedVariables
    };

    if (setConfig) {
      setConfig(updatedConfig);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: embedded ? 'transparent' : 'var(--bg-main)',
      borderRadius: embedded ? 0 : 'var(--radius-lg)',
      overflow: 'hidden',
      border: embedded ? 'none' : '1px solid var(--border-color)',
    }}>
      {/* ── HEADER ── */}
      {!embedded && (
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--bg-secondary)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ background: 'var(--accent-secondary)', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} color="#fff" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '0.5px' }}>LINE OPTIMIZATION</h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Heuristic line balancing & capacity analytics</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
            <AnimatePresence>
              {showSaveSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{
                    position: 'absolute',
                    right: '105%',
                    background: '#ccfbf1',
                    color: '#0d9488',
                    border: '1px solid #0d9488',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: 'var(--shadow-glow)'
                  }}
                >
                  <CheckCircle size={12} /> BASELINE CAPTURED
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={handleSetBaseline}
              aria-label="Capture current simulation parameters as comparative baseline"
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.6rem 1.2rem',
                fontSize: '0.75rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              <Camera size={14} /> SET BASELINE SNAPSHOT
            </button>
          </div>
        </div>
      )}

      {/* Backdrop overlay for mobile bottom sheet */}
      <div 
        className={`bottom-sheet-backdrop ${isDrawerOpen ? 'open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
      />

      <div style={{ padding: embedded ? '0' : '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Warning Alert if no baseline snapshot exists */}
        {!baselineState && !embedded && (
          <div role="alert" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--accent-warning)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertTriangle size={18} color="var(--accent-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '0.5px' }}>NO BASELINE SNAPSHOT RECORDED</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-sub)', lineHeight: 1.4 }}>
                Establish a benchmark reference by adjusting the simulation parameters in the interactive right-hand column and clicking the <strong>Set Baseline Snapshot</strong> button. This will enable side-by-side performance delta diagnostics.
              </p>
            </div>
          </div>
        )}

        {/* KPI Comparative Dashboard */}
        <section aria-label="Comparative performance KPIs" className="kpi-grid">
          {/* 1. Line Efficiency */}
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-sub)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.5px' }}>LINE EFFICIENCY</span>
              <BarChart3 size={14} color="var(--accent-primary)" />
            </div>
            <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-white)' }}>
                {simOpt.efficiency}%
              </span>
              {baselineState && (
                <>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginLeft: '8px' }}>
                    vs {baselineOpt?.efficiency}%
                  </span>
                  <MetricDelta baseline={baselineOpt?.efficiency} current={simOpt.efficiency} suffix="%" />
                </>
              )}
            </div>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-sub)', display: 'block', marginTop: '4px' }}>
              Target: {simOpt.targetEfficiency}%
            </span>
          </div>

          {/* 2. Workstations Used */}
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-sub)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.5px' }}>WORKSTATIONS USED</span>
              <Award size={14} color="var(--accent-secondary)" />
            </div>
            <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>
                {simOpt.nActual}
              </span>
              {baselineState && (
                <>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginLeft: '8px' }}>
                    vs {baselineOpt?.nActual}
                  </span>
                  <MetricDelta baseline={baselineOpt?.nActual} current={simOpt.nActual} lowerIsBetter={true} suffix=" St" />
                </>
              )}
            </div>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-sub)', display: 'block', marginTop: '4px' }}>
              Theoretical Min: {Math.ceil(simTotalTaskTime / simCycleTime)}
            </span>
          </div>

          {/* 3. Actual Cycle Time */}
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-sub)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.5px' }}>ACTUAL CYCLE TIME</span>
              <Zap size={14} color="var(--accent-warning)" />
            </div>
            <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-white)' }}>
                {simOpt.actualCycleTime.toFixed(1)}m
              </span>
              {baselineState && (
                <>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginLeft: '8px' }}>
                    vs {baselineOpt?.actualCycleTime.toFixed(1)}m
                  </span>
                  <MetricDelta baseline={baselineOpt?.actualCycleTime} current={simOpt.actualCycleTime} lowerIsBetter={true} suffix="m" />
                </>
              )}
            </div>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-sub)', display: 'block', marginTop: '4px' }}>
              Takt Limit: {simCycleTime.toFixed(1)} min
            </span>
          </div>

          {/* 4. Labour Productivity */}
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-sub)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.5px' }}>LABOUR PRODUCTIVITY</span>
              <UserCheck size={14} color="var(--accent-primary)" />
            </div>
            <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-white)' }}>
                {simLP}%
              </span>
              {baselineState && (
                <>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginLeft: '8px' }}>
                    vs {baselineLP}%
                  </span>
                  <MetricDelta baseline={baselineLP} current={simLP} suffix="%" />
                </>
              )}
            </div>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-sub)', display: 'block', marginTop: '4px' }}>
              N_op = {simOperators} operators
            </span>
          </div>
        </section>

        {/* Split Screen Grid Layout */}
        <div className="module-split-layout">
          
          {/* ── LEFT PANEL: Baseline Reference (Read-only) ── */}
          <section 
            aria-label="Baseline scenario details" 
            style={{ 
              flex: 1, 
              border: '1px dashed var(--border-color)', 
              borderRadius: 'var(--radius-lg)', 
              background: 'var(--bg-secondary)', 
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              opacity: baselineState ? 0.9 : 0.65,
              transition: 'opacity 0.3s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <Lock size={14} color="var(--text-sub)" />
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>
                BASELINE SCENARIO (READ-ONLY)
              </h3>
            </div>

            {baselineState ? (
              <>
                {/* Baseline snapshot metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-sub)', display: 'block' }}>ALGORITHM</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-white)' }}>
                      {baselineHeuristic === 'LTF' && 'Longest Task First'}
                      {baselineHeuristic === 'MFT' && 'Most Following Tasks'}
                      {baselineHeuristic === 'RPW' && 'Ranked Positional Weight'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-sub)', display: 'block' }}>CYCLE TIME LIMIT</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-white)' }}>{baselineCycleTime.toFixed(1)} min</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-sub)', display: 'block' }}>TARGET EFFICIENCY</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-white)' }}>{baselineOpt?.targetEfficiency}%</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-sub)', display: 'block' }}>TOTAL IDLE TIME</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--teirac-red)' }}>{baselineOpt?.totalIdleTime.toFixed(1)} min</span>
                  </div>
                </div>

                {/* Baseline Workstations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '0.5px' }}>
                    WORKSTATION ALLOCATIONS
                  </h4>
                  {baselineOpt?.stations.map((station, idx) => {
                    const idleTime = Math.max(0, baselineCycleTime - station.time);
                    const utilization = baselineCycleTime > 0 ? (station.time / baselineCycleTime) * 100 : 0;
                    
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: '1rem', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-main)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)' }}>Station {idx + 1}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)' }}>{utilization.toFixed(1)}% load</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '0.6rem' }}>
                          {station.tasks.map(task => (
                            <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                              <span><strong>{task.id}</strong> {task.name}</span>
                              <span>{task.time}m</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-sub)' }}>
                          <span>Time: {station.time.toFixed(1)}m</span>
                          <span>Idle: {idleTime.toFixed(1)}m</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center' }}>
                <Camera size={32} color="var(--text-sidebar)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-white)' }}>NO BASELINE DATA</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: 'var(--text-sub)', lineHeight: 1.4 }}>
                  Establish a baseline snaphot to unlock comparative diagnostics.
                </p>
              </div>
            )}
          </section>

          {/* ── RIGHT PANEL: Current Simulation (Interactive) ── */}
          <section 
            aria-label="Simulation controls and results" 
            style={{ 
              flex: 1, 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-lg)', 
              background: 'var(--card-bg)', 
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <Edit3 size={14} color="var(--accent-primary)" />
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>
                SIMULATION SANDBOX (ACTIVE)
              </h3>
            </div>

            {/* Interactive adjusters */}
            <div className={`bottom-sheet-drawer ${isDrawerOpen ? 'open' : ''}`} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }} className="mobile-drawer-header">
                <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)' }}>
                  ADJUST SIMULATION PARAMETERS
                </h4>
                <button 
                  className="drawer-close-x-btn"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close parameters drawer"
                >
                  ✕
                </button>
              </div>
              
              {/* Heuristic selection */}
              <div>
                <label htmlFor="sim-heuristic" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  BALANCING ALGORITHM
                </label>
                <select
                  id="sim-heuristic"
                  value={simHeuristic}
                  onChange={(e) => handleUpdateParam('heuristic', e.target.value)}
                  aria-label="Select heuristic line balancing algorithm"
                  className="industrial-input"
                  style={{ width: '100%' }}
                >
                  <option value="LTF">Longest Task First (LTF)</option>
                  <option value="MFT">Most Following Tasks (MFT)</option>
                  <option value="RPW">Ranked Positional Weight (RPW)</option>
                </select>
              </div>

              {/* Target Cycle Time */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label htmlFor="sim-cycle-time" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '0.5px' }}>
                    TARGET CYCLE TIME (MIN)
                  </label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                    {simCycleTime.toFixed(1)} min
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    id="sim-cycle-time-slider"
                    type="range"
                    min="0.5"
                    max="30"
                    step="0.5"
                    value={simCycleTime}
                    onChange={(e) => handleUpdateParam('target_cycle_time', Number(e.target.value))}
                    aria-label="Target cycle time slider"
                    style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                  />
                  <input
                    id="sim-cycle-time"
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={simCycleTime}
                    onChange={(e) => handleUpdateParam('target_cycle_time', Number(e.target.value))}
                    aria-label="Target cycle time input value"
                    className="industrial-input"
                    style={{ width: '70px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Target Efficiency */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label htmlFor="sim-efficiency" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '0.5px' }}>
                    TARGET EFFICIENCY (%)
                  </label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>
                    {simConfig.target_efficiency || 85}%
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    id="sim-efficiency-slider"
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={simConfig.target_efficiency || 85}
                    onChange={(e) => handleUpdateParam('target_efficiency', Number(e.target.value))}
                    aria-label="Target efficiency percentage slider"
                    style={{ flex: 1, accentColor: 'var(--accent-secondary)' }}
                  />
                  <input
                    id="sim-efficiency"
                    type="number"
                    min="10"
                    max="100"
                    value={simConfig.target_efficiency || 85}
                    onChange={(e) => handleUpdateParam('target_efficiency', Number(e.target.value))}
                    aria-label="Target efficiency percentage input value"
                    className="industrial-input"
                    style={{ width: '70px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Operators count */}
              <div>
                <label htmlFor="sim-operators" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  ACTIVE OPERATORS (N_op)
                </label>
                <input
                  id="sim-operators"
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={simOperators}
                  onChange={(e) => handleUpdateParam('current_operators', Number(e.target.value))}
                  aria-label="Number of line operators"
                  className="industrial-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Active Simulation Stations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '0.5px' }}>
                LIVE ALLOCATIONS
              </h4>
              {simOpt.stations.map((station, idx) => {
                const idleTime = Math.max(0, simCycleTime - station.time);
                const utilization = simCycleTime > 0 ? (station.time / simCycleTime) * 100 : 0;
                
                return (
                  <motion.div 
                    key={idx} 
                    whileHover={{ scale: 1.01 }}
                    style={{ 
                      padding: '1rem', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-primary)' }}>Station {idx + 1}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, color: utilization > 100 ? 'var(--teirac-red)' : 'var(--accent-primary)' }}>
                        {utilization.toFixed(1)}% load
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '0.6rem' }}>
                      {station.tasks.map(task => (
                        <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-white)', fontWeight: 600 }}>
                          <span><strong>{task.id}</strong> {task.name}</span>
                          <span style={{ fontWeight: 800 }}>{task.time}m</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-sub)' }}>
                      <span>Time: {station.time.toFixed(1)}m</span>
                      <span>Idle: {idleTime.toFixed(1)}m</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* FAB to open parameter drawer on mobile (<768px) */}
      <button
        className="fab-adjust-parameters no-print"
        onClick={() => setIsDrawerOpen(true)}
        aria-label="Adjust parameters"
      >
        <Sliders size={18} />
        <span>ADJUST PARAMETERS</span>
      </button>
    </div>
  );
};

export default LineOptimization;
