import React, { useMemo, useState, useEffect } from 'react';
import { calculateTaktTime, runOptimization } from '../utils/optimizer';
import { CheckCircle, AlertTriangle, XCircle, X, Zap, Sliders, Info, TrendingDown, Award, ShieldAlert } from 'lucide-react';
import { getVariableValue } from '../utils/formulaEngine';
import { motion, AnimatePresence } from 'framer-motion';

const LineOptimization = ({ tasks, config, setConfig, optimization: sharedOptimization }) => {
  const taktTime = useMemo(() => calculateTaktTime(config), [config]);
  const variables = config?.variables || [];

  const [heuristic, setHeuristic] = useState('LTF');
  const [targetCycleTime, setTargetCycleTime] = useState(() => {
    const initialTarget = Number(getVariableValue(variables, 'target_cycle_time', 0));
    return Number.isFinite(initialTarget) && initialTarget > 0 ? initialTarget : Math.max(taktTime, 1);
  });
  const [operators, setOperators] = useState(Math.max(1, Number(getVariableValue(variables, 'current_operators', 1)) || 1));
  
  const [appliedHeuristic, setAppliedHeuristic] = useState('LTF');
  const [appliedCycleTime, setAppliedCycleTime] = useState(() => {
    const initialApplied = Number(getVariableValue(variables, 'target_cycle_time', 0));
    return Number.isFinite(initialApplied) && initialApplied > 0 ? initialApplied : Math.max(taktTime, 1);
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Dual-Level Configuration Target Efficiency (Active Project Variable vs Global Default)
  const [targetEfficiencyInput, setTargetEfficiencyInput] = useState(() => {
    const activeTarget = config?.target_efficiency !== undefined && config?.target_efficiency !== null ? Number(config.target_efficiency) : null;
    const globalTarget = typeof window !== 'undefined' && window.localStorage ? (Number(window.localStorage.getItem('opto_global_target_efficiency')) || 85) : 85;
    return activeTarget !== null && !isNaN(activeTarget) ? activeTarget : globalTarget;
  });

  // P1-8: Sync target efficiency from config changes via useEffect (not during render)
  useEffect(() => {
    const activeTarget = config?.target_efficiency !== undefined && config?.target_efficiency !== null ? Number(config.target_efficiency) : null;
    const globalTarget = typeof window !== 'undefined' && window.localStorage ? (Number(window.localStorage.getItem('opto_global_target_efficiency')) || 85) : 85;
    const targetVal = activeTarget !== null && !isNaN(activeTarget) ? activeTarget : globalTarget;
    
    // P1-8: Defer setState update to next tick to avoid synchronous cascading renders
    const timer = setTimeout(() => {
      setTargetEfficiencyInput(targetVal);
    }, 0);
    return () => clearTimeout(timer);
  }, [config?.target_efficiency]);

  const globalDefaultEfficiency = useMemo(() => {
    return typeof window !== 'undefined' && window.localStorage ? (Number(window.localStorage.getItem('opto_global_target_efficiency')) || 85) : 85;
  }, []);

  const usingShared = Math.abs(appliedCycleTime - taktTime) < 0.001 && 
                      appliedHeuristic === 'LTF' && 
                      (config?.target_efficiency === undefined || config?.target_efficiency === null || config?.target_efficiency === targetEfficiencyInput);

  const [localOptimization, setLocalOptimization] = useState(null);
  
  // Compute optimization result utilizing useMemo
  const optimization = useMemo(() => {
    if (usingShared && sharedOptimization) {
      return sharedOptimization;
    }
    if (localOptimization) {
      return localOptimization;
    }
    return runOptimization(tasks, appliedCycleTime, appliedHeuristic, { ...config, target_efficiency: targetEfficiencyInput });
  }, [usingShared, sharedOptimization, localOptimization, tasks, appliedCycleTime, appliedHeuristic, config, targetEfficiencyInput]);

  const hasPendingChanges = heuristic !== appliedHeuristic || 
                            targetCycleTime !== appliedCycleTime || 
                            targetEfficiencyInput !== (config?.target_efficiency ?? globalDefaultEfficiency);

  const handleOptimize = () => {
    setAppliedHeuristic(heuristic);
    setAppliedCycleTime(targetCycleTime);
    const updatedConfig = { ...config, target_efficiency: targetEfficiencyInput };
    if (setConfig) {
      setConfig(updatedConfig);
    }
    setLocalOptimization(runOptimization(tasks, targetCycleTime, heuristic, updatedConfig));
  };

  // ── Labour Productivity ──
  const totalTaskTime = tasks.reduce((sum, t) => sum + t.time, 0);
  const labourProductivity = operators > 0 && appliedCycleTime > 0
    ? ((totalTaskTime / (operators * appliedCycleTime)) * 100).toFixed(1)
    : '0.0';

  // ── Guided Auto-optimization logic ──
  const autoOptResults = useMemo(() => {
    return ['LTF', 'MFT', 'RPW'].map(h => {
      const opt = runOptimization(tasks, appliedCycleTime, h, { ...config, target_efficiency: targetEfficiencyInput });
      return {
        heuristic: h,
        efficiency: Number(opt.efficiency),
        meetsTarget: opt.meetsTarget,
        opt
      };
    });
  }, [tasks, appliedCycleTime, config, targetEfficiencyInput]);

  const bestAltHeuristic = useMemo(() => {
    if (optimization.meetsTarget) return null;
    const currentEff = Number(optimization.efficiency);
    const alternatives = autoOptResults.filter(r => r.heuristic !== appliedHeuristic);
    if (alternatives.length === 0) return null;
    
    // Find the one with maximum efficiency
    const best = alternatives.reduce((max, r) => r.efficiency > max.efficiency ? r : max, alternatives[0]);
    if (best.efficiency > currentEff) {
      return best;
    }
    return null;
  }, [autoOptResults, appliedHeuristic, optimization.meetsTarget, optimization.efficiency]);

  // ── Diagnostic breakdown parameters ──
  const diagnosticData = useMemo(() => {
    if (!optimization || !optimization.stations || optimization.stations.length === 0) return null;

    // Bottleneck station identification
    const bottleneckIndex = optimization.stations.reduce((maxIdx, s, idx, arr) => s.time > arr[maxIdx].time ? idx : maxIdx, 0);
    const bottleneckStation = optimization.stations[bottleneckIndex];
    const bottleneckTime = bottleneckStation.time;
    
    // Underutilized stations (< 70% load)
    const underutilized = optimization.stations
      .map((s, idx) => ({ index: idx + 1, time: s.time, load: appliedCycleTime > 0 ? (s.time / appliedCycleTime) * 100 : 0 }))
      .filter(s => s.load < 70);

    // Identify critical tasks in bottleneck station
    const longestTaskInBottleneck = bottleneckStation.tasks.reduce((maxTask, t) => t.time > maxTask.time ? t : maxTask, { time: 0 });

    return {
      bottleneckIndex,
      bottleneckStationNum: bottleneckIndex + 1,
      bottleneckTime,
      underutilized,
      longestTaskInBottleneck
    };
  }, [optimization, appliedCycleTime]);

  return (
    <div className="module-layout">

      {/* Drawer Scrim — visible on tablet/mobile when drawer is open */}
      <button
        type="button"
        className={`drawer-scrim ${isDrawerOpen ? 'open' : ''}`}
        aria-label="Close parameters panel"
        onClick={() => setIsDrawerOpen(false)}
      />

      {/* Controls — desktop sidebar / tablet side drawer / mobile bottom sheet */}
      <div className={`module-sidebar module-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>✕ CLOSE</button>
        <h2 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.25rem', color: 'var(--text-white)', letterSpacing: '1px' }}>
          OPTIMIZATION CONTROLS
        </h2>

        <label style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
          HEURISTIC SELECTION
        </label>
        <select 
          value={heuristic} 
          onChange={(e) => setHeuristic(e.target.value)} 
          style={{ padding: '0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-white)', width: '100%', marginBottom: '1.2rem', fontFamily: 'inherit' }}
        >
          <option value="LTF">Longest Task First</option>
          <option value="MFT">Most Following Tasks</option>
          <option value="RPW">Ranked Positional Weight</option>
        </select>

        <label style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
          TARGET CYCLE TIME (MIN)
        </label>
        <input 
          type="number" 
          min="0.1" 
          step="0.1" 
          value={targetCycleTime} 
          onChange={(e) => setTargetCycleTime(Math.max(0.1, Number(e.target.value) || 0.1))} 
          style={{ padding: '0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-white)', width: '100%', marginBottom: '1.2rem', fontFamily: 'inherit' }} 
        />

        <label style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
          TARGET LINE EFFICIENCY (%)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' }}>
          <input 
            type="range" 
            min="10" 
            max="100" 
            step="1" 
            value={targetEfficiencyInput} 
            onChange={(e) => setTargetEfficiencyInput(Number(e.target.value))} 
            style={{ flex: 1, accentColor: 'var(--accent-primary)', height: '6px', borderRadius: '3px' }} 
          />
          <input 
            type="number" 
            min="10" 
            max="100" 
            value={targetEfficiencyInput} 
            onChange={(e) => setTargetEfficiencyInput(Math.min(100, Math.max(10, Number(e.target.value) || 85)))} 
            style={{ width: '65px', padding: '0.45rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-white)', fontWeight: 'bold', fontFamily: 'inherit' }} 
          />
        </div>

        <label style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
          NUMBER OF OPERATORS
        </label>
        <input 
          type="number" 
          min="1" 
          step="1" 
          value={operators} 
          onChange={(e) => setOperators(Math.max(1, Number(e.target.value) || 1))} 
          style={{ padding: '0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-white)', width: '100%', marginBottom: '1.5rem', fontFamily: 'inherit' }} 
        />

        {/* Labour Productivity Display */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.85rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
            LABOUR PRODUCTIVITY (LP)
          </span>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{labourProductivity}%</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-sub)', display: 'block', marginTop: '2px' }}>
            LP = Σt / (N_op × C)
          </span>
        </div>

        <div style={{ marginTop: '0.5rem', flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-sub)' }}>
                <th style={{ paddingBottom: '4px' }}>ID</th>
                <th style={{ paddingBottom: '4px' }}>Task Name</th>
                <th style={{ paddingBottom: '4px', textAlign: 'right' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '4px 0' }}>{t.id}</td>
                  <td style={{ padding: '4px 0', color: 'var(--text-white)' }}>{t.name}</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 800 }}>{t.time}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button 
          onClick={handleOptimize} 
          style={{ 
            padding: '1rem', 
            background: hasPendingChanges ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' : 'var(--bg-secondary)', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 'var(--radius-md)', 
            fontWeight: 900, 
            cursor: 'pointer',
            boxShadow: hasPendingChanges ? '0 4px 15px rgba(13, 148, 136, 0.25)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            width: '100%',
            marginTop: '1rem'
          }}
        >
          OPTIMIZE LINE
        </button>
      </div>

      {/* Main Content */}
      <div className="module-main" style={{ overflowY: 'auto', maxHeight: '100vh', paddingBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '1px', color: 'var(--text-white)' }}>
              OPTIMIZED ASSEMBLY LINE LAYOUT
            </h2>
            <p style={{ margin: '0.45rem 0 0 0', fontSize: '0.76rem', color: 'var(--text-sub)' }}>
              Stations balanced under the active takt cycle time of <strong style={{ color: 'var(--accent-primary)' }}>{appliedCycleTime.toFixed(1)} mins</strong>.
            </p>
          </div>
          {hasPendingChanges && (
            <div style={{ padding: '0.5rem 0.85rem', borderRadius: '999px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: 'var(--accent-warning)', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.5px' }}>
              PENDING CHANGES
            </div>
          )}
        </div>

        {/* ── Guided Auto-optimization alert panel ── */}
        <AnimatePresence mode="wait">
          {bestAltHeuristic && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="glow-card" 
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(13, 148, 136, 0.15) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 30px rgba(168, 85, 247, 0.12)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)',
                  color: '#fff',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
                }}>
                  <Zap size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>
                    GUIDED AUTO-OPTIMIZATION RECOMMENDATION
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--text-sub)', lineHeight: '1.4' }}>
                    Current efficiency <strong style={{ color: 'var(--accent-danger)' }}>{optimization.efficiency}%</strong> is below your target threshold <strong style={{ color: 'var(--text-white)' }}>{optimization.targetEfficiency}%</strong> using <strong style={{ color: 'var(--text-white)' }}>{appliedHeuristic}</strong>.<br />
                    Heuristic algorithm <strong style={{ color: 'var(--accent-primary)' }}>{bestAltHeuristic.heuristic}</strong> yields <strong style={{ color: 'var(--accent-primary)' }}>{bestAltHeuristic.efficiency.toFixed(2)}%</strong> efficiency ({bestAltHeuristic.meetsTarget ? 'meets target' : 'closer to target'}).
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setHeuristic(bestAltHeuristic.heuristic);
                  setAppliedHeuristic(bestAltHeuristic.heuristic);
                  setLocalOptimization(bestAltHeuristic.opt);
                  const updatedConfig = { ...config, target_efficiency: targetEfficiencyInput };
                  if (setConfig) {
                    setConfig(updatedConfig);
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  letterSpacing: '1px',
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                APPLY RECOMMENDATION ({bestAltHeuristic.heuristic})
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Strip */}
        <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
          <div className="glow-card" style={{ padding: '1.25rem', border: optimization.meetsTarget ? '1px solid rgba(13,148,136,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '0.5px' }}>LINE EFFICIENCY</span>
              {optimization.meetsTarget ? (
                <CheckCircle size={14} color="var(--accent-primary)" />
              ) : (
                <AlertTriangle size={14} color="var(--accent-warning)" />
              )}
            </div>
            <div style={{ marginTop: '0.45rem', fontSize: '2.2rem', fontWeight: 900, color: optimization.meetsTarget ? 'var(--accent-primary)' : 'var(--accent-warning)' }}>
              {optimization.efficiency}%
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', display: 'block', marginTop: '2px' }}>
              Target: {optimization.targetEfficiency}% ({optimization.targetEfficiency === globalDefaultEfficiency ? 'Global Default' : 'Active Project'})
            </span>
          </div>
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '0.5px' }}>TOTAL IDLE TIME</span>
            <div style={{ marginTop: '0.45rem', fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-white)' }}>
              {optimization.totalIdleTime.toFixed(1)} min
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', display: 'block', marginTop: '2px' }}>
              Balance Delay: {optimization.balanceDelay}%
            </span>
          </div>
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '0.5px' }}>WORKSTATIONS USED</span>
            <div style={{ marginTop: '0.45rem', fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>
              {optimization.stations.length}
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', display: 'block', marginTop: '2px' }}>
              Theoretical Min: {Math.ceil(totalTaskTime / appliedCycleTime)}
            </span>
          </div>
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '0.5px' }}>ACTUAL CYCLE TIME</span>
            <div style={{ marginTop: '0.45rem', fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-white)' }}>
              {(optimization.actualCycleTime || 0).toFixed(1)} min
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', display: 'block', marginTop: '2px' }}>
              Takt Limit: {appliedCycleTime.toFixed(1)} min
            </span>
          </div>
        </div>

        {/* Station Cards */}
        <h3 style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '1px', color: 'var(--text-white)', marginBottom: '1rem' }}>
          WORKSTATION ALLOCATION DEPLOYMENT
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {optimization.stations.map((station, idx) => {
            const idleTime = Math.max(0, appliedCycleTime - station.time);
            const utilization = appliedCycleTime > 0 ? (station.time / appliedCycleTime) * 100 : 0;
            const isStationBottleneck = Math.abs(station.time - optimization.actualCycleTime) < 0.001;

            return (
              <div 
                key={idx} 
                className="glow-card" 
                style={{ 
                  padding: '1.25rem', 
                  border: isStationBottleneck ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid var(--border-color)',
                  background: isStationBottleneck ? 'linear-gradient(180deg, var(--card-bg) 0%, rgba(168, 85, 247, 0.04) 100%)' : 'var(--card-bg)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '0.5px' }}>STATION {idx + 1}</span>
                    {isStationBottleneck && (
                      <span style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-secondary)', fontSize: '0.58rem', fontWeight: 900, padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.35)', letterSpacing: '0.5px' }}>
                        BOTTLENECK
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: utilization > 100 ? 'var(--accent-danger)' : utilization > 85 ? 'var(--accent-primary)' : 'var(--accent-warning)' }}>
                    {utilization.toFixed(1)}% load
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '80px' }}>
                  {station.tasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '0.2rem 0' }}>
                      <span style={{ color: 'var(--text-white)' }}>
                        <strong style={{ color: 'var(--accent-primary)', marginRight: '6px' }}>{task.id}</strong> {task.name}
                      </span>
                      <span style={{ fontWeight: 800 }}>{task.time} min</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '1.2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', fontWeight: 800, letterSpacing: '0.5px', display: 'block' }}>PROCESS TIME</span>
                    <div style={{ marginTop: '0.25rem', fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-white)' }}>{station.time.toFixed(1)}m</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', fontWeight: 800, letterSpacing: '0.5px', display: 'block' }}>STATION IDLE</span>
                    <div style={{ marginTop: '0.25rem', fontSize: '1.1rem', fontWeight: 900, color: idleTime > 0 ? 'var(--accent-danger)' : 'var(--text-sub)' }}>{idleTime.toFixed(1)}m</div>
                  </div>
                </div>
                <div style={{ marginTop: '0.9rem', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.min(utilization, 100)}%`, 
                      height: '100%', 
                      background: utilization > 95 ? 'linear-gradient(90deg, var(--accent-warning) 0%, var(--accent-danger) 100%)' : 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' 
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── STATION BALANCE AUDIT TABLE ── */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', marginBottom: '2.5rem' }}>
          <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>STATION BALANCE AUDIT</h4>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 800 }}>— Mathematical breakdown per workstation</span>
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 800 }}>
              ALGORITHM: {appliedHeuristic}
            </span>
          </div>
          <div className="table-responsive-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                  {['STATION', 'ASSIGNED TASKS', 'PROCESS TIME (P)', 'IDLE TIME (I)', 'LOAD %', 'STATUS'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '0.5px', textAlign: h === 'STATUS' ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {optimization.stations.map((station, idx) => {
                  const idle = Math.max(0, appliedCycleTime - station.time);
                  const load = appliedCycleTime > 0 ? (station.time / appliedCycleTime) * 100 : 0;
                  const isOverloaded = load > 100;
                  const isLow = load < 70;
                  const isStationBottleneck = Math.abs(station.time - optimization.actualCycleTime) < 0.001;
                  
                  const rowBg = isStationBottleneck ? 'rgba(168,85,247,0.05)' : isOverloaded ? 'rgba(239,68,68,0.08)' : isLow ? 'rgba(245,158,11,0.07)' : 'transparent';
                  const loadColor = isOverloaded ? 'var(--accent-danger)' : isStationBottleneck ? 'var(--accent-secondary)' : isLow ? 'var(--accent-warning)' : 'var(--accent-primary)';
                  const StatusIcon = isOverloaded ? XCircle : isLow ? AlertTriangle : CheckCircle;
                  const statusColor = isOverloaded ? 'var(--accent-danger)' : isStationBottleneck ? 'var(--accent-secondary)' : isLow ? 'var(--accent-warning)' : 'var(--accent-primary)';
                  const statusText = isOverloaded ? 'OVERLOAD' : isStationBottleneck ? 'BOTTLENECK' : isLow ? 'LOW UTIL' : 'OPTIMAL';

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: rowBg, transition: 'background 0.2s' }}>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: 'var(--text-white)' }}>Station {idx + 1}</td>
                      <td style={{ padding: '0.8rem 1rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                        {station.tasks.map(t => t.id).join(', ')}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: 'var(--text-white)' }}>{station.time.toFixed(1)} min</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: idle > 0 ? 'var(--accent-danger)' : 'var(--text-sub)' }}>{idle.toFixed(1)} min</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: loadColor }}>{load.toFixed(1)}%</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 900, color: statusColor, background: `${statusColor}18`, padding: '3px 10px', borderRadius: '99px' }}>
                          <StatusIcon size={10} /> {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals Footer */}
              <tfoot>
                <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-color)' }}>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px', fontSize: '0.7rem' }}>TOTALS</td>
                  <td style={{ padding: '0.8rem 1rem', color: 'var(--text-sub)', fontSize: '0.7rem' }}>{tasks.length} tasks</td>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                    Σ(P) = {totalTaskTime} min
                  </td>
                  <td style={{ padding: '0.8rem 1rem', fontWeight: 900, color: 'var(--accent-danger)' }}>
                    Σ(I) = {optimization.totalIdleTime.toFixed(1)} min
                  </td>
                  <td colSpan={2} style={{ padding: '0.8rem 1rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                    E = {optimization.efficiency}% &nbsp;|&nbsp; BD = {optimization.balanceDelay}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── BALANCE DEFICIENCY DIAGNOSTIC REPORT PANEL ── */}
        <AnimatePresence>
          {!optimization.meetsTarget && diagnosticData && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.4, cubicBezier: [0.16, 1, 0.3, 1] }}
              className="glow-card"
              style={{
                background: 'linear-gradient(180deg, var(--card-bg) 0%, rgba(239, 68, 68, 0.02) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '16px',
                padding: '2rem',
                marginTop: '1.5rem',
                boxShadow: '0 12px 40px rgba(239, 68, 68, 0.08)'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--accent-danger)',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '2px' }}>
                    BALANCE DEFICIENCY DIAGNOSTIC REPORT
                  </h3>
                  <span style={{ fontSize: '0.65rem', color: 'var(--accent-warning)', fontWeight: 800, letterSpacing: '1px', display: 'block', marginTop: '2px' }}>
                    SYSTEM DIAGNOSTICS &amp; ACTIONABLE ENGINEERING DIRECTIVES
                  </span>
                </div>
              </div>

              {/* Grid Diagnosis Panels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* 1. Bottleneck station Card */}
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <TrendingDown size={16} color="var(--accent-secondary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '0.5px' }}>
                      BOTTLENECK IDENTIFICATION
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-sub)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                    Station <strong style={{ color: 'var(--text-white)' }}>{diagnosticData.bottleneckStationNum}</strong> is the line&apos;s pacing bottleneck with a process time of <strong style={{ color: 'var(--accent-secondary)' }}>{diagnosticData.bottleneckTime.toFixed(1)} mins</strong>, limiting overall line output.
                  </p>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 800, display: 'block', color: 'var(--text-white)' }}>BOTTLENECK WORK CONTENT:</span>
                    {optimization.stations[diagnosticData.bottleneckIndex]?.tasks.map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span>{t.id}. {t.name}</span>
                        <span style={{ fontWeight: 'bold' }}>{t.time}m</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Capacity utilization Card */}
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Sliders size={16} color="var(--accent-warning)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '0.5px' }}>
                      CAPACITY LOSS &amp; WAITING
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-sub)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                    The line experiences <strong style={{ color: 'var(--accent-danger)' }}>{optimization.totalIdleTime.toFixed(1)} mins</strong> of cumulative idle time per cycle. Workstations suffer from load imbalances:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {diagnosticData.underutilized.length > 0 ? (
                      diagnosticData.underutilized.map(u => (
                        <div key={u.index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-sub)' }}>
                          <span>Station {u.index} (Low Util)</span>
                          <span style={{ color: 'var(--accent-warning)', fontWeight: 'bold' }}>{u.load.toFixed(1)}% load ({u.time}m)</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontStyle: 'italic' }}>No station suffers from severe low utilization (&lt;70%).</span>
                    )}
                  </div>
                </div>

                {/* 3. Performance GAP Card */}
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Award size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '0.5px' }}>
                      PERFORMANCE DEFICIENCY GAP
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-sub)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                    Current line efficiency of <strong style={{ color: 'var(--accent-danger)' }}>{optimization.efficiency}%</strong> fails to meet the required <strong style={{ color: 'var(--text-white)' }}>{optimization.targetEfficiency}%</strong> engineering target.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '0.7rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-sub)' }}>Efficiency Deficit:</span>
                      <span style={{ color: 'var(--accent-danger)', fontWeight: 'bold' }}>-{(Number(optimization.targetEfficiency) - Number(optimization.efficiency)).toFixed(2)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-sub)' }}>Line Balance Delay:</span>
                      <span style={{ color: 'var(--text-white)', fontWeight: 'bold' }}>{optimization.balanceDelay}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-sub)' }}>Smoothness Coef (SI):</span>
                      <span style={{ color: 'var(--text-white)', fontWeight: 'bold' }}>{optimization.smoothnessIndex}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Engineering Directives */}
              <div style={{ background: 'rgba(168, 85, 247, 0.03)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '1.5rem', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={14} color="var(--accent-secondary)" />
                  ACTIONABLE ENGINEERING DIRECTIVES
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.76rem', lineHeight: '1.45', color: 'var(--text-sub)' }}>
                  
                  {/* Suggestion 1: Guided Optimization */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>[A]</span>
                    <div>
                      <strong style={{ color: 'var(--text-white)' }}>Heuristic Rebalancing:</strong>{' '}
                      {bestAltHeuristic ? (
                        <span>
                          Apply the recommended <strong style={{ color: 'var(--accent-primary)' }}>{bestAltHeuristic.heuristic}</strong> heuristic which was automatically calculated to achieve a higher line efficiency of <strong style={{ color: 'var(--accent-primary)' }}>{bestAltHeuristic.efficiency.toFixed(2)}%</strong>.
                        </span>
                      ) : (
                        <span>The active heuristic ({appliedHeuristic}) already represents the mathematically optimal balancing layout for this cycle time. Alternative heuristics do not yield better results.</span>
                      )}
                    </div>
                  </div>

                  {/* Suggestion 2: Task Redistribution */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>[B]</span>
                    <div>
                      <strong style={{ color: 'var(--text-white)' }}>Workload Redistribution:</strong>{' '}
                      Consider transferring work content from the pacing Station <strong style={{ color: 'var(--text-white)' }}>{diagnosticData.bottleneckStationNum}</strong>{' '}
                      (such as task <strong style={{ color: 'var(--accent-primary)' }}>{diagnosticData.longestTaskInBottleneck.id}</strong> — {diagnosticData.longestTaskInBottleneck.name}, which takes {diagnosticData.longestTaskInBottleneck.time} mins) to under-utilized workstations{' '}
                      {diagnosticData.underutilized.length > 0 ? (
                        <span>
                          (like Station{diagnosticData.underutilized.map(u => ` ${u.index}`).join(', ')})
                        </span>
                      ) : (
                        <span>on the line</span>
                      )}{' '}
                      if precedence logic and physical floor layout restrictions permit.
                    </div>
                  </div>

                  {/* Suggestion 3: Automation & Parallel Stations */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>[C]</span>
                    <div>
                      <strong style={{ color: 'var(--text-white)' }}>Targeted Automation / Parallel Operations:</strong>{' '}
                      Task <strong style={{ color: 'var(--text-white)' }}>{diagnosticData.longestTaskInBottleneck.id}</strong> represents the single longest task within the bottleneck.
                      Automating this activity or introducing an additional parallel operator for this process will reduce the effective task time by half, raising the overall line throughput and balance efficiency above the <strong style={{ color: 'var(--accent-primary)' }}>{optimization.targetEfficiency}%</strong> benchmark.
                    </div>
                  </div>

                  {/* Suggestion 4: Cycle Time/Demand adjustment */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>[D]</span>
                    <div>
                      <strong style={{ color: 'var(--text-white)' }}>Cycle Time &amp; Demand Re-Calibration:</strong>{' '}
                      To balance the line mathematically above the <strong style={{ color: 'var(--text-white)' }}>{optimization.targetEfficiency}%</strong> efficiency target under current heuristics, consider adjusting the product demand to increase the Takt Time limit, or re-engineering operations to balance process times within <strong style={{ color: 'var(--accent-primary)' }}>{((totalTaskTime) / (optimization.stations.length * optimization.targetEfficiency / 100)).toFixed(1)} mins</strong> per workstation.
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ⚙️ Sticky trigger bar — tablet & mobile only */}
      <button
        type="button"
        className="drawer-toggle-bar"
        onClick={() => setIsDrawerOpen(true)}
        aria-label="Open optimization parameters"
      >
        ⚙️ ADJUST PARAMETERS
      </button>
    </div>
  );
};

export default LineOptimization;
