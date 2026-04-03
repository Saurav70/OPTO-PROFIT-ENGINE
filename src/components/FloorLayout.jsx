import React, { useState, useEffect } from 'react';
import { ArrowRight, CornerDownRight, RotateCcw, Cpu, Box, Play, Square, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateTaktTime, runOptimization } from '../utils/optimizer';

const FloorLayout = ({ tasks, config }) => {
  const taktTime = calculateTaktTime(config.shiftTime, config.demand);
  const optimization = runOptimization(tasks, taktTime);

  const [layoutType, setLayoutType] = useState('u-shape'); 
  const [showArrows, setShowArrows] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeStationIdx, setActiveStationIdx] = useState(-1);

  // Simulation Logic
  useEffect(() => {
    let timer;
    if (isSimulating) {
      const runStep = (idx) => {
        if (idx >= optimization.stations.length) {
          setIsSimulating(false);
          setActiveStationIdx(-1);
          return;
        }
        setActiveStationIdx(idx);
        // Unit stays at station proportional to its task time (1 min = 200ms simulation time)
        const stayTime = optimization.stations[idx].time * 200;
        timer = setTimeout(() => runStep(idx + 1), stayTime + 400); // add transit time
      };
      runStep(0);
    } else {
      setActiveStationIdx(-1);
    }
    return () => clearTimeout(timer);
  }, [isSimulating, optimization.stations]);

  // Generate grid background
  const gridStyle = {
    backgroundImage: `
      linear-gradient(var(--border-color) 1px, transparent 1px),
      linear-gradient(90deg, var(--border-color) 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px',
    backgroundColor: 'var(--bg-primary)',
    position: 'relative',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    transition: 'all 0.3s ease'
  };

  const getStationStyle = (idx, total) => {
    const baseStyle = {
      position: 'absolute',
      width: '160px',
      padding: '0',
      background: 'var(--card-bg)',
      border: `1px solid var(--border-color)`,
      borderRadius: '4px',
      boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
      zIndex: 10,
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    };

    if (layoutType === 'straight') {
      return { ...baseStyle, left: `${80 + idx * 200}px`, top: '180px' };
    } 
    
    if (layoutType === 'u-shape') {
      const half = Math.ceil(total / 2);
      if (idx < half) {
        return { ...baseStyle, left: `${100 + idx * 220}px`, top: '80px' };
      } else {
        const reverseIdx = total - idx - 1;
        return { ...baseStyle, left: `${100 + reverseIdx * 220}px`, top: '340px' };
      }
    }

    if (layoutType === 'inefficient') {
      const pos = [
        { left: '100px', top: '70px' },
        { left: '450px', top: '90px' },
        { left: '680px', top: '300px' },
        { left: '280px', top: '380px' },
        { left: '120px', top: '240px' },
      ];
      return { ...baseStyle, ...(pos[idx % pos.length] || { left: `${idx * 160}px`, top: '200px' }) };
    }

    return baseStyle;
  };

  const uShapeFlowPaths = [
    "M 260 120 L 320 120",
    "M 480 120 L 540 120",
    "M 540 160 L 540 340",
    "M 320 380 L 260 380"
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
        boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ padding: '1.5rem 2rem 0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sub)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px' }}>
            <Cpu size={12} />
            MODULE 06
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>FACTORY FLOOR LAYOUT</h2>
        </div>
      </div>


      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
         
         <div style={{ 
           width: '300px', 
           background: 'var(--card-bg)', 
           borderRight: '1px solid var(--border-color)',
           display: 'flex', 
           flexDirection: 'column', 
           flexShrink: 0
         }}>
             <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>LAYOUT TEMPLATES</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                   {[
                     { id: 'straight', label: 'ST LINE', icon: ArrowRight },
                     { id: 'u-shape', label: 'U-SHAPE', icon: CornerDownRight },
                     { id: 'inefficient', label: 'COMPLEX', icon: RotateCcw }
                   ].map(type => (
                      <motion.button 
                        key={type.id}
                        onClick={() => setLayoutType(type.id)}
                        whileHover={{ background: 'var(--bg-tertiary)' }}
                        whileTap={{ scale: 0.95 }}
                        style={{ 
                          padding: '10px 4px', 
                          background: layoutType === type.id ? 'var(--accent-primary)20' : 'transparent', 
                          border: `1px solid ${layoutType === type.id ? 'var(--accent-primary)' : 'var(--border-color)'}`, 
                          borderRadius: '6px', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                         <type.icon size={18} color={layoutType === type.id ? 'var(--accent-primary)' : 'var(--text-sub)'} />
                         <span style={{ fontSize: '0.6rem', fontWeight: 800, color: layoutType === type.id ? 'var(--accent-primary)' : 'var(--text-sub)' }}>{type.label}</span>
                      </motion.button>
                   ))}
                </div>
             </div>

             <div style={{ padding: '1.2rem', flex: 1, overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>ACTIVE STATIONS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                   {optimization.stations.map((s, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0, scale: activeStationIdx === idx ? 1.05 : 1 }}
                        style={{ 
                          padding: '0.6rem', 
                          background: activeStationIdx === idx ? 'var(--accent-primary)10' : 'var(--bg-secondary)', 
                          border: `1px solid ${activeStationIdx === idx ? 'var(--accent-primary)' : 'var(--border-color)'}`, 
                          borderRadius: '6px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px',
                          transition: 'all 0.3s ease'
                        }}
                      >
                         <div style={{ 
                           width: '32px', height: '32px', 
                           background: activeStationIdx === idx ? 'var(--accent-primary)' : 'var(--bg-tertiary)', borderRadius: '4px',
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                           transition: 'background 0.3s ease'
                         }}>
                            <Box size={16} color={activeStationIdx === idx ? "#fff" : "var(--text-sub)"} />
                         </div>
                         <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-sub)' }}>STATION 0{idx + 1}</span>
                           <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-white)' }}>
                             {idx === optimization.stations.length - 1 ? 'Final Packaging' : 'Assembly Unit'}
                           </span>
                         </div>
                      </motion.div>
                   ))}
                </div>
             </div>

             <div style={{ padding: '1.2rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button 
                  onClick={() => setIsSimulating(!isSimulating)}
                  style={{ 
                    width: '100%', padding: '1rem', 
                    background: isSimulating ? 'var(--accent-danger)' : 'var(--accent-primary)',
                    color: '#fff', border: 'none', borderRadius: '8px', 
                    fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    boxShadow: `0 4px 0 ${isSimulating ? '#991b1b' : '#0f766e'}`
                  }}
                >
                  {isSimulating ? <Square size={16} fill="#fff"/> : <Play size={16} fill="#fff"/>}
                  {isSimulating ? 'STOP RUN' : 'START LINE SIMULATION'}
                </button>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', cursor: 'pointer' }}>
                     DRAW FLOW PATHS
                     <input type="checkbox" checked={showArrows} onChange={(e) => setShowArrows(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
                  </label>
                </div>
             </div>
         </div>

         <div style={{ flex: 1, position: 'relative', background: 'var(--bg-main)', padding: '1rem' }}>
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.4rem 1rem', display: 'flex', justifyContent: 'space-between', zIndex: 20, borderRadius: '4px', fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.5px' }}>
               <span>ORTHOGRAPHIC VIEWPORT [X: 1200 | Y: 800]</span>
               <span>STATUS: {isSimulating ? 'SIMULATION ACTIVE' : 'IDLE'}</span>
            </div>

            <div style={gridStyle}>
               <AnimatePresence>
                 {isSimulating && activeStationIdx !== -1 && (
                    <motion.div 
                      key="virtual-unit"
                      layoutId="virtual-unit"
                      initial={false}
                      animate={{ 
                        left: parseInt(getStationStyle(activeStationIdx, optimization.stations.length).left) + 60,
                        top: parseInt(getStationStyle(activeStationIdx, optimization.stations.length).top) + 100,
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                      style={{ 
                        position: 'absolute', width: '40px', height: '40px', 
                        background: 'var(--accent-warning)', borderRadius: '6px', 
                        zIndex: 100, border: '2px solid #fff',
                        boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                       <Settings size={20} color="#fff" />
                    </motion.div>
                 )}
               </AnimatePresence>

               {optimization.stations.map((s, idx) => {
                  const targetStyle = getStationStyle(idx, optimization.stations.length);
                  const isActive = activeStationIdx === idx;
                  return (
                    <motion.div 
                      key={`station-${idx}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ 
                        opacity: 1, scale: 1,
                        left: targetStyle.left,
                        top: targetStyle.top,
                        borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-color)',
                        boxShadow: isActive ? '0 0 25px rgba(13, 148, 136, 0.2)' : '0 10px 20px rgba(0,0,0,0.05)'
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      style={targetStyle}
                    >
                       <div style={{ 
                         height: '40px', background: isActive ? 'var(--accent-primary)10' : 'var(--bg-secondary)', borderBottom: `1px solid var(--border-color)`,
                         display: 'flex', alignItems: 'center', padding: '0 12px', justifyContent: 'space-between'
                       }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--accent-primary)' }}>S{idx+1}</span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-sub)' }}>{s.time}min</span>
                       </div>

                       <div style={{ padding: '12px' }}>
                          <ul style={{ listStyle: 'none', margin: '0 0 8px 0', padding: 0, fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 600 }}>
                             {s.tasks.slice(0, 3).map(t => (
                                <li key={t.id} style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                                   <span style={{ color: 'var(--accent-primary)', fontWeight: 900 }}>{t.id}</span>
                                   <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                                </li>
                             ))}
                          </ul>
                          <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden', marginTop: 'auto', position: 'relative' }}>
                             <div className={isActive ? "caution-bar" : ""} style={{ height: '100%', width: `${(s.time / taktTime) * 100}%`, background: isActive ? 'none' : 'var(--accent-primary)', transition: 'width 0.5s ease' }} />
                          </div>
                       </div>
                    </motion.div>
                  );
               })}

               {showArrows && (
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                     <defs>
                       <marker id="flowArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                         <polygon points="0 0, 8 3, 0 6" fill="var(--accent-primary)" />
                       </marker>
                     </defs>
                     <AnimatePresence mode="wait">
                        {layoutType === 'u-shape' && (
                           <motion.g key="u-arrows" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              {uShapeFlowPaths.map((d, i) => (
                                 <React.Fragment key={`path-${i}`}>
                                    <motion.path 
                                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: i * 0.1 }}
                                      d={d} stroke="var(--text-sub)" strokeWidth="2" strokeDasharray="4,4" opacity="0.3" markerEnd="url(#flowArrow)" 
                                    />
                                    <motion.path 
                                      animate={{ strokeDashoffset: [20, 0] }}
                                      transition={{ repeat: Infinity, ease: "linear", duration: 0.8 }}
                                      d={d} stroke="var(--accent-primary)" strokeWidth="3" strokeDasharray="4, 16"
                                    />
                                 </React.Fragment>
                              ))}
                           </motion.g>
                        )}
                     </AnimatePresence>
                  </svg>
               )}
            </div>
         </div>
      </div>
    </motion.div>
  );
};

export default FloorLayout;
