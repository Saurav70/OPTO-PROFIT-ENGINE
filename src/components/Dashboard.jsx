import React, { useState } from 'react';
import { Activity, Network, Box, Grid, TrendingUp, Save, Info, Cpu, Sliders, Printer, AlertTriangle, Trash2, FolderOpen, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateTaktTime, calculateNmin, runOptimization } from '../utils/optimizer';

const Dashboard = ({ tasks, config, setConfig, onNavigate, profiles, activeProfileId, onSaveProfile, onLoadProfile, onDeleteProfile }) => {
  const [newProfileName, setNewProfileName] = useState('');
  const taktTime = calculateTaktTime(config.shiftTime, config.demand);
  const nMin = calculateNmin(tasks, taktTime);
  const totalTime = tasks.reduce((sum, t) => sum + t.time, 0);
  const optimization = runOptimization(tasks, taktTime);

  const effValue = parseFloat(optimization.efficiency);
  const isLowEfficiency = effValue < 70;

  const handlePrintReport = () => {
    window.print();
  };

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;
    onSaveProfile(newProfileName);
    setNewProfileName('');
  };

  const navCards = [
    { id: 'network', icon: Network, label: 'Precedence Network', sub: 'Logical dependencies and task flow DAG.', color: 'var(--accent-primary)', num: 3 },
    { id: 'conceptual', icon: Box, label: 'Conceptual Layout', sub: 'Initial manufacturing flow diagram.', color: '#0dcaf0', num: 4 },
    { id: 'floor', icon: Grid, label: 'Factory Floor Layout', sub: '2D spatial simulation and path routing.', color: 'var(--accent-secondary)', num: 5 },
    { id: 'financials', icon: TrendingUp, label: 'Financial Reports', sub: 'ROI calculators and profit projections.', color: 'var(--accent-warning)', num: 6 },
  ];

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
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ padding: '1.5rem 2rem 0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sub)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px' }}>
            <Cpu size={12} />
            MODULE 01
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>PRODUCTION DASHBOARD</h2>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '1rem' }}>
           <button 
             onClick={handlePrintReport}
             style={{ 
               background: 'var(--bg-secondary)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', 
               padding: '0.6rem 1.2rem', borderRadius: '6px', fontSize: '0.75rem', 
               fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
             }}
           >
             <Printer size={14} /> GENERATE EXECUTIVE REPORT
           </button>
        </div>
      </div>


      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
        
        {/* Top Metric Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem' }}>
          {[
            { label: 'LINE EFFICIENCY', val: `${optimization.efficiency}%`, icon: Activity, color: isLowEfficiency ? 'var(--accent-danger)' : 'var(--accent-primary)', glow: !isLowEfficiency },
            { label: 'WORK STATIONS', val: optimization.stations.length, sub: `/ ${nMin} Target`, icon: Info, color: '#0891b2' },
            { label: 'BOTTLE-NECK TIME', val: `${optimization.actualCycleTime || 0}m`, icon: Activity, color: 'var(--accent-secondary)' },
            { label: 'TOTAL PROCESS TIME', val: `${totalTime}m`, icon: Save, color: '#7c3aed' },
            { label: 'BALANCE DELAY', val: `${optimization.balanceDelay}%`, icon: AlertTriangle, color: 'var(--accent-warning)' }
          ].map((m, i) => (
            <motion.div 
              key={i} 
              animate={m.label === 'LINE EFFICIENCY' && isLowEfficiency ? { borderColor: ['#ef4444', '#334155', '#ef4444'] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ 
                background: 'var(--card-bg)', 
                padding: '1.2rem', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${m.color}`,
                boxShadow: m.glow ? `0 0 15px ${m.color}20` : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <m.icon size={16} color={m.color} />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)', letterSpacing: '0.5px' }}>{m.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-white)' }}>{m.val}</span>
                {m.sub && <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 600 }}>{m.sub}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Center Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Performance Control Panel */}
          <div style={{ 
            background: 'var(--card-bg)', 
            borderRadius: '12px', 
            border: '1px solid var(--border-color)', 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ padding: '1.2rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-white)' }}>CORE PERFORMANCE ANALYTICS</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Theoretical Balance Index vs. Actual Factory Simulation</p>
               </div>
               <button 
                 className="no-print"
                 onClick={() => onNavigate('optimization')}
                 style={{ 
                   background: 'var(--accent-primary)', color: '#fff', border: 'none', 
                   padding: '0.6rem 1.2rem', borderRadius: '6px', fontSize: '0.75rem', 
                   fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                   boxShadow: '0 4px 0 #0f766e'
                 }}
               >
                   OPEN OPTIMIZER
               </button>
            </div>

            <div style={{ padding: '2rem', display: 'flex', gap: '3rem', alignItems: 'center' }}>
               {/* Industrial Gauge */}
               <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="var(--bg-tertiary)" strokeWidth="12" />
                    <circle cx="100" cy="100" r="90" fill="none" stroke={isLowEfficiency ? 'var(--accent-danger)' : 'var(--accent-primary)'} strokeWidth="12" 
                      strokeDasharray={`${(effValue / 100) * 565}, 565`} 
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                      style={{ transition: 'stroke-dasharray 0.5s ease-out, stroke 0.3s ease' }}
                    />
                    <circle cx="100" cy="100" r="75" fill="none" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                     <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)' }}>RATING</span>
                     <span style={{ fontSize: '3rem', fontWeight: 900, color: isLowEfficiency ? 'var(--accent-danger)' : 'var(--accent-primary)', lineHeight: 1 }}>{effValue.toFixed(0)}<sub style={{ fontSize: '1rem', bottom: '0.2rem' }}>%</sub></span>
                     <span style={{ 
                       fontSize: '0.65rem', fontWeight: 700, 
                       background: isLowEfficiency ? 'var(--accent-danger)20' : 'var(--accent-primary)20', 
                       color: isLowEfficiency ? 'var(--accent-danger)' : 'var(--accent-primary)', 
                       padding: '2px 8px', borderRadius: '10px', marginTop: '5px' 
                     }}>
                       {isLowEfficiency ? 'INEFFICIENT' : 'OPTIMAL'}
                     </span>
                  </div>
               </div>

               {/* Meta Stats Grid */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>
                  <div>
                    <h6 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 800 }}>OPTIMIZED TAKT</h6>
                    <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-white)' }}>{taktTime.toFixed(1)} <sub style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>min</sub></p>
                  </div>
                  <div>
                    <h6 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 800 }}>IDLE TIME LOSS</h6>
                    <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-danger)' }}>{optimization.totalIdleTime.toFixed(0)} <sub style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>min</sub></p>
                  </div>
                  <div>
                    <h6 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 800 }}>SMOOTHNESS IDX</h6>
                    <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>0.94 <sub style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>coef</sub></p>
                  </div>
                  <div>
                    <h6 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 800 }}>CRITICAL PATH</h6>
                    <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-warning)' }}>STATION {optimization.stations.length}</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Project Management Side Panel */}
          <div style={{ 
            background: 'var(--sidebar-bg)', 
            borderRadius: '12px', 
            padding: '1.5rem', 
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}>
             <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
                <FolderOpen size={120} color="var(--accent-primary)" />
             </div>

             <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', zIndex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>PROJECT PROFILES</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Switch between stored configurations</p>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, overflowY: 'auto', maxHeight: '250px', zIndex: 1 }}>
                {profiles.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>No saved projects yet</p>
                  </div>
                ) : (
                  profiles.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: p.id === activeProfileId ? 'rgba(13, 148, 136, 0.2)' : 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', border: `1px solid ${p.id === activeProfileId ? 'var(--accent-primary)' : 'transparent'}`, transition: 'all 0.2s' }}>
                       <div onClick={() => onLoadProfile(p.id)} style={{ flex: 1, cursor: 'pointer' }}>
                          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: p.id === activeProfileId ? 'var(--accent-primary)' : '#fff' }}>{p.name}</p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{new Date(p.timestamp).toLocaleDateString()}</p>
                       </div>
                       <button onClick={() => onDeleteProfile(p.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.color = 'var(--accent-danger)'} onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.2)'}>
                          <Trash2 size={14} />
                       </button>
                    </div>
                  ))
                )}
             </div>

             <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', zIndex: 1 }}>
                <input 
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="New Profile Name..."
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.6rem', color: '#fff', fontSize: '0.75rem', outline: 'none' }}
                />
                <button 
                  onClick={handleCreateProfile}
                  style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', padding: '0.6rem', color: '#fff', cursor: 'pointer' }}
                >
                  <Plus size={18} />
                </button>
             </div>
          </div>
        </div>

        {/* Navigation Grid Section */}
        <div className="no-print" style={{ borderTop: '2px solid var(--border-color)', paddingTop: '2rem' }}>
          <h3 style={{ margin: '0 0 1.2rem 0', fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>SYSTEM MODULES</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
            {navCards.map(card => (
              <motion.div 
                key={card.id} 
                onClick={() => onNavigate(card.id)}
                whileHover={{ y: -5, boxShadow: `0 10px 30px ${card.color}15` }}
                style={{ 
                  background: 'var(--card-bg)', border: '1px solid var(--border-color)', 
                  borderRadius: '10px', padding: '1.5rem', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: '1rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                   <div style={{ padding: '10px', background: `${card.color}15`, borderRadius: '10px' }}>
                      <card.icon size={22} color={card.color} />
                   </div>
                   <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-sub)', opacity: 0.4 }}>0{card.num}</span>
                </div>
                <div>
                   <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-white)' }}>{card.label.toUpperCase()}</h4>
                   <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: 'var(--text-sub)', lineHeight: 1.4, fontWeight: 500 }}>{card.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
