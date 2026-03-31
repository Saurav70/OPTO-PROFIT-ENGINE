import React from 'react';
import { Package, Clock, DollarSign, Download, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateTaktTime, runOptimization } from '../utils/optimizer';

const FinancialAnalytics = ({ tasks, config }) => {
  const taktTime = calculateTaktTime(config.shiftTime, config.demand);
  const optimization = runOptimization(tasks, taktTime);

  // Baseline Formulations (Current Inefficient State)
  const baselineCycleTime = config.currentCycleTime || 35;
  const baselineOperators = config.currentOperators || 6;
  const baselineDailyProd = Math.floor(config.shiftTime / baselineCycleTime);
  const totalTaskTime = tasks.reduce((sum, t) => sum + t.time, 0);
  
  const baselineTotalCycleUsed = baselineOperators * baselineCycleTime;
  const baselineEfficiency = baselineTotalCycleUsed > 0 ? (totalTaskTime / baselineTotalCycleUsed) * 100 : 0;
  const baselineIdlePerCycle = baselineTotalCycleUsed - totalTaskTime;
  
  const baselineMonthlyRev = baselineDailyProd * config.workDaysPerMonth * config.unitPrice;
  const baselineMonthlyProfit = baselineDailyProd * config.workDaysPerMonth * (config.unitPrice - config.unitCost);

  // Optimized Formulations (Balanced State)
  const optCycleTime = optimization.actualCycleTime || taktTime;
  const optOperators = optimization.stations.length;
  const optDailyProd = Math.floor(config.shiftTime / optCycleTime);
  const optMonthlyRev = optDailyProd * config.workDaysPerMonth * config.unitPrice;
  const optMonthlyProfit = optDailyProd * config.workDaysPerMonth * (config.unitPrice - config.unitCost);

  // ROI Deltas
  const profitIncrease = optMonthlyProfit - baselineMonthlyProfit;
  const revenueIncrease = optMonthlyRev - baselineMonthlyRev;
  const extraUnitsMonthly = (optDailyProd - baselineDailyProd) * config.workDaysPerMonth;
  // Compare total minutes wasted per shift
  const baselineShiftIdle = baselineIdlePerCycle * baselineDailyProd;
  const optShiftIdle = (optimization.totalIdleTime || 0) * optDailyProd;
  const recoveredIdleTime = Math.max(0, baselineShiftIdle - optShiftIdle);

  const chartData = [
    { name: 'Current', revenue: baselineMonthlyRev, profit: baselineMonthlyProfit },
    { name: 'Optimized', revenue: optMonthlyRev, profit: optMonthlyProfit },
  ];

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>FINANCIAL ROI DASHBOARD</h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '1.1rem' }}>Dynamically calculated based on rigorous shift modeling (Units: minutes, USD).</p>
        </div>
      </header>

      {/* 3-Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(400px, 2fr) minmax(280px, 1fr)', gap: '1rem', flex: 1, minHeight: 0 }}>
         
         {/* Left Panel: Current State */}
         <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
            <h3 style={{ margin: 0, padding: '0.8rem', background: '#3182ce', color: '#fff', textAlign: 'center', borderRadius: '4px', fontSize: '1rem' }}>CURRENT STATE (BASELINE)</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(237, 137, 54, 0.2)', color: '#ed8936', textAlign: 'center', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem' }}>
              Unbalanced, High Idle Time
            </div>
            
            <div style={{ height: '220px', border: '1px solid var(--glass-border)', borderRadius: '8px', position: 'relative', background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'var(--text-sub)' }}>
                  <Package size={40} opacity={0.5} style={{ margin: '0 auto 0.5rem auto' }}/>
                  <p style={{ fontSize: '0.8rem' }}>Unoptimized Layout</p>
               </div>
               {/* Cross lines indicating chaos */}
               <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
                  <path d="M 50 40 L 150 140" stroke="#f56565" strokeWidth="2" opacity="0.6"/>
                  <path d="M 180 60 L 80 160" stroke="#f56565" strokeWidth="2" opacity="0.6"/>
                  <path d="M 60 150 L 180 150" stroke="#f56565" strokeWidth="2" strokeDasharray="4,4" opacity="0.6"/>
               </svg>
            </div>
            
            <h4 style={{ margin: '1rem 0 0 0', fontSize: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>PERFORMANCE METRICS</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
               <div style={{ background: '#2a4365', padding: '0.8rem', borderRadius: '4px', textAlign: 'center' }}>
                 <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.65rem', color: '#cbd5e0' }}>Operators:</p>
                 <strong style={{ fontSize: '1.4rem' }}>{baselineOperators}</strong>
               </div>
               <div style={{ background: '#2a4365', padding: '0.8rem', borderRadius: '4px', textAlign: 'center' }}>
                 <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.65rem', color: '#cbd5e0' }}>Cycle Time (m):</p>
                 <strong style={{ fontSize: '1.4rem' }}>{baselineCycleTime}</strong>
               </div>
               <div style={{ background: '#2a4365', padding: '0.8rem', borderRadius: '4px', textAlign: 'center' }}>
                 <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.65rem', color: '#cbd5e0' }}>Line Efficiency:</p>
                 <strong style={{ fontSize: '1.4rem', color: '#f56565' }}>{baselineEfficiency.toFixed(1)}%</strong>
               </div>
               <div style={{ background: '#2a4365', padding: '0.8rem', borderRadius: '4px', textAlign: 'center' }}>
                 <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.65rem', color: '#cbd5e0' }}>Daily Prod:</p>
                 <strong style={{ fontSize: '1.4rem' }}>{baselineDailyProd}</strong>
               </div>
            </div>
         </div>

         {/* Center Panel: ROI Analysis */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            <div className="glass" style={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1 }}>
               <h3 style={{ margin: 0, padding: '1rem', background: '#2b6cb0', color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>FINANCIAL ROI ANALYSIS (MONTHLY)</h3>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <div style={{ textAlign: 'center', background: 'rgba(100,255,218,0.05)', padding: '1.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: 'var(--text-white)' }}>Recovered Idle<br/>Time per Shift</p>
                    <Clock size={32} color="var(--accent-primary)" style={{ margin: '0 auto 1rem auto' }} />
                    <strong style={{ fontSize: '2rem', display: 'block', color: 'var(--accent-primary)' }}>{Math.floor(recoveredIdleTime)}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>MINUTES</span>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(100,255,218,0.05)', padding: '1.5rem 1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: 'var(--text-white)' }}>Additional Units<br/>Produced Monthly</p>
                    <Package size={32} color="#f6ad55" style={{ margin: '0 auto 1rem auto' }} />
                    <strong style={{ fontSize: '2rem', display: 'block', color: '#f6ad55' }}>+{extraUnitsMonthly}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>UNITS</span>
                  </div>
                   <div style={{ textAlign: 'center', background: 'rgba(72,187,120,0.1)', padding: '1.5rem 0.5rem', borderRadius: '8px', border: '1px solid var(--accent-success)', boxShadow: '0 0 15px rgba(72,187,120,0.2)' }}>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: 'var(--text-white)' }}>Estimated Revenue<br/>Unlocked</p>
                    <DollarSign size={32} color="#48bb78" style={{ margin: '0 auto 1rem auto' }} />
                    <strong style={{ fontSize: '1.8rem', display: 'block', color: '#48bb78' }}>+{formatCurrency(revenueIncrease)}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>/ Month</span>
                  </div>
               </div>

               <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flex: 1, alignItems: 'center' }}>
                  <div style={{ flex: 1, height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="var(--text-sub)" tick={{fill: 'var(--text-sub)', fontSize: 13}} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                          contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568', borderRadius: '8px', color: '#fff' }} 
                          formatter={(value) => formatCurrency(value)}
                        />
                        <Bar dataKey="revenue" stackId="a" fill="#4fd1c5" name="Revenue" />
                        <Bar dataKey="profit" stackId="a" fill="#68d391" name="Profit Margin" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ width: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                     <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-sub)', textAlign: 'center' }}>Projected Profit<br/>Increase</p>
                     <strong style={{ fontSize: '1.8rem', color: 'var(--text-white)', lineHeight: 1, margin: '0.5rem 0' }}>{formatCurrency(profitIncrease)}</strong>
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>/ Month</span>
                     <div style={{ marginTop: '1rem', padding: '0.3rem 0.8rem', background: 'rgba(72,187,120,0.2)', color: '#48bb78', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <ArrowUpRight size={14}/> ROI GROWTH
                     </div>
                  </div>
               </div>
            </div>
            
            <button style={{ width: '100%', padding: '1.2rem', background: 'linear-gradient(90deg, #2b6cb0, #3182ce)', border: '1px solid #4299e1', color: '#fff', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'filter 0.2s' }}>
               <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}><Download size={20}/> EXPORT REPORT (PDF)</span>
               <span style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>Includes Financial Math & Layout Details</span>
            </button>
         </div>

         {/* Right Panel: Optimized State */}
         <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
            <h3 style={{ margin: 0, padding: '0.8rem', background: '#2f855a', color: '#fff', textAlign: 'center', borderRadius: '4px', fontSize: '1rem' }}>OPTIMIZED STATE (BALANCED)</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(72, 187, 120, 0.2)', color: '#48bb78', textAlign: 'center', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem' }}>
              Balanced, Smooth Flow
            </div>
            
            <div style={{ height: '220px', border: '1px solid var(--accent-success)', borderRadius: '8px', position: 'relative', background: 'rgba(72, 187, 120, 0.05)', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#48bb78' }}>
                  <Package size={40} opacity={0.8} style={{ margin: '0 auto 0.5rem auto' }}/>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>Balanced U-Shape Flow</p>
               </div>
               {/* Arrows denoting flow */}
               <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
                  <path d="M 60 50 A 60 60 0 0 1 180 50" fill="none" stroke="#48bb78" strokeWidth="3" markerEnd="url(#arrow-opt)" opacity="0.6"/>
                  <path d="M 180 150 A 60 60 0 0 1 60 150" fill="none" stroke="#48bb78" strokeWidth="3" markerEnd="url(#arrow-opt)" opacity="0.6"/>
                  <defs>
                     <marker id="arrow-opt" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                       <polygon points="0 0, 8 4, 0 8" fill="#48bb78" />
                     </marker>
                  </defs>
               </svg>
            </div>
            
            <h4 style={{ margin: '1rem 0 0 0', fontSize: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>PERFORMANCE METRICS</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
               <div style={{ background: '#276749', padding: '0.8rem', borderRadius: '4px', textAlign: 'center' }}>
                 <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.65rem', color: '#c6f6d5' }}>Operators:</p>
                 <strong style={{ fontSize: '1.4rem', color: '#fff' }}>{optOperators}</strong>
               </div>
               <div style={{ background: '#276749', padding: '0.8rem', borderRadius: '4px', textAlign: 'center' }}>
                 <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.65rem', color: '#c6f6d5' }}>Cycle Time (m):</p>
                 <strong style={{ fontSize: '1.4rem', color: '#fff' }}>{optCycleTime}</strong>
               </div>
               <div style={{ background: '#276749', padding: '0.8rem', borderRadius: '4px', textAlign: 'center' }}>
                 <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.65rem', color: '#c6f6d5' }}>Line Efficiency:</p>
                 <strong style={{ fontSize: '1.4rem', color: '#68d391' }}>{optimization.efficiency}%</strong>
               </div>
               <div style={{ background: '#276749', padding: '0.8rem', borderRadius: '4px', textAlign: 'center' }}>
                 <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.65rem', color: '#c6f6d5' }}>Daily Prod:</p>
                 <strong style={{ fontSize: '1.4rem', color: '#fff' }}>{optDailyProd}</strong>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
};

export default FinancialAnalytics;
