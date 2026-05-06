import React from 'react';
import { 
  ArrowRight, Cpu, Monitor, Zap, 
  CheckCircle2, Star, Package, Activity, 
  Wind, Layout 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateTaktTime, calculateNmin } from '../utils/optimizer';

const ConceptualLayout = ({ tasks, config, optimization }) => {
  const taktTime = calculateTaktTime(config);
  const nMin = calculateNmin(tasks, taktTime);

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
        background: 'var(--bg-main)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        transition: 'var(--transition-smooth)'
      }}
    >
      <div style={{ padding: '1.5rem 2rem 0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>

          <h2 className="header-title" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-white)' }}>CONCEPTUAL LAYOUT DIAGRAM</h2>
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        margin: '1.5rem 2rem 2rem 2rem', 
        padding: '2rem', 
        display: 'flex', 
        flexDirection: 'column',
        gap: '2rem',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-glow)',
        position: 'relative',
        overflowY: 'auto'
      }}>
        {/* Title and Subtitle Area */}
        <div style={{ borderLeft: '8px solid var(--accent-primary)', paddingLeft: '1.5rem' }}>
          <h1 className="header-title" style={{ fontSize: '1.6rem', margin: 0, color: 'var(--text-white)' }}>
            MANUFACTURING CELL LAYOUT DIAGRAM
          </h1>
          <h2 style={{ fontSize: '1.0rem', fontWeight: 600, margin: 0, color: 'var(--text-sub)', opacity: 0.8 }}>
            {(config?.productName || 'Line').toUpperCase()} ASSEMBLY LINE
          </h2>
        </div>

        {/* Summary Stats Bar */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          background: 'var(--border-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          {[
            { label: 'DAILY DEMAND', value: `${config?.demand || 0} UNITS` },
            { label: 'CYCLE TIME (C)', value: `${(taktTime || 0).toFixed(1)} MINS` },
            { label: 'LINE EFFICIENCY', value: `${optimization?.efficiency || 0}%` },
            { label: 'THEORETICAL WORKSTATIONS (NMIN)', value: nMin || 0 }
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '0.8rem' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px', display: 'block', marginBottom: '2px' }}>{stat.label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-white)' }}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Station Flow Layout */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flex: 1,
          padding: '1rem 0',
          gap: '1rem',
          minHeight: '220px'
        }}>
          {(optimization?.stations || []).map((s, idx) => {
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
                  className="glow-card"
                  style={{ 
                    flex: 1,
                    minWidth: '180px',
                    borderLeft: `4px solid ${isLast ? 'var(--accent-warning)' : 'var(--accent-primary)'}`,
                    position: 'relative'
                  }}
                >
                  {isLast && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--accent-warning)' }}>
                      <Star size={16} fill="var(--accent-warning)" />
                    </div>
                  )}

                  {/* Header: STATION X */}
                  <div style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center', 
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>STATION {idx + 1}</span>
                  </div>

                  {/* Body: Tasks */}
                  <div style={{ padding: '1rem', height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-main)', fontWeight: 700, lineHeight: 1.4 }}>
                      {s.tasks.map((t, i) => (
                        <div key={t.id}>
                          {t.id}. {t.name}
                          {i < s.tasks.length - 1 ? ',' : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom: P and I Bars */}
                  <div style={{ padding: '0 0.75rem 0.75rem' }}>
                    <div style={{ position: 'relative', height: '42px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      {/* P Bar (Teal) */}
                      <div style={{ flex: (pMinutes / taktTime), minHeight: '21px', display: 'flex', alignItems: 'center', padding: '0 8px', background: 'var(--accent-primary)', color: '#fff', fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.5px' }}>
                        P: {pMinutes.toFixed(1)}m
                      </div>
                      {/* I Bar (Grey) */}
                      <div style={{ flex: (iMinutes / taktTime), minHeight: '21px', display: 'flex', alignItems: 'center', padding: '0 8px', background: 'var(--bg-tertiary)', color: 'var(--text-sub)', fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.5px' }}>
                        I: {iMinutes.toFixed(1)}m
                      </div>
                      
                      {/* Icon Overlay at bottom right */}
                      <div style={{ position: 'absolute', bottom: '4px', right: '4px', color: isLast ? 'var(--accent-warning)' : 'var(--text-sub)', opacity: 0.6 }}>
                        <Icon size={16} />
                      </div>
                    </div>
                    {isLast && (
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                         <CheckCircle2 size={16} color="var(--accent-primary)" strokeWidth={3} />
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
                    <svg width="40" height="20" viewBox="0 0 40 20">
                       <path d="M 0 10 L 30 10" stroke="var(--border-color)" strokeWidth="3" strokeLinecap="round" />
                       <motion.path 
                         d="M 0 10 L 30 10" 
                         stroke="var(--accent-primary)" 
                         strokeWidth="3" 
                         strokeLinecap="round"
                         strokeDasharray="4 12"
                         animate={{ strokeDashoffset: [16, 0] }}
                         transition={{ repeat: Infinity, ease: "linear", duration: 1.5 }} 
                       />
                       <polygon points="30,4 40,10 30,16" fill="var(--accent-primary)" />
                    </svg>
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Legend and Footer Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          {/* Legend Area */}
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '16px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', letterSpacing: '0.5px' }}>P = PROCESSING TIME</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '16px', height: '16px', background: 'var(--bg-tertiary)', borderRadius: '2px', border: '1px solid var(--border-color)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', letterSpacing: '0.5px' }}>I = IDLE TIME</span>            </div>
          </div>

          {/* Footer Motto Area */}
          <div style={{ textAlign: 'right' }}>
             <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '1px' }}>
                OPTIMIZED FLOW | ZERO WASTE | BALANCED WORKLOAD
             </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConceptualLayout;

