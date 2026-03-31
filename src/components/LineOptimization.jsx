import React, { useState } from 'react';
import { Settings, Zap, Play } from 'lucide-react';
import { calculateTaktTime, runOptimization } from '../utils/optimizer';

const LineOptimization = ({ tasks, config }) => {
  const [heuristic, setHeuristic] = useState('LTF');
  const taktTime = calculateTaktTime(config.shiftTime, config.demand);
  
  // Use heuristic
  const optimization = runOptimization(tasks, taktTime, heuristic);

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <header style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Line Optimization</h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '1.1rem' }}>Adjust balancing algorithms and heuristics to maximize line efficiency.</p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '2rem', flex: 1, minHeight: 0 }}>
         
         {/* Left Sidebar: Controls & Tasks */}
         <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
            {/* Optimization Controls */}
            <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.8rem' }}>
                 <Settings size={18} color="var(--accent-primary)" />
                 <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-white)', fontWeight: 700 }}>Optimization Controls</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <label style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Heuristic Selection</label>
                 <select 
                   value={heuristic}
                   onChange={(e) => setHeuristic(e.target.value)}
                   style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '0.8rem', borderRadius: '6px', color: 'var(--text-white)', fontSize: '0.85rem', outline: 'none' }}
                 >
                   <option value="LTF">Longest Task Time (LTF)</option>
                   <option value="MFT">Most Following Tasks (MFT)</option>
                 </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Target Takt Time</label>
                    <input value={`${taktTime} mins`} disabled style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '0.6rem', borderRadius: '4px', color: 'var(--text-sub)', fontSize: '0.8rem' }} />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Actual Cycle Time</label>
                    <input value={`${optimization.actualCycleTime || 0} mins`} disabled style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '0.6rem', borderRadius: '4px', color: 'var(--text-sub)', fontSize: '0.8rem' }} />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Operators</label>
                    <input value={optimization.nActual || 0} disabled style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '0.6rem', borderRadius: '4px', color: 'var(--text-sub)', fontSize: '0.8rem' }} />
                 </div>
              </div>

              <button style={{ width: '100%', padding: '1rem', background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '0.5rem' }}>
                 <Zap size={16} /> OPTIMIZE LINE
              </button>
            </div>

            {/* Task List Table */}
            <div className="glass" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
               <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-sub)' }}>Input Task List</h4>
               <div style={{ flex: 1, overflowY: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-sub)' }}>
                         <th style={{ padding: '0.5rem', textAlign: 'left' }}>Task ID</th>
                         <th style={{ padding: '0.5rem', textAlign: 'left' }}>Description</th>
                         <th style={{ padding: '0.5rem', textAlign: 'right' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                           <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{t.id}</td>
                           <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-white)' }}>{t.name}</td>
                           <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>{t.time}m</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
         </div>

         {/* Right Main Area: Optimized Layout */}
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
             <div className="glass" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', flexShrink: 0 }}>
                 <div style={{ textAlign: 'center', borderRight: '1px solid var(--glass-border)' }}>
                     <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 600 }}>Line Efficiency:</p>
                     <h2 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--accent-primary)', fontWeight: 800 }}>{optimization.efficiency}%</h2>
                 </div>
                 <div style={{ textAlign: 'center' }}>
                     <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 600 }}>Total Idle Time (per cycle):</p>
                     <h2 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--text-white)', fontWeight: 800 }}>{(optimization.totalIdleTime || 0).toFixed(1)} mins</h2>
                 </div>
             </div>

             <div className="glass" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-white)', fontWeight: 700 }}>Optimized Line Layout</h3>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {optimization.stations.map((s, idx) => (
                       <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ background: 'linear-gradient(90deg, #112a46, #0a192f)', padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-white)' }}>STATION {idx + 1}</h4>
                              <Settings size={14} color="var(--accent-primary)" opacity="0.5" />
                          </div>
                          <div style={{ padding: '1rem' }}>
                              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                 {s.tasks.map(t => (
                                    <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                       <span><strong style={{ color: 'var(--accent-primary)' }}>{t.id}</strong> {t.name.split(' ')[0]}...</span>
                                       <span style={{ color: 'var(--text-sub)' }}>{t.time}m</span>
                                    </li>
                                 ))}
                              </ul>
                              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                                  <span>Total:</span>
                                  <span>{s.time}m</span>
                              </div>
                          </div>
                       </div>
                    ))}
                 </div>
             </div>
         </div>

      </div>
    </div>
  );
};

export default LineOptimization;
