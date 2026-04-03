import React from 'react';
import { 
  ArrowRight, Cpu, Monitor, Zap, 
  CheckCircle2, Star, Package, Activity, 
  Wind, Layout 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateTaktTime, calculateNmin, runOptimization } from '../utils/optimizer';

const ConceptualLayout = ({ tasks, config }) => {
  const taktTime = calculateTaktTime(config.shiftTime, config.demand);
  const nMin = calculateNmin(tasks, taktTime);
  const optimization = runOptimization(tasks, taktTime);

  // Map icons to stations based on common patterns in the image
  const getStationIcon = (idx) => {
    const icons = [Cpu, Monitor, Wind, Zap, Package];
    return icons[idx % icons.length];
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
        padding: '0 2rem',
        background: 'linear-gradient(to bottom, #f8fafc 0%, #eef2f6 100%)',
        borderRadius: '24px',
        overflow: 'hidden'
      }}
    >
      {/* 5. CONCEPTUAL LAYOUT DIAGRAM Header - Subtle implementation */}
      <div style={{ padding: '2rem 2rem 1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px' }}>
            <Cpu size={12} />
            MODULE 05
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '1px' }}>CONCEPTUAL LAYOUT DIAGRAM</h2>
        </div>
      </div>

      {/* Main Container Image Style */}
      <div className="glass" style={{ 
        flex: 1, 
        margin: '0 0 2rem 0', 
        padding: '2.5rem', 
        display: 'flex', 
        flexDirection: 'column',
        gap: '2rem',
        background: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
        position: 'relative'
      }}>
        {/* Title and Subtitle Area */}
        <div style={{ borderLeft: '8px solid var(--accent-primary)', paddingLeft: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: '#1e293b' }}>
            MANUFACTURING CELL LAYOUT DIAGRAM:
          </h1>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 400, margin: 0, color: '#475569', opacity: 0.8 }}>
            OSCILLOSCOPE ASSEMBLY LINE
          </h2>
        </div>

        {/* Summary Stats Bar - Minimalist with Vertical Pipes */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '1rem 2rem',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          {[
            { label: 'DAILY DEMAND', value: `${config.demand} UNITS` },
            { label: 'CYCLE TIME (C)', value: `${taktTime} MINS` },
            { label: 'LINE EFFICIENCY', value: `${optimization.efficiency}%` },
            { label: 'THEORETICAL WORKSTATIONS (NMIN)', value: nMin }
          ].map((stat, i) => (
            <React.Fragment key={i}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>{stat.label}:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginLeft: '0.5rem' }}>{stat.value}</span>
              </div>
              {i < 3 && <div style={{ height: '24px', width: '1.5px', background: '#cbd5e1' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Station Flow Layout */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flex: 1,
          padding: '1rem 0'
        }}>
          {optimization.stations.map((s, idx) => {
            const Icon = getStationIcon(idx);
            const pMinutes = s.time;
            const iMinutes = Math.max(0, taktTime - s.time);
            const isLast = idx === optimization.stations.length - 1;
            
            return (
              <React.Fragment key={idx}>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  style={{ 
                    width: '200px', 
                    background: isLast ? '#fefce8' : '#ffffff',
                    border: isLast ? '2px solid #fef08a' : '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: isLast ? '0 10px 25px rgba(234, 179, 8, 0.1)' : '0 4px 12px rgba(0,0,0,0.03)',
                    position: 'relative'
                  }}
                >
                  {/* Star and Success Elements for Station 5 (Last) */}
                  {isLast && (
                    <div style={{ position: 'absolute', top: '-10px', left: '-10px', color: '#eab308' }}>
                      <Star size={24} fill="#eab308" />
                    </div>
                  )}

                  {/* Header: STATION X */}
                  <div style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center', 
                    background: isLast ? '#fef9c3' : '#f1f5f9',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>STATION {idx + 1}</span>
                  </div>

                  {/* Body: Tasks */}
                  <div style={{ padding: '1rem', height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600, lineHeight: 1.4 }}>
                      {s.tasks.map((t, i) => (
                        <div key={t.id}>
                          {t.id === 'A' ? 'Tasks A (PCB Prep)' : 
                           t.id === 'B' ? 'Tasks B (Motherboard SMT)' :
                           t.id === 'C' ? 'C (Display Module)' :
                           t.id === 'D' ? 'D (Power Supply)' :
                           t.id === 'E' ? 'Task E (Core Integration)' :
                           t.id === 'F' ? 'Task F (Firmware Flashing)' :
                           t.id === 'G' ? 'Tasks G (Chassis Housing)' :
                           t.id === 'H' ? 'H (Final QA & Packaging)' :
                           `Task ${t.id} (${t.name || 'Process'})`}
                          {i < s.tasks.length - 1 ? ',' : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom: P and I Bars */}
                  <div style={{ padding: '0 0.75rem 0.75rem' }}>
                    <div style={{ position: 'relative', height: '40px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      {/* P Bar (Teal) */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 8px', background: '#2dd4bf', color: '#0f172a', fontSize: '0.65rem', fontWeight: 800 }}>
                        P: {pMinutes.toFixed(idx === 4 ? 0 : 0)} MINS
                      </div>
                      {/* I Bar (Grey) */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 8px', background: '#e2e8f0', color: '#64748b', fontSize: '0.65rem', fontWeight: 800 }}>
                        I: {iMinutes.toFixed(idx === 4 ? 0 : 0)} MINS
                      </div>
                      
                      {/* Icon Overlay at bottom right */}
                      <div style={{ position: 'absolute', bottom: '4px', right: '4px', color: isLast ? '#854d0e' : '#64748b' }}>
                        <Icon size={18} />
                      </div>
                    </div>
                    {isLast && (
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                         <CheckCircle2 size={18} color="#22c55e" fill="#22c55e" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Connecting Arrow */}
                {!isLast && (
                  <motion.div 
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 + 0.2 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="60" height="20" viewBox="0 0 60 20">
                       <path d="M 0 10 L 50 10" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                       <motion.path 
                         d="M 0 10 L 50 10" 
                         stroke="#2dd4bf" 
                         strokeWidth="4" 
                         strokeLinecap="round"
                         strokeDasharray="4 20"
                         animate={{ strokeDashoffset: [24, 0] }}
                         transition={{ repeat: Infinity, ease: "linear", duration: (s.time / taktTime) * 1.5 }} 
                       />
                       <polygon points="50,4 60,10 50,16" fill="#2dd4bf" />
                    </svg>
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Legend and Footer Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '1rem' }}>
          {/* Legend Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '24px', height: '24px', background: '#2dd4bf', border: '1px solid #94a3b8' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>P = Processing Time</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '24px', height: '24px', background: '#e2e8f0', border: '1px solid #94a3b8' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>I = Idle Time</span>
            </div>
          </div>

          {/* Footer Motto Area */}
          <div style={{ textAlign: 'center', flex: 1 }}>
             <p style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.1em', opacity: 0.9 }}>
                LINE BALANCING | PRECEDENCE CONSISTENT | REDUCING IDLE TIME
             </p>
          </div>

          {/* Spacer to balance legend */}
          <div style={{ width: '200px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
             <div style={{ padding: '8px', background: '#e0f2fe', borderRadius: '8px' }}>
                <Activity size={20} color="#0369a1" />
             </div>
             <div style={{ padding: '8px', background: '#f0f9ff', borderRadius: '8px' }}>
                <Layout size={20} color="#0369a1" />
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConceptualLayout;

