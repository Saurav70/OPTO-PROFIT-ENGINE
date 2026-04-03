import React, { useState, useMemo } from 'react';
import { 
  Settings, Menu, Clock, User, Maximize2, Cpu, BarChart2, AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateTaktTime, runOptimization } from '../utils/optimizer';
import { useHaptics } from '../utils/haptics';

const ComparisonColumn = ({ title, opt, color, taktTime }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
    <div style={{ 
      background: 'var(--card-bg)', 
      padding: '1.5rem', 
      borderRadius: '12px', 
      border: `1px solid var(--border-color)`,
      borderTop: `4px solid ${color}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-sub)' }}>{title}</h4>
        <div style={{ padding: '4px 8px', background: `${color}15`, color: color, borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900 }}>
          {opt.efficiency}% EFF
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
        <div style={{ textAlign: 'center', padding: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <p style={{ margin: 0, fontSize: '0.5rem', color: '#94a3b8', fontWeight: 800 }}>STATIONS</p>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-white)' }}>{opt.stations.length}</p>
        </div>
        <div style={{ textAlign: 'center', padding: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <p style={{ margin: 0, fontSize: '0.5rem', color: '#94a3b8', fontWeight: 800 }}>IDLE</p>
          <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-danger)' }}>{opt.totalIdleTime.toFixed(0)}m</p>
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
      {opt.stations.map((s, idx) => {
        const utilization = (s.time / taktTime) * 100;
        const isCritical = utilization > 95;
        
        return (
          <div key={idx} style={{ 
            background: 'var(--card-bg)', 
            border: `1px solid ${isCritical ? 'var(--accent-danger)' : 'var(--border-color)'}`, 
            borderRadius: '8px', 
            overflow: 'hidden',
            boxShadow: isCritical ? '0 0 15px rgba(239, 68, 68, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ padding: '0.6rem 1rem', background: isCritical ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-secondary)', borderBottom: `1px solid ${isCritical ? 'var(--accent-danger)40' : 'var(--border-color)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: color }}>STATION {idx + 1}</span>
                {isCritical && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--accent-danger)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.5rem', fontWeight: 900 }}>
                    <AlertTriangle size={8} /> INSTABILITY RISK
                  </div>
                )}
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isCritical ? 'var(--accent-danger)' : 'var(--text-sub)' }}>{s.time}m ({utilization.toFixed(0)}%)</span>
            </div>
            <div style={{ padding: '0.8rem' }}>
              {s.tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.id}: {t.name}</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-sub)' }}>{t.time}m</span>
                </div>
              ))}
              <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden', position: 'relative' }}>
                <div className="caution-bar" style={{ height: '100%', width: `${utilization}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const LineOptimization = ({ tasks, config }) => {
  const [viewMode, setViewMode] = useState('split'); 
  const [activeHeuristic, setActiveHeuristic] = useState('LTF');
  const { playClick, playSuccess } = useHaptics();
  
  const taktTime = calculateTaktTime(config.shiftTime, config.demand);
  
  const optimizationLTF = useMemo(() => runOptimization(tasks, taktTime, 'LTF'), [tasks, taktTime]);
  const optimizationMFT = useMemo(() => runOptimization(tasks, taktTime, 'MFT'), [tasks, taktTime]);
  const optimizationRPW = useMemo(() => runOptimization(tasks, taktTime, 'RPW'), [tasks, taktTime]);

  const handleSimulate = () => {
    playClick();
  };

  const toggleView = (mode) => {
    playSuccess();
    setViewMode(mode);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        background: 'var(--bg-main)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sub)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px' }}>
            <Cpu size={12} />
            MODULE 05
          </div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>LINE OPTIMIZATION ENGINE</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <div style={{ background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px', display: 'flex' }}>
              <button 
                onClick={() => toggleView('single')}
                style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === 'single' ? 'var(--card-bg)' : 'transparent', fontSize: '0.7rem', fontWeight: 800, color: viewMode === 'single' ? 'var(--accent-primary)' : 'var(--text-sub)', cursor: 'pointer', boxShadow: viewMode === 'single' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
              >SINGLE</button>
              <button 
                onClick={() => toggleView('split')}
                style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === 'split' ? 'var(--card-bg)' : 'transparent', fontSize: '0.7rem', fontWeight: 800, color: viewMode === 'split' ? 'var(--accent-primary)' : 'var(--text-sub)', cursor: 'pointer', boxShadow: viewMode === 'split' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
              >COMPARE ALL</button>
           </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
         <div style={{ width: '280px', background: 'var(--card-bg)', borderRight: '1px solid var(--border-color)', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', flexShrink: 0 }}>
            <div>
               <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>LINE PARAMETERS</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                     <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-sub)' }}>TARGET TAKT TIME</span>
                     <p style={{ margin: '2px 0 0 0', fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-white)' }}>{taktTime.toFixed(1)} <sub style={{ fontSize: '0.6rem' }}>min</sub></p>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                     <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-sub)' }}>TASK COUNT</span>
                     <p style={{ margin: '2px 0 0 0', fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-white)' }}>{tasks.length} <sub style={{ fontSize: '0.6rem' }}>steps</sub></p>
                  </div>
               </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
               <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>ALGORITHMS</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ padding: '0.8rem', background: 'var(--bg-tertiary)', borderLeft: '4px solid var(--accent-primary)', borderRadius: '4px' }}>
                     <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent-primary)' }}>LTF</p>
                     <p style={{ margin: '2px 0 0 0', fontSize: '0.55rem', color: 'var(--text-sub)', fontWeight: 600 }}>Longest Task First</p>
                  </div>
                  <div style={{ padding: '0.8rem', background: 'var(--bg-tertiary)', borderLeft: '4px solid var(--accent-secondary)', borderRadius: '4px' }}>
                     <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>MFT</p>
                     <p style={{ margin: '2px 0 0 0', fontSize: '0.55rem', color: 'var(--text-sub)', fontWeight: 600 }}>Most Following Tasks</p>
                  </div>
                  <div style={{ padding: '0.8rem', background: 'var(--bg-tertiary)', borderLeft: '4px solid var(--accent-warning)', borderRadius: '4px' }}>
                     <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent-warning)' }}>RPW</p>
                     <p style={{ margin: '2px 0 0 0', fontSize: '0.55rem', color: 'var(--text-sub)', fontWeight: 600 }}>Ranked Positional Weight</p>
                  </div>
               </div>
            </div>

            <button 
              onClick={handleSimulate}
              style={{ width: '100%', padding: '1rem', background: 'var(--sidebar-bg)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
               <BarChart2 size={16} /> RE-RUN SIMULATION
            </button>
         </div>

         <div style={{ flex: 1, padding: '1.5rem', display: 'flex', gap: '1.5rem', minHeight: 0 }}>
            {viewMode === 'split' ? (
               <>
                  <ComparisonColumn title="A: LTF" opt={optimizationLTF} color="var(--accent-primary)" taktTime={taktTime} />
                  <ComparisonColumn title="B: MFT" opt={optimizationMFT} color="var(--accent-secondary)" taktTime={taktTime} />
                  <ComparisonColumn title="C: RPW" opt={optimizationRPW} color="var(--accent-warning)" taktTime={taktTime} />
               </>
            ) : (
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
                     <button onClick={() => { playSuccess(); setActiveHeuristic('LTF'); }} style={{ padding: '6px 12px', borderRadius: '20px', border: activeHeuristic === 'LTF' ? 'none' : '1px solid var(--border-color)', background: activeHeuristic === 'LTF' ? 'var(--accent-primary)' : 'transparent', color: activeHeuristic === 'LTF' ? '#fff' : 'var(--text-sub)', fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer' }}>LTF</button>
                     <button onClick={() => { playSuccess(); setActiveHeuristic('MFT'); }} style={{ padding: '6px 12px', borderRadius: '20px', border: activeHeuristic === 'MFT' ? 'none' : '1px solid var(--border-color)', background: activeHeuristic === 'MFT' ? 'var(--accent-secondary)' : 'transparent', color: activeHeuristic === 'MFT' ? '#fff' : 'var(--text-sub)', fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer' }}>MFT</button>
                     <button onClick={() => { playSuccess(); setActiveHeuristic('RPW'); }} style={{ padding: '6px 12px', borderRadius: '20px', border: activeHeuristic === 'RPW' ? 'none' : '1px solid var(--border-color)', background: activeHeuristic === 'RPW' ? 'var(--accent-warning)' : 'transparent', color: activeHeuristic === 'RPW' ? '#fff' : 'var(--text-sub)', fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer' }}>RPW</button>
                  </div>
                  <ComparisonColumn 
                    title={activeHeuristic === 'LTF' ? "LONGEST TASK FIRST" : activeHeuristic === 'MFT' ? "MOST FOLLOWING TASKS" : "RANKED POSITIONAL WEIGHT"} 
                    opt={activeHeuristic === 'LTF' ? optimizationLTF : activeHeuristic === 'MFT' ? optimizationMFT : optimizationRPW} 
                    color={activeHeuristic === 'LTF' ? "var(--accent-primary)" : activeHeuristic === 'MFT' ? "var(--accent-secondary)" : "var(--accent-warning)"} 
                    taktTime={taktTime}
                  />
               </div>
            )}
         </div>
      </div>
    </motion.div>
  );
};

export default LineOptimization;
