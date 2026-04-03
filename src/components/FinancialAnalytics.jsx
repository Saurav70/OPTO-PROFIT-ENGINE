import React from 'react';
import { DollarSign, TrendingUp, BarChart2, PieChart, Cpu, ArrowUpRight, Clock, Package, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateTaktTime, runOptimization } from '../utils/optimizer';

const FinancialAnalytics = ({ tasks, config }) => {
  const taktTime = calculateTaktTime(config.shiftTime, config.demand);
  const optimization = runOptimization(tasks, taktTime);

  // Baseline Formulations (Current Inefficient State)
  const baselineCycleTime = config.currentCycleTime || 35;
  const baselineDailyProd = Math.floor(config.shiftTime / baselineCycleTime);
  const baselineMonthlyProfit = baselineDailyProd * config.workDaysPerMonth * (config.unitPrice - config.unitCost);
  const baselineMonthlyRev = baselineDailyProd * config.workDaysPerMonth * config.unitPrice;
  const totalTaskTime = tasks.reduce((sum, t) => sum + t.time, 0);
  const baselineIdleTimePerCycle = (6 * baselineCycleTime) - totalTaskTime; // assuming 6 stations baseline

  // Optimized Formulations (Balanced State)
  // We use the bottleneck (actualCycleTime) to determine true production capacity
  const optCycleTime = optimization.actualCycleTime || taktTime;
  const optDailyProd = Math.floor(config.shiftTime / optCycleTime);
  const optMonthlyRev = optDailyProd * config.workDaysPerMonth * config.unitPrice;
  const optMonthlyProfit = optDailyProd * config.workDaysPerMonth * (config.unitPrice - config.unitCost);

  // ROI Deltas
  const profitIncrease = optMonthlyProfit - baselineMonthlyProfit;
  const revenueIncrease = optMonthlyRev - baselineMonthlyRev;
  const extraUnitsMonthly = (optDailyProd - baselineDailyProd) * config.workDaysPerMonth;
  const recoveredIdleTimePerShift = (baselineIdleTimePerCycle * baselineDailyProd) - (optimization.totalIdleTime * optDailyProd);

  const stats = [
    { label: 'PROJECTED REVENUE', val: `$${(optMonthlyRev * 12 / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'var(--accent-primary)' },
    { label: 'MONTHLY PROFIT', val: `$${(optMonthlyProfit / 1000).toFixed(0)}K`, icon: BarChart2, color: 'var(--accent-secondary)' },
    { label: 'PROFIT DELTA', val: `+$${(profitIncrease / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'var(--accent-primary)' },
    { label: 'LINE EFFICIENCY', val: `${optimization.efficiency}%`, icon: Activity, color: 'var(--accent-primary)' }
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
      <div style={{ padding: '1.5rem 2rem 0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sub)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px' }}>
            <Cpu size={12} />
            MODULE 07
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>FINANCIAL ANALYTICS</h2>
        </div>
      </div>



      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
        
        {/* Metric Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          {stats.map((m, i) => (
            <div key={i} style={{ 
              background: 'var(--card-bg)', 
              padding: '1.5rem', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              borderLeft: `4px solid ${m.color}`,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <m.icon size={16} color={m.color} />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)', letterSpacing: '0.5px' }}>{m.label}</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-white)' }}>{m.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Main Projection Chart Panel */}
          <div style={{ 
            background: 'var(--card-bg)', 
            borderRadius: '12px', 
            border: '1px solid var(--border-color)', 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ padding: '1.2rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-white)' }}>PROFITABILITY FORECAST</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Optimized (Solid) vs Baseline (Dashed) Projection</p>
               </div>
               <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={{ padding: '6px 12px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-white)', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>Quarterly</button>
                  <button style={{ padding: '6px 12px', background: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', color: '#fff', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>Monthly</button>
               </div>
            </div>

            <div style={{ padding: '2.5rem', flex: 1, position: 'relative' }}>
               <div style={{ width: '100%', height: '240px', borderBottom: '2px solid var(--border-color)', borderLeft: '2px solid var(--border-color)', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 1000 240" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'var(--accent-primary)', stopOpacity: 0.2 }} />
                        <stop offset="100%" style={{ stopColor: 'var(--accent-primary)', stopOpacity: 0 }} />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M 0 220 Q 200 210, 400 200 T 800 180 T 1000 170" 
                      fill="none" stroke="var(--text-sub)" strokeWidth="2" strokeDasharray="6,4" opacity="0.5"
                    />
                    <path 
                      d="M 0 200 Q 100 180, 200 190 T 400 140 T 600 100 T 800 60 T 1000 20" 
                      fill="none" stroke="var(--accent-primary)" strokeWidth="4" 
                    />
                    <path 
                      d="M 0 200 Q 100 180, 200 190 T 400 140 T 600 100 T 800 60 T 1000 20 L 1000 240 L 0 240 Z" 
                      fill="url(#profitGradient)" 
                    />
                    {[0, 200, 400, 600, 800, 1000].map(x => (
                      <circle key={x} cx={x} cy={200 - (x/5)} r="5" fill="var(--card-bg)" stroke="var(--accent-primary)" strokeWidth="2" />
                    ))}
                  </svg>
                  <div style={{ position: 'absolute', top: '10px', left: '-40px', fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 800 }}>$1.2M</div>
                  <div style={{ position: 'absolute', bottom: '0', left: '-40px', fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 800 }}>$0</div>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 800 }}>
                  <span>MONTH 1</span>
                  <span>MONTH 3</span>
                  <span>MONTH 6</span>
                  <span>MONTH 9</span>
                  <span>MONTH 12</span>
               </div>
            </div>
          </div>

          {/* Efficiency Impact Panel */}
          <div style={{ 
            background: 'var(--sidebar-bg)', 
            borderRadius: '12px', 
            padding: '1.5rem', 
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            transition: 'all 0.3s ease'
          }}>
             <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>ROI METRICS</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Incremental Growth Analysis</p>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <DollarSign size={14} color="var(--accent-primary)" />
                     <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.5px' }}>REVENUE LIFT</span>
                   </div>
                   <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0dcaf0' }}>+${(revenueIncrease / 1000).toFixed(1)}K <sub style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>/ Mo</sub></div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <Package size={14} color="var(--accent-secondary)" />
                     <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.5px' }}>ADDITIONAL THROUGHPUT</span>
                   </div>
                   <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-primary)' }}>+{extraUnitsMonthly} <sub style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Units</sub></div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <Clock size={14} color="var(--accent-warning)" />
                     <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.5px' }}>RECOVERED IDLE TIME</span>
                   </div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-warning)', marginTop: '4px' }}>{recoveredIdleTimePerShift.toFixed(0)} MINS <sub style={{ fontSize: '0.7rem', opacity: 0.5 }}>/ Shift</sub></div>
                </div>
             </div>

             <div style={{ marginTop: 'auto', background: 'rgba(13, 148, 136, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                   <ArrowUpRight size={14} color="#ccfbf1" />
                   <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ccfbf1' }}>SYSTEM INSIGHT</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.4, color: '#ccfbf1', fontWeight: 600 }}>
                   Balance Delay is reduced to {optimization.balanceDelay}%, indicating near-perfect load distribution.
                </p>
             </div>
          </div>
        </div>

        {/* Detailed Breakdown List */}
        <div style={{ 
          background: 'var(--card-bg)', 
          borderRadius: '12px', 
          border: '1px solid var(--border-color)', 
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
           <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)' }}>OPERATIONAL COST AUDIT - FY2026</h4>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>VIEW FULL LOG</button>
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border-color)' }}>
              {[
                { label: 'LABOR EFFICIENCY', val: `${optimization.efficiency}%`, status: 'OPTIMAL' },
                { label: 'BALANCE DELAY', val: `${optimization.balanceDelay}%`, status: 'REDUCED' },
                { label: 'DAILY REVENUE DELTA', val: `+$${((revenueIncrease / config.workDaysPerMonth)).toFixed(0)}`, status: 'POSITIVE' }
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--card-bg)', padding: '1.5rem' }}>
                   <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-sub)', letterSpacing: '1px' }}>{item.label}</span>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-white)' }}>{item.val}</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--accent-primary)', background: 'var(--accent-primary)20', padding: '2px 8px', borderRadius: '10px' }}>{item.status}</span>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FinancialAnalytics;
