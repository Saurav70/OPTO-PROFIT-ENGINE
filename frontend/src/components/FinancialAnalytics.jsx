import React, { useEffect, useState } from 'react';
import { IndianRupee, ArrowUpRight, Package, Activity, ToggleLeft, ToggleRight, FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateROI } from '../utils/optimizer';
import { formatCurrency, getVariableValue } from '../utils/formulaEngine';
import { api } from '../services/api';

const FinancialAnalytics = ({ tasks, config, optimization }) => {
  const [liveChart, setLiveChart] = useState(false);
  const [serverRoi, setServerRoi] = useState(null);

  const localRoi = calculateROI(tasks, config, optimization || {});
  const roi = serverRoi || localRoi;
  
  const variables = config?.variables || [];
  const workDays = getVariableValue(variables, 'work_days', 25);
  const paybackLabel = roi.paybackMonths > 0 ? `${roi.paybackMonths.toFixed(1)} mo` : 'N/A';

  const handlePdfExport = () => {
    window.print();
  };

  const handleCsvExport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Monthly Profit', roi.monthlyProfit || 0],
      ['Profit Increase', roi.profitIncrease || 0],
      ['Baseline Monthly Profit', roi.baselineMonthlyProfit || 0],
      ['Optimized Monthly Profit', roi.optimizedMonthlyProfit || roi.monthlyProfit || 0],
      ['Baseline Daily Production', roi.baselineDailyProduction || 0],
      ['Optimized Daily Production', roi.dailyProduction || 0],
      ['Baseline Labor Cost', roi.baselineLaborCost || 0],
      ['Optimized Labor Cost', roi.optimizedLaborCost || 0],
      ['Investment Cost', roi.investmentCost || 0],
      ['Payback Months', roi.paybackMonths || 0],
      ['Line Efficiency', optimization?.efficiency || '0.00'],
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financial_report_${(config?.productName || 'optoprofit').toLowerCase().replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  useEffect(() => {
    let cancelled = false;
    api.post('/api/analytics/roi', { tasks, config, optimization: optimization || {} })
      .then((data) => {
        if (!cancelled) setServerRoi(data);
      })
      .catch(() => {
        if (!cancelled) setServerRoi(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tasks, config, optimization]);

  // ── Baseline State (Unoptimized) ──
  // For simplicity in this view, we compare against a fixed legacy baseline
  const baselineProfit = roi.monthlyProfit - roi.profitIncrease;

  // ── Dynamic Chart Data (12 months, cumulative) ──
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const baselineCumulative = months.map(m => baselineProfit * m);
  const optimizedCumulative = months.map(m => roi.monthlyProfit * m);
  const maxVal = Math.max(...optimizedCumulative, 1);

  // Map data points to SVG coords within viewBox 0 0 1000 240
  const toSvgX = (monthIdx) => (monthIdx / 11) * 940 + 30;
  const toSvgY = (val) => 220 - (Math.max(0, val) / maxVal) * 200;

  const optimizedPoints = months.map((_, i) => `${toSvgX(i)},${toSvgY(optimizedCumulative[i])}`).join(' ');
  const baselinePoints = months.map((_, i) => `${toSvgX(i)},${toSvgY(baselineCumulative[i])}`).join(' ');
  const optimizedArea = `${toSvgX(0)},220 ${optimizedPoints} ${toSvgX(11)},220`;

  const stats = [
    { label: 'ANNUAL PROJECTED PROFIT', val: formatCurrency(roi.monthlyProfit * 12, variables), icon: IndianRupee, color: 'var(--accent-primary)' },
    { label: 'LINE EFFICIENCY', val: `${optimization?.efficiency || '0.00'}%`, icon: Activity, color: 'var(--accent-secondary)' },
    { label: 'BASELINE MONTHLY PROFIT', val: formatCurrency(roi.baselineMonthlyProfit || 0, variables), icon: Package, color: '#0891b2' },
    { label: 'PAYBACK PERIOD', val: paybackLabel, icon: ArrowUpRight, color: 'var(--accent-warning)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-main)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }}
    >
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem 0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>

          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>FINANCIAL ANALYTICS</h2>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handlePdfExport} className="btn-outline" style={{ padding: '0.55rem 0.9rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <FileText size={14} /> PDF
          </button>
          <button onClick={handleCsvExport} className="btn-outline" style={{ padding: '0.55rem 0.9rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Download size={14} /> EXCEL CSV
          </button>
        </div>
      </div>

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>

        {/* Metric Strip */}
        <div className="kpi-grid">
          {stats.map((m, i) => (
            <div key={i} style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', borderLeft: `4px solid ${m.color}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <m.icon size={16} color={m.color} />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)', letterSpacing: '0.5px' }}>{m.label}</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-white)' }}>{m.val}</div>
            </div>
          ))}
        </div>

        <div className="grid-2fr-1fr">

          {/* Profitability Chart Panel */}
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
            <div style={{ padding: '1.2rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-white)' }}>PROFITABILITY FORECAST</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Optimized (Solid) vs Baseline (Dashed) Projection</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setLiveChart(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: liveChart ? 'var(--accent-primary)' : 'var(--card-bg)', border: `1px solid ${liveChart ? 'var(--accent-primary)' : 'var(--border-color)'}`, color: liveChart ? '#fff' : 'var(--text-sub)', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {liveChart ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                LIVE DATA
              </motion.button>
            </div>

            <div style={{ padding: '2.5rem', flex: 1, position: 'relative' }}>
              <div style={{ width: '100%', height: '240px', borderBottom: '2px solid var(--border-color)', borderLeft: '2px solid var(--border-color)', position: 'relative' }}>
                <svg width="100%" height="100%" viewBox="0 0 1000 240" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="profitGradientLive" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: 'var(--accent-primary)', stopOpacity: 0.25 }} />
                      <stop offset="100%" style={{ stopColor: 'var(--accent-primary)', stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                  {/* Baseline dashed */}
                  <polyline points={baselinePoints} fill="none" stroke="var(--text-sub)" strokeWidth="2" strokeDasharray="6,4" opacity="0.5" />
                  {/* Optimized area fill */}
                  <polygon points={optimizedArea} fill="url(#profitGradientLive)" />
                  {/* Optimized line */}
                  <polyline points={optimizedPoints} fill="none" stroke="var(--accent-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Data point dots */}
                  {months.map((_, i) => (
                    <circle key={i} cx={toSvgX(i)} cy={toSvgY(optimizedCumulative[i])} r="5" fill="var(--card-bg)" stroke="var(--accent-primary)" strokeWidth="2" />
                  ))}
                </svg>

                {/* Y-axis labels */}
                <div style={{ position: 'absolute', top: '10px', left: '-50px', fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 800 }}>
                  {formatCurrency(maxVal, variables)}
                </div>
                <div style={{ position: 'absolute', bottom: '0', left: '-50px', fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 800 }}>{formatCurrency(0, variables)}</div>
              </div>

              {/* X-axis labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 800 }}>
                {months.filter((_, i) => i % 2 === 0).map(m => <span key={m}>MONTH {m}</span>)}
              </div>
            </div>
          </div>

          {/* ROI Metrics Panel */}
          <div style={{ background: 'var(--sidebar-bg)', borderRadius: '12px', padding: '1.5rem', color: '#fff', display: 'flex', flexDirection: 'column', gap: '1.5rem', transition: 'all 0.3s ease' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>ROI METRICS</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Incremental Growth Analysis</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IndianRupee size={14} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.5px' }}>NET MONTHLY PROFIT</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-white)' }}>{formatCurrency(roi.monthlyProfit, variables)} <sub style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>/ Mo</sub></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowUpRight size={14} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.5px' }}>OPTIMIZATION LIFT</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-primary)' }}>+{formatCurrency(roi.profitIncrease, variables)} <sub style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>/ Mo</sub></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={14} color="var(--accent-secondary)" />
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '0.5px' }}>DAILY THROUGHPUT</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-white)' }}>{roi.dailyProduction} <sub style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Units</sub></div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', background: 'rgba(13, 148, 136, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Activity size={14} color="#ccfbf1" />
                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ccfbf1' }}>MODEL CONFIDENCE</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.4, color: '#ccfbf1', fontWeight: 600 }}>
                Based on dynamic formula evaluation with current production variables.
              </p>
            </div>
          </div>
        </div>

        {/* Operational Cost Audit */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', transition: 'all 0.3s ease' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)' }}>OPERATIONAL COST AUDIT</h4>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-sub)' }}>{new Date().toLocaleDateString()}</div>
          </div>
          <div className="audit-grid">
            {[
              { label: 'LABOR EFFICIENCY', val: `${optimization?.efficiency || '0.00'}%`, status: 'OPTIMAL' },
              { label: 'BALANCE DELAY', val: `${optimization?.balanceDelay || '0.00'}%`, status: 'REDUCED' },
              { label: 'DAILY PROFIT DELTA', val: `+${formatCurrency(roi.profitIncrease / workDays, variables)}`, status: 'POSITIVE' },
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
