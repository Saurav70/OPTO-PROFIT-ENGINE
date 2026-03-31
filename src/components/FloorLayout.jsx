import React, { useState } from 'react';
import { ArrowRight, CornerDownRight, RotateCcw } from 'lucide-react';
import { calculateTaktTime, runOptimization } from '../utils/optimizer';

const FloorLayout = ({ tasks, config }) => {
  const taktTime = calculateTaktTime(config.shiftTime, config.demand);
  const optimization = runOptimization(tasks, taktTime);

  const [layoutType, setLayoutType] = useState('u-shape'); // 'straight', 'u-shape', 'inefficient'
  const [showArrows, setShowArrows] = useState(true);
  const [highlightBacktrack, setHighlightBacktrack] = useState(true);

  // Generate grid background
  const gridStyle = {
    backgroundImage: `
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    backgroundColor: '#0f172a',
    position: 'relative',
    height: '100%',
    width: '100%',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    overflow: 'hidden'
  };

  const getMachineGraphic = (idx, total) => {
    if (idx === total - 1) return '/machine_packaging.png';
    if (idx === total - 2) return '/machine_testing.png';
    return '/machine_assembly.png';
  };

  // Helper to place stations based on layoutType
  const getStationStyle = (idx, total) => {
    const baseStyle = {
      position: 'absolute',
      width: '150px', // Wider to fit high-fi images better
      padding: '0.6rem',
      background: 'rgba(10, 25, 47, 0.95)',
      border: '1px solid var(--glass-border)',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
      transition: 'all 0.5s ease',
      zIndex: 10
    };

    // Calculate grid logic simply based on total. (Layout offsets customized for 150px width)
    if (layoutType === 'straight') {
      return { ...baseStyle, left: `${50 + idx * 180}px`, top: '180px' };
    } 
    
    if (layoutType === 'u-shape') {
      const half = Math.ceil(total / 2);
      if (idx < half) {
        return { ...baseStyle, left: `${60 + idx * 200}px`, top: '60px' };
      } else {
        const reverseIdx = total - idx - 1;
        return { ...baseStyle, left: `${60 + reverseIdx * 200}px`, top: '340px' };
      }
    }

    if (layoutType === 'inefficient') {
      const pos = [
        { left: '80px', top: '70px' },
        { left: '420px', top: '90px' },
        { left: '620px', top: '300px' },
        { left: '260px', top: '350px' },
        { left: '100px', top: '220px' },
      ];
      return { ...baseStyle, ...(pos[idx % pos.length] || { left: `${idx * 160}px`, top: '200px' }) };
    }

    return baseStyle;
  };

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Factory Floor Layout</h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '1.1rem' }}>High-fidelity 2D spatial simulation and path routing.</p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
         
         {/* Left Sidebar Layout Tools */}
         <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
             <div className="glass" style={{ padding: '1rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-white)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>LAYOUT TEMPLATES</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                   {['straight', 'u-shape', 'inefficient'].map(type => (
                      <button 
                        key={type}
                        onClick={() => setLayoutType(type)}
                        style={{ 
                          flex: 1, padding: '0.8rem 0.2rem', 
                          background: layoutType === type ? 'rgba(100,255,218,0.1)' : 'transparent', 
                          border: `1px solid ${layoutType === type ? 'var(--accent-primary)' : 'var(--glass-border)'}`, 
                          borderRadius: '6px', cursor: 'pointer', color: 'var(--text-white)', fontSize: '0.7rem',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                        }}
                      >
                         {type === 'straight' && <ArrowRight size={18} />}
                         {type === 'u-shape' && <CornerDownRight size={18} />}
                         {type === 'inefficient' && <RotateCcw size={18} />}
                         <span style={{ textTransform: 'capitalize' }}>{type.replace('-',' ')}</span>
                      </button>
                   ))}
                </div>
             </div>

             <div className="glass" style={{ padding: '1rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-white)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>STATIONS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                   {optimization.stations.map((s, idx) => (
                      <div key={idx} style={{ padding: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                         <div style={{ width: '30px', height: '30px', borderRadius: '4px', backgroundImage: `url(${getMachineGraphic(idx, optimization.stations.length)})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                         <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>STATION {idx + 1}</span>
                           <span style={{ fontSize: '0.75rem', color: 'var(--text-white)' }}>
                             {idx === optimization.stations.length - 1 ? 'Packaging' : idx === optimization.stations.length - 2 ? 'Testing' : 'Assembly'}
                           </span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             <div className="glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-white)', cursor: 'pointer' }}>
                    Auto-Draw Flow Arrows
                    <input type="checkbox" checked={showArrows} onChange={(e) => setShowArrows(e.target.checked)} />
                 </label>
                 <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-white)', cursor: 'pointer' }}>
                    Highlight Backtracking
                    <input type="checkbox" checked={highlightBacktrack} onChange={(e) => setHighlightBacktrack(e.target.checked)} />
                 </label>
             </div>
         </div>

         {/* Floor Grid Workspace */}
         <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', zIndex: 20, borderBottom: '1px solid var(--glass-border)', fontSize: '0.8rem', color: 'var(--text-sub)', backdropFilter: 'blur(4px)' }}>
               <span>FACTORY FLOOR GRID (Scale: 1 unit = 5m | Top-Down Orthographic)</span>
            </div>

            <div style={gridStyle}>
               {/* Label indicator for efficient vs inefficient */}
               {layoutType === 'u-shape' && (
                  <div style={{ position: 'absolute', top: '40px', left: '160px', background: 'rgba(72, 187, 120, 0.2)', color: '#48bb78', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #48bb78', fontWeight: 700, fontSize: '0.85rem' }}>
                     EFFICIENT LAYOUT (U-Shape)
                  </div>
               )}
               {layoutType === 'inefficient' && (
                  <div style={{ position: 'absolute', top: '40px', left: '340px', background: 'rgba(245, 101, 101, 0.2)', color: '#f56565', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #f56565', fontWeight: 700, fontSize: '0.85rem' }}>
                     INEFFICIENT AWKWARD LAYOUT
                  </div>
               )}

               {/* Stations */}
               {optimization.stations.map((s, idx) => {
                  const style = getStationStyle(idx, optimization.stations.length);
                  return (
                    <div key={idx} style={style}>
                       
                       {/* High-Fi Image Block */}
                       <div style={{ 
                         width: '100%', height: '80px', 
                         backgroundImage: `url(${getMachineGraphic(idx, optimization.stations.length)})`, 
                         backgroundSize: 'cover', backgroundPosition: 'center', 
                         borderRadius: '6px', marginBottom: '0.6rem', 
                         border: '1px solid rgba(100,255,218,0.2)', position: 'relative' 
                       }}>
                          <div style={{ position: 'absolute', top: '0', left: '0', background: 'var(--accent-primary)', padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: 900, color: '#000', borderBottomRightRadius: '6px', borderTopLeftRadius: '5px' }}>
                             STAT-{idx+1}
                          </div>
                          
                          {/* Machine Name Tooltip/Badge */}
                          <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.8)', padding: '2px 6px', fontSize: '0.55rem', color: '#fff', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                             {idx === optimization.stations.length - 1 ? 'PACKAGING EQ.' : idx === optimization.stations.length - 2 ? 'DIAGNOSTIC RIG' : 'SMT BENCH'}
                          </div>
                       </div>

                       <ul style={{ listStyle: 'none', margin: '0 0 0.4rem 0', padding: 0, fontSize: '0.7rem', color: 'var(--text-white)' }}>
                          {s.tasks.slice(0, 2).map(t => (
                             <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span><strong style={{ color: 'var(--accent-primary)' }}>{t.id}</strong> {t.name.split(' ')[0]}</span>
                                <span>{t.time}m</span>
                             </li>
                          ))}
                          {s.tasks.length > 2 && <li style={{ textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.6rem' }}>+{s.tasks.length - 2} more tasks</li>}
                       </ul>
                       <div style={{ borderTop: '1px dashed var(--glass-border)', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-sub)' }}>Total Cycle:</span>
                          <strong>{s.time}m</strong>
                       </div>
                    </div>
                  );
               })}

               {/* Arrows (simplified SVG overlay adapted for new 150px cards) */}
               {showArrows && (
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                     <defs>
                       <marker id="flowArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                         <polygon points="0 0, 10 3.5, 0 7" fill={layoutType === 'inefficient' && highlightBacktrack ? 'var(--accent-danger)' : 'var(--accent-primary)'} />
                       </marker>
                     </defs>
                     {/* Drawing basic flow lines depending on layout */}
                     {layoutType === 'u-shape' && (
                        <>
                           <path d="M 210 120 L 260 120" stroke="var(--accent-primary)" strokeWidth="4" markerEnd="url(#flowArrow)" opacity="0.8" />
                           <path d="M 410 120 L 460 120" stroke="var(--accent-primary)" strokeWidth="4" markerEnd="url(#flowArrow)" opacity="0.8" />
                           <path d="M 535 200 L 535 340" stroke="var(--accent-primary)" strokeWidth="4" markerEnd="url(#flowArrow)" opacity="0.8" />
                           <path d="M 460 380 L 410 380" stroke="var(--accent-primary)" strokeWidth="4" markerEnd="url(#flowArrow)" opacity="0.8" />
                           <path d="M 260 380 L 210 380" stroke="var(--accent-primary)" strokeWidth="4" markerEnd="url(#flowArrow)" opacity="0.8" />
                           <text x="260" y="250" fill="var(--accent-primary)" fontSize="14" fontWeight="bold">SMOOTH MATERIAL FLOW</text>
                        </>
                     )}
                     {layoutType === 'inefficient' && (
                        <>
                           <path d="M 230 120 L 420 120" stroke="var(--accent-danger)" strokeWidth="4" markerEnd="url(#flowArrow)" opacity="0.8" />
                           <path d="M 500 240 L 250 240" stroke="var(--accent-danger)" strokeWidth="4" strokeDasharray="5,5" markerEnd="url(#flowArrow)" opacity="0.8" />
                           <path d="M 180 340 L 250 400" stroke="var(--accent-danger)" strokeWidth="4" markerEnd="url(#flowArrow)" opacity="0.8" />
                           <path d="M 410 400 L 620 350" stroke="var(--accent-danger)" strokeWidth="4" markerEnd="url(#flowArrow)" opacity="0.8" />
                           
                           {highlightBacktrack && (
                              <text x="280" y="270" fill="var(--accent-danger)" fontSize="14" fontWeight="bold">BACKTRACKING!</text>
                           )}
                        </>
                     )}
                  </svg>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default FloorLayout;
