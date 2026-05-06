import React, { useState } from 'react';
import { Activity, Network, Box, Grid, TrendingUp, Save, Info, Cpu, Printer, AlertTriangle, Trash2, FolderOpen, Plus, DollarSign, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateTaktTime, calculateNmin, calculateROI, calculateCriticalPath } from '../utils/optimizer';
import { formatCurrency, getVariable } from '../utils/formulaEngine';
import FormulaEditor from './FormulaEditor';

const Dashboard = ({ tasks, config, setConfig, onNavigate, profiles, activeProfileId, onSaveProfile, onLoadProfile, onDeleteProfile, optimization }) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [editingFormulaKey, setEditingFormulaKey] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('variables'); // 'variables' or 'formulas'

  const variables = config?.variables || [];
  const formulas = config?.formulas || {};

  const taktTime = calculateTaktTime(config);
  const nMin = calculateNmin(tasks, taktTime);
  const totalTime = tasks.reduce((sum, t) => sum + t.time, 0);
  const roi = calculateROI(tasks, config, optimization || {});
  const { criticalStation } = calculateCriticalPath(tasks, optimization?.stations || []);

  const effValue = parseFloat(optimization?.efficiency || '0');
  const isLowEfficiency = effValue < 70;

  const handlePrintReport = () => { window.print(); };

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;
    onSaveProfile(newProfileName);
    setNewProfileName('');
  };

  const updateVariableField = (key, field, newValue) => {
    const newVariables = variables.map(v => {
      if (v.key === key) {
        return { ...v, [field]: field === 'value' ? parseFloat(newValue) : newValue };
      }
      return v;
    });
    setConfig({ ...config, variables: newVariables });
  };

  const addVariable = () => {
    const key = `var_${Date.now()}`;
    const newVar = { key, label: 'New Variable', value: 0, unit: 'units', category: 'General' };
    setConfig({ ...config, variables: [...variables, newVar] });
  };

  const deleteVariable = (key) => {
    setConfig({ ...config, variables: variables.filter(v => v.key !== key) });
  };

  const saveFormula = (formula) => {
    setConfig({ ...config, formulas: { ...formulas, [editingFormulaKey]: formula } });
    setEditingFormulaKey(null);
  };

  const addFormula = () => {
    const key = prompt('Enter a name for the new mathematical rule:');
    if (key && !formulas[key]) {
      setConfig({ ...config, formulas: { ...formulas, [key]: '0' } });
      setEditingFormulaKey(key);
    } else if (formulas[key]) {
      alert('A rule with this name already exists.');
    }
  };

  const deleteFormula = (key) => {
    const newFormulas = { ...formulas };
    delete newFormulas[key];
    setConfig({ ...config, formulas: newFormulas });
  };

  const toggleCurrency = () => {
    const current = getVariable(variables, 'currency_symbol')?.unit || '₹';
    const next = current === '₹' ? '$' : '₹';
    let hasSymbol = false;
    const newVariables = variables.map(v => {
      if (v.key === 'currency_symbol') {
        hasSymbol = true;
        return { ...v, unit: next };
      }
      return v.unit === current ? { ...v, unit: next } : v;
    });
    
    if (!hasSymbol) {
      newVariables.push({
        key: 'currency_symbol',
        label: 'Currency Symbol',
        value: 0,
        unit: next,
        category: 'Financial'
      });
    }

    setConfig({ ...config, variables: newVariables });
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)', transition: 'var(--transition-smooth)' }}
    >
      <div style={{ padding: '1.5rem 2rem 0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>

          <h2 className="header-title" style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-white)' }}>PRODUCTION DASHBOARD</h2>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handlePrintReport} className="btn-outline" style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={14} /> GENERATE EXECUTIVE REPORT
          </button>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>

        {/* Top Metric Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem' }}>
          {[
            { label: 'LINE EFFICIENCY', val: `${optimization?.efficiency || '0.00'}%`, icon: Activity, color: isLowEfficiency ? 'var(--accent-danger)' : 'var(--accent-primary)', hint: 'Overall line balancing effectiveness' },
            { label: 'WORK STATIONS', val: optimization?.stations?.length || 0, sub: `/ ${nMin} Target`, icon: Info, color: '#0891b2', hint: 'Actual vs Theoretical minimum stations' },
            { label: 'BOTTLE-NECK TIME', val: `${optimization?.actualCycleTime || 0}m`, icon: Activity, color: 'var(--accent-secondary)', hint: 'Longest station time (Actual Cycle Time)' },
            { label: 'TOTAL PROCESS TIME', val: `${totalTime}m`, icon: Save, color: '#7c3aed', hint: 'Sum of all task times' },
            { label: 'BALANCE DELAY', val: `${optimization?.balanceDelay || '0.00'}%`, icon: AlertTriangle, color: 'var(--accent-warning)', hint: 'Percentage of idle time relative to total' },
          ].map((m, i) => (
            <motion.div key={i} variants={itemVariants} className="glow-card" style={{ padding: '1.2rem', borderLeft: `4px solid ${m.color}`, display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <m.icon size={14} color={m.color} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>{m.label}</span>
                </div>
                <HelpCircle size={10} color="var(--text-sub)" style={{ opacity: 0.4 }} />
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
          <motion.div variants={itemVariants} className="glow-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.2rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="header-title" style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-white)' }}>CORE PERFORMANCE ANALYTICS</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Theoretical Balance Index vs. Actual Factory Simulation</p>
              </div>
              <button className="no-print btn-primary" onClick={() => onNavigate('optimization')} style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem' }}>
                OPEN OPTIMIZER
              </button>
            </div>

            <div style={{ padding: '2rem', display: 'flex', gap: '3rem', alignItems: 'center' }}>
              {/* Industrial Gauge */}
              <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" fill="none" stroke="var(--bg-tertiary)" strokeWidth="12" />
                  <motion.circle
                    cx="100" cy="100" r="90" fill="none"
                    stroke={isLowEfficiency ? 'var(--accent-danger)' : 'var(--accent-primary)'}
                    strokeWidth="12"
                    initial={{ strokeDasharray: '0, 565' }}
                    animate={{ strokeDasharray: `${(effValue / 100) * 565}, 565` }}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                  />
                  <circle cx="100" cy="100" r="75" fill="none" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>RATING</span>
                  <span style={{ fontSize: '3rem', fontWeight: 900, color: isLowEfficiency ? 'var(--accent-danger)' : 'var(--accent-primary)', lineHeight: 1 }}>{effValue.toFixed(0)}<sub style={{ fontSize: '1rem', bottom: '0.2rem' }}>%</sub></span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, background: isLowEfficiency ? 'var(--accent-danger)20' : 'var(--accent-primary)20', color: isLowEfficiency ? 'var(--accent-danger)' : 'var(--accent-primary)', padding: '2px 8px', borderRadius: '10px', marginTop: '5px' }}>
                    {isLowEfficiency ? 'INEFFICIENT' : 'OPTIMAL'}
                  </span>
                </div>
              </div>

              {/* Meta Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>
                <div>
                  <h6 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '1px' }}>OPTIMIZED TAKT</h6>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-white)' }}>{taktTime.toFixed(1)} <sub style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>min</sub></p>
                </div>
                <div>
                  <h6 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '1px' }}>IDLE TIME LOSS</h6>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-danger)' }}>{(optimization?.totalIdleTime || 0).toFixed(0)} <sub style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>min</sub></p>
                </div>
                <div>
                  <h6 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '1px' }}>SMOOTHNESS IDX</h6>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>{optimization?.smoothnessIndex || '0.00'} <sub style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>coef</sub></p>
                </div>
                <div>
                  <h6 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '1px' }}>CRITICAL PATH</h6>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-warning)' }}>STATION {criticalStation}</p>
                </div>
              </div>
            </div>

            {/* Financial Quick View Footer */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>ROI LIFT / MONTH</span>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: (roi.profitIncrease || 0) >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
                    {(roi.profitIncrease || 0) >= 0 ? '+' : ''}{formatCurrency(roi.profitIncrease || 0, variables)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>DAILY OUTPUT</span>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-white)' }}>{roi.dailyProduction || 0} <sub style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>units</sub></span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={toggleCurrency} className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.65rem' }}>
                  TOGGLE CURRENCY
                </button>
                <button onClick={() => onNavigate('financials')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '1px' }}>
                  FULL ROI REPORT <TrendingUp size={14} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Project Management Side Panel */}
          <motion.div variants={itemVariants} style={{ background: 'var(--sidebar-bg)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: '#fff', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', overflow: 'hidden', transition: 'var(--transition-smooth)', border: '1px solid var(--border-color)' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
              <FolderOpen size={120} color="var(--accent-primary)" />
            </div>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', zIndex: 1 }}>
              <h3 className="header-title" style={{ margin: 0, fontSize: '1rem', color: 'var(--accent-primary)' }}>PROJECT PROFILES</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Switch between stored configurations</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, overflowY: 'auto', maxHeight: '250px', zIndex: 1 }}>
              {profiles.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>No saved projects yet</p>
                </div>
              ) : (
                profiles.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: p.id === activeProfileId ? 'rgba(13, 148, 136, 0.2)' : 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: `1px solid ${p.id === activeProfileId ? 'var(--accent-primary)' : 'transparent'}`, transition: 'all 0.2s' }}>
                    <div onClick={() => onLoadProfile(p.id)} style={{ flex: 1, cursor: 'pointer' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 900, color: p.id === activeProfileId ? 'var(--accent-primary)' : '#fff', letterSpacing: '0.5px' }}>{p.name}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{new Date(p.timestamp).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => onDeleteProfile(p.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--accent-danger)'} onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.2)'}>
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
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', color: '#fff', fontSize: '0.75rem', outline: 'none' }}
              />
              <button onClick={handleCreateProfile} className="btn-primary" style={{ padding: '0.6rem' }}>
                <Plus size={18} />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Navigation Grid Section */}
        <div className="no-print" style={{ borderTop: '2px solid var(--border-color)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 className="header-title" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-sub)' }}>SYSTEM MODULES & CONFIGURATION</h3>
            <button 
              onClick={() => setIsConfigOpen(!isConfigOpen)} 
              className="btn-primary" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', background: isConfigOpen ? 'var(--accent-secondary)' : 'var(--accent-primary)' }}
            >
              {isConfigOpen ? 'CLOSE CONFIG' : 'OPEN CONFIGURATION ENGINE'}
            </button>
          </div>

          <AnimatePresence>
            {isConfigOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden', marginBottom: '2rem' }}
              >
                <div className="glow-card" style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <button onClick={() => setActiveTab('variables')} style={{ background: 'transparent', border: 'none', color: activeTab === 'variables' ? 'var(--accent-primary)' : 'var(--text-sub)', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px', paddingBottom: '0.5rem', borderBottom: activeTab === 'variables' ? '2px solid var(--accent-primary)' : 'none' }}>DYNAMIC VARIABLES</button>
                    <button onClick={() => setActiveTab('formulas')} style={{ background: 'transparent', border: 'none', color: activeTab === 'formulas' ? 'var(--accent-primary)' : 'var(--text-sub)', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px', paddingBottom: '0.5rem', borderBottom: activeTab === 'formulas' ? '2px solid var(--accent-primary)' : 'none' }}>MATHEMATICAL MODELS</button>
                    <button onClick={() => setActiveTab('zones')} style={{ background: 'transparent', border: 'none', color: activeTab === 'zones' ? 'var(--accent-primary)' : 'var(--text-sub)', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px', paddingBottom: '0.5rem', borderBottom: activeTab === 'zones' ? '2px solid var(--accent-primary)' : 'none' }}>MANUFACTURING ZONES</button>
                  </div>

                  {activeTab === 'variables' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      {variables.map(v => (
                        <div key={v.key} style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{v.category}</span>
                            <button onClick={() => deleteVariable(v.key)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', opacity: 0.5 }}><X size={12} /></button>
                          </div>
                          <input 
                            style={{ fontSize: '0.75rem', fontWeight: 700, background: 'transparent', borderBottom: '1px dashed transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', color: 'var(--text-white)', outline: 'none', width: '100%', padding: '2px 0' }} 
                            value={v.label} 
                            onChange={(e) => updateVariableField(v.key, 'label', e.target.value)} 
                            onFocus={(e) => e.target.style.borderBottom = '1px dashed var(--accent-primary)'}
                            onBlur={(e) => e.target.style.borderBottom = '1px dashed transparent'}
                          />
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                              type="number" 
                              className="industrial-input" 
                              style={{ flex: 1 }} 
                              value={v.value} 
                              onChange={(e) => updateVariableField(v.key, 'value', e.target.value)} 
                            />
                            <input 
                              style={{ width: '50px', fontSize: '0.7rem', background: 'transparent', borderBottom: '1px dashed transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', color: 'var(--text-sub)', outline: 'none', padding: '2px 0' }} 
                              value={v.unit} 
                              onChange={(e) => updateVariableField(v.key, 'unit', e.target.value)} 
                              onFocus={(e) => e.target.style.borderBottom = '1px dashed var(--accent-primary)'}
                              onBlur={(e) => e.target.style.borderBottom = '1px dashed transparent'}
                            />
                          </div>
                        </div>
                      ))}
                      <button onClick={addVariable} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.75rem' }}>
                        <Plus size={14} /> ADD NEW VARIABLE
                      </button>
                    </div>
                  )}

                  {activeTab === 'formulas' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      {Object.entries(formulas).map(([key, formula]) => (
                        <div key={key} style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, flex: 1 }}>{key}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button onClick={() => setEditingFormulaKey(key)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.6rem' }}>EDIT FORMULA</button>
                              <button onClick={() => deleteFormula(key)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', opacity: 0.5, cursor: 'pointer' }}><X size={14} /></button>
                            </div>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.1)', padding: '0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>
                            {formula}
                          </div>
                        </div>
                      ))}
                      <button onClick={addFormula} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.75rem', minHeight: '100px', borderRadius: '8px' }}>
                        <Plus size={14} /> ADD NEW RULE
                      </button>
                    </div>
                  )}

                  {activeTab === 'zones' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-sub)', marginBottom: '10px' }}>AVAILABLE PRODUCTION ZONES</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {(config.custom_zones || []).map(zone => (
                            <div key={zone} style={{ background: 'var(--bg-main)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {zone}
                              <X size={12} style={{ cursor: 'pointer' }} onClick={() => {
                                const next = config.custom_zones.filter(z => z !== zone);
                                setConfig({ ...config, custom_zones: next });
                              }} />
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const zone = prompt('Enter new zone name:');
                              if (zone) setConfig({ ...config, custom_zones: [...(config.custom_zones || []), zone] });
                            }}
                            style={{ background: 'var(--accent-primary)20', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            + ADD ZONE
                          </button>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-sub)' }}>
                          <strong>Note:</strong> These zones will be available for selection in the <strong>Process Planning</strong> module to define task constraints.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </motion.div>

      {/* Formula Editor Modal */}
      <AnimatePresence>
        {editingFormulaKey && (
          <FormulaEditor 
            title={`Editing: ${editingFormulaKey}`}
            formula={formulas[editingFormulaKey]}
            variables={variables}
            onSave={saveFormula}
            onCancel={() => setEditingFormulaKey(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;
