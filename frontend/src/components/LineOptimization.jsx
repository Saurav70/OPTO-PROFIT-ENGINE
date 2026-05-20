import React, { useMemo, useState } from 'react';
import { calculateTaktTime, runOptimization } from '../utils/optimizer';
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { getVariableValue } from '../utils/formulaEngine';

const LineOptimization = ({ tasks, config, optimization: sharedOptimization }) => {
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

  // Use shared optimization when cycle time matches takt, otherwise run a custom one
  const usingShared = Math.abs(appliedCycleTime - taktTime) < 0.001 && appliedHeuristic === 'LTF';
  const [localOptimization, setLocalOptimization] = useState(null);
  const optimization = (usingShared && sharedOptimization) ? sharedOptimization : (localOptimization || runOptimization(tasks, appliedCycleTime, appliedHeuristic, config));

  const hasPendingChanges = heuristic !== appliedHeuristic || targetCycleTime !== appliedCycleTime;

  const handleOptimize = () => {
    setAppliedHeuristic(heuristic);
    setAppliedCycleTime(targetCycleTime);
    setLocalOptimization(runOptimization(tasks, targetCycleTime, heuristic, config));
  };

  // ── Labour Productivity (same as efficiency, surfaced with operators context) ──
  const totalTaskTime = tasks.reduce((sum, t) => sum + t.time, 0);
  const labourProductivity = operators > 0 && appliedCycleTime > 0
    ? ((totalTaskTime / (operators * appliedCycleTime)) * 100).toFixed(1)
    : '0.0';

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
        <h2 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1rem' }}>Optimization Controls</h2>

        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-sub)' }}>Heuristic Selection</label>
        <select value={heuristic} onChange={(e) => setHeuristic(e.target.value)} style={{ padding: '0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-white)' }}>
          <option value="LTF">Longest Task First</option>
          <option value="MFT">Most Following Tasks</option>
          <option value="RPW">Ranked Positional Weight</option>
        </select>

        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-sub)' }}>Target Cycle Time (min)</label>
        <input type="number" min="0.1" step="0.1" value={targetCycleTime} onChange={(e) => setTargetCycleTime(Math.max(0.1, Number(e.target.value) || 0.1))} style={{ padding: '0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-white)' }} />

        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-sub)' }}>Number of Operators</label>
        <input type="number" min="1" step="1" value={operators} onChange={(e) => setOperators(Math.max(1, Number(e.target.value) || 1))} style={{ padding: '0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-white)' }} />

        {/* Labour Productivity Display */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>LABOUR PRODUCTIVITY</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{labourProductivity}%</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-sub)', display: 'block' }}>LP = Σt / (N_op × C)</span>
        </div>

        <div style={{ marginTop: '0.5rem', flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-sub)' }}>
                <th>ID</th><th>Task</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td>{t.id}</td><td>{t.name}</td><td>{t.time}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={handleOptimize} style={{ padding: '1rem', background: hasPendingChanges ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 900, cursor: 'pointer' }}>
          OPTIMIZE LINE
        </button>
      </div>

      {/* Main Content */}
      <div className="module-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Optimized Line Layout</h2>
            <p style={{ margin: '0.45rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-sub)' }}>
              Stations are balanced using a target cycle time of {appliedCycleTime.toFixed(1)} minutes.
            </p>
          </div>
          {hasPendingChanges && (
            <div style={{ padding: '0.5rem 0.75rem', borderRadius: '999px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: 'var(--accent-warning)', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.5px' }}>
              PENDING CHANGES
            </div>
          )}
        </div>

        {/* KPI Strip */}
        <div className="kpi-grid">
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Line Efficiency</span>
            <div style={{ marginTop: '0.35rem', fontSize: '2rem', fontWeight: 900 }}>{optimization.efficiency}%</div>
          </div>
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Total Idle Time</span>
            <div style={{ marginTop: '0.35rem', fontSize: '2rem', fontWeight: 900 }}>{optimization.totalIdleTime.toFixed(1)} min</div>
          </div>
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Workstations Used</span>
            <div style={{ marginTop: '0.35rem', fontSize: '2rem', fontWeight: 900 }}>{optimization.stations.length}</div>
          </div>
          <div className="glow-card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Actual Cycle Time</span>
            <div style={{ marginTop: '0.35rem', fontSize: '2rem', fontWeight: 900 }}>{(optimization.actualCycleTime || 0).toFixed(1)} min</div>
          </div>
        </div>

        {/* Station Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {optimization.stations.map((station, idx) => {
            const idleTime = Math.max(0, appliedCycleTime - station.time);
            const utilization = appliedCycleTime > 0 ? (station.time / appliedCycleTime) * 100 : 0;
            return (
              <div key={idx} className="glow-card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900 }}>STATION {idx + 1}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: utilization > 100 ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
                    {utilization.toFixed(1)}% load
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {station.tasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', padding: '0.25rem 0' }}>
                      <span>{task.id}. {task.name}</span>
                      <span>{task.time}m</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 800 }}>PROCESS TIME</span>
                    <div style={{ marginTop: '0.25rem', fontSize: '1rem', fontWeight: 900 }}>{station.time.toFixed(1)}m</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 800 }}>IDLE TIME</span>
                    <div style={{ marginTop: '0.25rem', fontSize: '1rem', fontWeight: 900 }}>{idleTime.toFixed(1)}m</div>
                  </div>
                </div>
                <div style={{ marginTop: '0.9rem', height: '10px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(utilization, 100)}%`, height: '100%', background: utilization > 95 ? 'var(--accent-warning)' : 'var(--accent-primary)' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── STATION BALANCE AUDIT TABLE ── */}
        {optimization.stations.length > 0 && (
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>STATION BALANCE AUDIT</h4>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 800 }}>— Mathematical breakdown per workstation</span>
            </div>
            <div className="table-responsive-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                  {['STATION', 'TASKS', 'PROCESS TIME (P)', 'IDLE TIME (I)', 'LOAD %', 'STATUS'].map(h => (
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
                  const rowBg = isOverloaded ? 'rgba(239,68,68,0.08)' : isLow ? 'rgba(245,158,11,0.07)' : 'transparent';
                  const loadColor = isOverloaded ? 'var(--accent-danger)' : isLow ? 'var(--accent-warning)' : 'var(--accent-primary)';
                  const StatusIcon = isOverloaded ? XCircle : isLow ? AlertTriangle : CheckCircle;
                  const statusColor = isOverloaded ? 'var(--accent-danger)' : isLow ? 'var(--accent-warning)' : 'var(--accent-primary)';
                  const statusText = isOverloaded ? 'OVERLOAD' : isLow ? 'LOW UTIL' : 'OPTIMAL';

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
        )}
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
