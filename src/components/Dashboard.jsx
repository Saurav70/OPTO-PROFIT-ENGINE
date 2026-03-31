import React from 'react';
import { Activity, Network, Box, Grid, TrendingUp, Settings, Save, Info } from 'lucide-react';
import { calculateTaktTime, calculateNmin, runOptimization } from '../utils/optimizer';

const Dashboard = ({ tasks, config, setConfig, onNavigate }) => {
  const taktTime = calculateTaktTime(config.shiftTime, config.demand);
  const nMin = calculateNmin(tasks, taktTime);
  const totalTime = tasks.reduce((sum, t) => sum + t.time, 0);
  const optimization = runOptimization(tasks, taktTime);

  // Gauge angle: maps efficiency 0-100 to 0-180 degrees
  const effValue = parseFloat(optimization.efficiency);
  const gaugeAngle = Math.min((effValue / 100) * 180, 180);

  const navCards = [
    { id: 'network', icon: Network, label: 'Precedence Network', sub: 'Configure Map · Save Workflow · Generate Graph', color: 'var(--accent-primary)' },
    { id: 'conceptual', icon: Box, label: 'Conceptual Layout', sub: 'Initial manufacturing flow diagram', color: 'var(--accent-warning)' },
    { id: 'floor', icon: Grid, label: 'Factory Floor Layout', sub: '2D/3D rendering with flow arrows', color: 'var(--accent-secondary)' },
    { id: 'financials', icon: TrendingUp, label: 'Financial Performance', sub: 'ROI calculators and projections', color: '#a78bfa' },
  ];

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-sub)' }}>
          PROCESS SETUP & PRODUCT DEFINITION DASHBOARD
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-sub)' }}>
          <span style={{ cursor: 'pointer' }}>Operations</span>
          <span style={{ cursor: 'pointer' }}>📊 Reports</span>
          <span 
            onClick={() => onNavigate('planning')}
            style={{ cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}
            onMouseEnter={(e) => e.target.style.color = 'var(--text-white)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-sub)'}
          >⚙️ Settings</span>
        </div>
      </div>

      {/* TEIRAC Branding */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '0.3rem' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #007d8a, #64ffda)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.55rem', color: '#fff' }}>TE</div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '2px' }}>TEIRAC</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-sub)', letterSpacing: '1px' }}>TEIRAC Private Limited</p>
      </div>

      {/* Main 2-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Section 1: Product Definition */}
        <div className="glass" style={{ padding: '1.8rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }}>1.</span>PRODUCT DEFINITION
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Product Name</label>
              <input 
                value={config.productName}
                onChange={(e) => setConfig({ ...config, productName: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', padding: '0.7rem', borderRadius: '6px', color: 'var(--text-white)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Target Daily Demand (Units) 🎯</label>
              <input 
                type="number" value={config.demand}
                onChange={(e) => setConfig({ ...config, demand: parseInt(e.target.value) || 0 })}
                style={{ width: '80px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', padding: '0.7rem', borderRadius: '6px', color: 'var(--text-white)', textAlign: 'center', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Available Shift Operational Time (Minutes) 🕐</label>
              <input 
                type="number" value={config.shiftTime}
                onChange={(e) => setConfig({ ...config, shiftTime: parseInt(e.target.value) || 0 })}
                style={{ width: '80px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', padding: '0.7rem', borderRadius: '6px', color: 'var(--text-white)', textAlign: 'center', outline: 'none' }}
              />
            </div>
            <button
              onClick={() => onNavigate('planning')}
              style={{ width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg, #0a192f, #162447)', color: 'var(--text-white)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Settings size={16} /> DEFINE PROCESS & SAVE
            </button>
          </div>
        </div>

        {/* Section 2: Optimization Targets */}
        <div className="glass" style={{ padding: '1.8rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }}>2.</span>OPTIMIZATION TARGETS
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {/* Takt Time Gauge */}
            <div style={{ position: 'relative', width: '160px', height: '100px', flexShrink: 0 }}>
              <svg width="160" height="100" viewBox="0 0 160 100">
                {/* Background arc */}
                <path d="M 15 90 A 65 65 0 0 1 145 90" fill="none" stroke="var(--bg-tertiary)" strokeWidth="14" strokeLinecap="round" />
                {/* Value arc */}
                <path d="M 15 90 A 65 65 0 0 1 145 90" fill="none"
                  stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${(effValue / 100) * 204} 204`}
                />
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f56565" />
                    <stop offset="50%" stopColor="#f6ad55" />
                    <stop offset="100%" stopColor="#64ffda" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: 'absolute', bottom: '0', width: '100%', textAlign: 'center' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-sub)' }}>Takt Time</span>
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>Target Production Pace</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{taktTime} mins/unit</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>Actual Bottleneck Cycle Time</span>
                <span style={{ fontWeight: 700 }}>{optimization.actualCycleTime || 0} mins</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>Calculated Minimum Workstations</span>
                <span style={{ fontWeight: 700 }}>{nMin}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>Total Cumulative Process Time</span>
                <span style={{ fontWeight: 700 }}>{totalTime} mins</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>Line Efficiency</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{optimization.efficiency}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(3, 1fr)', gap: '1rem' }}>
        {/* Precedence Network - larger card */}
        <div 
          className="glass" 
          onClick={() => onNavigate('network')}
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--accent-primary)', marginRight: '0.3rem' }}>3.</span>PRECEDENCE NETWORK DIAGRAM
          </h4>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {['Configure Map', 'Save Workflow', 'Generate Graph'].map((action, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-sub)' }}>
                <div style={{ width: '24px', height: '24px', background: 'rgba(100,255,218,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={12} color="var(--accent-primary)" />
                </div>
                {action}
              </div>
            ))}
          </div>
        </div>

        {/* Remaining 3 cards */}
        {navCards.slice(1).map(card => (
          <div 
            key={card.id} className="glass"
            onClick={() => onNavigate(card.id)}
            style={{ padding: '1.5rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.8rem' }}
          >
            <div style={{ padding: '0.8rem', background: `${card.color}10`, borderRadius: '10px' }}>
              <card.icon size={22} color={card.color} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700 }}>{card.num || ''}. {card.label.toUpperCase()}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
