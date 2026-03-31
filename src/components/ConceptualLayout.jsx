import React from 'react';
import { ArrowRight, Box, Settings, Cpu, MonitorPlay, Zap, CheckCircle2 } from 'lucide-react';
import { calculateTaktTime, calculateNmin, runOptimization } from '../utils/optimizer';

const ConceptualLayout = ({ tasks, config }) => {
  const taktTime = calculateTaktTime(config.shiftTime, config.demand);
  const nMin = calculateNmin(tasks, taktTime);
  const optimization = runOptimization(tasks, taktTime);

  const getStationIcon = (idx) => {
    const icons = [Cpu, Settings, Zap, MonitorPlay, CheckCircle2];
    return icons[idx % icons.length];
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Conceptual Layout</h1>
        <p style={{ color: 'var(--text-sub)', fontSize: '1.1rem' }}>Initial flow map and workstation-level conceptual grouping.</p>
      </header>

      {/* Header Stats Bar */}
      <div className="glass" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', marginBottom: '3rem', flexShrink: 0, borderRadius: '8px' }}>
         <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', letterSpacing: '1px' }}>DAILY DEMAND</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--text-white)' }}>{config.demand} units</strong>
         </div>
         <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', letterSpacing: '1px' }}>CYCLE TIME (C)</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--text-white)' }}>{taktTime} mins</strong>
         </div>
         <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', letterSpacing: '1px' }}>LINE EFFICIENCY</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{optimization.efficiency}%</strong>
         </div>
         <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', letterSpacing: '1px' }}>MIN WORKSTATIONS (N_min)</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--text-white)' }}>{nMin}</strong>
         </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', flex: 1, overflowX: 'auto' }}>
         {optimization.stations.map((s, idx) => {
           const Icon = getStationIcon(idx);
           const pRatio = (s.time / taktTime) * 100;
           const idleTime = taktTime - s.time;
           const idleRatio = Math.max(0, 100 - pRatio);

           return (
             <React.Fragment key={idx}>
               <div className="glass" style={{ width: '220px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', flexShrink: 0, borderTop: '4px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ padding: '0.6rem', background: 'rgba(100, 255, 218, 0.1)', borderRadius: '8px' }}>
                         <Icon size={20} color="var(--accent-primary)" />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                          <h3 style={{ margin: '0 0 0.1rem 0', fontSize: '0.85rem', color: 'var(--text-white)', fontWeight: 700 }}>STATION {idx + 1}</h3>
                      </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                     {s.tasks.map(t => (
                       <span key={t.id} style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', border: '1px solid rgba(100, 255, 218, 0.4)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Task {t.id}</span>
                     ))}
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                           <span style={{ color: 'var(--text-sub)' }}>Processing (P): {s.time.toFixed(1)}m</span>
                           <span style={{ color: 'var(--text-white)' }}>{pRatio.toFixed(0)}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                           <div style={{ width: `${pRatio}%`, height: '100%', background: 'linear-gradient(90deg, #48bb78, #38a169)' }} />
                      </div>
                  </div>

                  <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                           <span style={{ color: 'var(--text-sub)' }}>Idle Time (I): {idleTime.toFixed(1)}m</span>
                           <span style={{ color: 'var(--accent-warning)' }}>{idleRatio.toFixed(0)}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                           <div style={{ width: `${idleRatio}%`, height: '100%', background: 'linear-gradient(90deg, #ed8936, #dd6b20)' }} />
                      </div>
                  </div>
               </div>
               
               {idx < optimization.stations.length - 1 && (
                 <div style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>
                    <ArrowRight size={24} strokeWidth={2} opacity="0.6" />
                 </div>
               )}
             </React.Fragment>
           );
         })}
      </div>

      <div className="glass" style={{ padding: '1.2rem', display: 'flex', gap: '2rem', alignItems: 'center', margin: '2rem 0', flexShrink: 0 }}>
         <div style={{ display: 'flex', gap: '1.5rem', flex: 1, justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1.5px', color: 'var(--text-sub)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} color="var(--accent-primary)"/> LINE BALANCING</span>
            <span>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} color="var(--accent-primary)"/> PRECEDENCE CONSISTENT</span>
            <span>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14} color="var(--accent-warning)"/> REDUCING IDLE TIME</span>
         </div>
      </div>
    </div>
  );
};

export default ConceptualLayout;
