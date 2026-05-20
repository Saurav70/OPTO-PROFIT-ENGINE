import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Save, Download, AlertTriangle, CheckCircle, Cpu, Table, Info as TooltipIcon, Activity, Sigma, Settings2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectCircularDependency, generateFormulaTrace, calculateTaktTime, runOptimization } from '../utils/optimizer';


/* ─── Predecessor Dropdown ─── */
const PredecessorInput = ({ value, tasks, currentId, onUpdate, isError }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);
  const availableTasks = tasks.filter(t => t.id !== currentId);
  const currentPreds = value;

  const togglePred = (id) => {
    const newPreds = currentPreds.includes(id)
      ? currentPreds.filter(p => p !== id)
      : [...currentPreds, id];
    onUpdate(newPreds.join(', '));
  };

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        value={value.join(', ')}
        placeholder="None"
        onFocus={() => setShowSuggestions(true)}
        onChange={(e) => onUpdate(e.target.value)}
        style={{
          background: 'var(--bg-tertiary)', border: `1px solid ${isError ? 'var(--accent-danger)' : 'var(--border-color)'}`,
          padding: '6px 10px', borderRadius: 'var(--radius-sm)', color: isError ? 'var(--accent-danger)' : 'var(--accent-warning)',
          width: '100%', outline: 'none', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.5px'
        }}
      />
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="glow-card"
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '8px', padding: '12px', maxHeight: '180px', overflowY: 'auto' }}
          >
            <p style={{ margin: '0 0 10px 0', fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '1px' }}>SELECT PREDECESSORS</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))', gap: '6px' }}>
              {availableTasks.map(t => (
                <motion.div key={t.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => togglePred(t.id)}
                  style={{
                    padding: '6px', textAlign: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    fontSize: '0.75rem', fontWeight: 900,
                    background: currentPreds.includes(t.id) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: currentPreds.includes(t.id) ? '#fff' : 'var(--text-main)',
                    border: '1px solid var(--border-color)', transition: 'var(--transition-fast)'
                  }}
                >{t.id}</motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Formula Trace Step Card ─── */
const FormulaStep = ({ step, index }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    style={{
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      padding: '0.9rem 1rem',
      borderLeft: `3px solid ${step.color}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>{step.label.toUpperCase()}</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: step.color, background: `${step.color}18`, padding: '2px 8px', borderRadius: '99px', letterSpacing: '0.5px' }}>
        {step.result}
      </span>
    </div>
    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '0.5px' }}>
      <span style={{ color: step.color }}>{step.symbol}</span>
      <span style={{ color: 'var(--text-sub)', margin: '0 6px' }}>=</span>
      <span>{step.formula}</span>
    </div>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 700, fontFamily: 'monospace', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px' }}>
      {step.substituted}
    </div>
  </motion.div>
);

/* ─── Main Component ─── */
const ProcessPlanning = ({ tasks, setTasks, onSaveTasks, config, optimization }) => {
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showFormulaTrace, setShowFormulaTrace] = useState(true);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [customColumns, setCustomColumns] = useState(() => {
    // Infer columns from existing task custom_attributes
    const keys = new Set();
    tasks.forEach(t => Object.keys(t.custom_attributes || {}).forEach(k => keys.add(k)));
    return Array.from(keys).map(k => ({ key: k, label: k, type: 'text' }));
  });
  const [newColKey, setNewColKey] = useState('');
  const [newColType, setNewColType] = useState('text');

  const errors = useMemo(() => detectCircularDependency(tasks), [tasks]);

  // Live formula trace — recomputes whenever tasks or config change
  const taktTime = useMemo(() => calculateTaktTime(config), [config]);
  const liveOptimization = useMemo(() => optimization || runOptimization(tasks, taktTime, 'LTF', config), [optimization, tasks, taktTime, config]);
  const formulaSteps = useMemo(() => generateFormulaTrace(tasks, config, liveOptimization), [tasks, config, liveOptimization]);

  const addTask = () => {
    const newId = String.fromCharCode(65 + tasks.length);
    const baseAttrs = {};
    customColumns.forEach(c => { baseAttrs[c.key] = c.type === 'number' ? 0 : ''; });
    setTasks([...tasks, { id: newId, name: 'New Task', time: 5, predecessors: [], zoning: 'None', custom_attributes: baseAttrs }]);
  };

  const removeTask = (id) => setTasks(tasks.filter(t => t.id !== id));

  const updateTask = (id, field, value) => {
    if (field === 'predecessors') value = value.split(',').map(v => v.trim()).filter(v => v !== '');
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const updateCustomAttr = (taskId, key, value) => {
    setTasks(tasks.map(t => t.id === taskId
      ? { ...t, custom_attributes: { ...(t.custom_attributes || {}), [key]: value } }
      : t
    ));
  };

  const addCustomColumn = () => {
    const key = newColKey.trim().replace(/\s+/g, '_');
    if (!key || customColumns.some(c => c.key === key)) return;
    const col = { key, label: newColKey.trim(), type: newColType };
    setCustomColumns([...customColumns, col]);
    // Seed existing tasks with empty default value
    setTasks(tasks.map(t => ({ ...t, custom_attributes: { ...(t.custom_attributes || {}), [key]: newColType === 'number' ? 0 : '' } })));
    setNewColKey('');
  };

  const removeCustomColumn = (key) => {
    setCustomColumns(customColumns.filter(c => c.key !== key));
    setTasks(tasks.map(t => {
      const attrs = { ...(t.custom_attributes || {}) };
      delete attrs[key];
      return { ...t, custom_attributes: attrs };
    }));
  };

  const handleExport = () => {
    const customHeaders = customColumns.map(c => c.label);
    const headers = ['Task ID', 'Description', 'Standard Time (mins)', 'Predecessors', 'Zoning', ...customHeaders];
    const rows = tasks.map(t => [
      t.id, t.name, t.time, t.predecessors.join('|'), t.zoning || 'None',
      ...customColumns.map(c => t.custom_attributes?.[c.key] ?? '')
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `process_plan_${(config.productName || 'project').toLowerCase().replace(/ /g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    if (!onSaveTasks || isSaving) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await onSaveTasks(tasks);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error?.message || 'Failed to persist process data');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)', transition: 'var(--transition-smooth)' }}
    >
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem 1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div>

          <h2 className="header-title" style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-white)' }}>LABOR OPERATIONS PLANNING</h2>
        </div>
        {/* Formula Trace Toggle */}
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowFormulaTrace(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            background: showFormulaTrace ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
            border: `1px solid ${showFormulaTrace ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            color: showFormulaTrace ? '#fff' : 'var(--text-sub)',
            fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.5px',
            transition: 'all 0.2s'
          }}
        >
          <Sigma size={14} />
          FORMULA TRACE
        </motion.button>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '1rem 1.5rem', display: 'flex', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', gap: '1rem', position: 'relative', flexWrap: 'wrap', alignItems: 'center' }}>
        <AnimatePresence>
          {showSaveSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              style={{ position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', background: '#ccfbf1', color: '#0d9488', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 900, zIndex: 100, border: '1px solid #0d9488', letterSpacing: '1px' }}
            >
              <CheckCircle size={16} /> DATA PERSISTED
            </motion.div>
          )}
        </AnimatePresence>
        <button disabled={isSaving} onClick={handleSave} className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', opacity: isSaving ? 0.65 : 1 }}>
          <Save size={14} /> {isSaving ? 'SAVING' : 'SAVE MASTER'}
        </button>
        {saveError && (
          <div style={{ color: 'var(--accent-danger)', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.5px' }}>
            {saveError}
          </div>
        )}
        <button
          onClick={() => setShowColumnManager(v => !v)}
          className="btn-outline"
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', borderColor: showColumnManager ? 'var(--accent-secondary)' : 'var(--border-color)', color: showColumnManager ? 'var(--accent-secondary)' : 'var(--text-sub)' }}
        >
          <Settings2 size={14} /> MANAGE COLUMNS
        </button>
        <button onClick={handleExport} className="btn-outline" style={{ marginLeft: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.75rem', border: '1px solid var(--border-color)', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={14} /> EXPORT CSV
        </button>
      </div>

      {/* Column Manager Panel */}
      <AnimatePresence>
        {showColumnManager && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
          >
            <div style={{ padding: '1.2rem 1.5rem', display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>ACTIVE CUSTOM COLUMNS</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {customColumns.length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>No custom columns defined</span>}
                  {customColumns.map(col => (
                    <div key={col.key} style={{ background: 'var(--bg-main)', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {col.label} <span style={{ opacity: 0.5 }}>({col.type})</span>
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeCustomColumn(col.key)} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)' }}>COLUMN NAME</label>
                  <input
                    value={newColKey}
                    onChange={e => setNewColKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomColumn()}
                    placeholder="e.g. Required Skill"
                    className="industrial-input"
                    style={{ width: '180px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)' }}>TYPE</label>
                  <select value={newColType} onChange={e => setNewColType(e.target.value)} className="industrial-input">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                  </select>
                </div>
                <button onClick={addCustomColumn} className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={13} /> ADD
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body: Table + Formula Panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Main Table */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-main)', padding: '2rem' }}>
          {errors.length > 0 && (
            <div style={{ background: 'var(--accent-danger)20', border: '1px solid var(--accent-danger)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', gap: '1.2rem', alignItems: 'center', boxShadow: '0 0 15px rgba(239, 68, 68, 0.1)' }}>
              <AlertTriangle color="var(--accent-danger)" size={20} />
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-danger)', letterSpacing: '1px' }}>DEPENDENCY CONFLICT DETECTED</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--accent-danger)', fontWeight: 600 }}>{errors[0].message}</p>
              </div>
            </div>
          )}

          <div className="glow-card">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '80px', letterSpacing: '1px' }}>ID</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '1px' }}>TASK IDENTIFICATION &amp; DESCRIPTION</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '120px', letterSpacing: '1px' }}>TIME (MIN)</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '200px', letterSpacing: '1px' }}>PREDECESSORS</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '160px', letterSpacing: '1px' }}>ZONING</th>
                  {customColumns.map(col => (
                    <th key={col.key} style={{ padding: '1rem 1.5rem', color: 'var(--accent-secondary)', fontWeight: 900, width: '140px', letterSpacing: '1px', fontSize: '0.75rem' }}>{col.label.toUpperCase()}</th>
                  ))}
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, textAlign: 'right', width: '80px', letterSpacing: '1px' }}>OP</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const taskError = errors.find(e => e.taskId === task.id || (e.cycle && e.cycle.includes(task.id)));
                  return (
                    <tr key={task.id} style={{ borderBottom: '1px solid var(--border-color)', background: taskError ? 'rgba(239, 68, 68, 0.05)' : 'transparent', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 900, color: taskError ? 'var(--accent-danger)' : 'var(--accent-primary)', fontSize: '1.1rem' }}>{task.id}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <input value={task.name} onChange={(e) => updateTask(task.id, 'name', e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-white)', width: '100%', outline: 'none', fontWeight: 700, fontSize: '0.9rem' }} />
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                          <input type="number" value={task.time} onChange={(e) => updateTask(task.id, 'time', parseFloat(e.target.value) || 0)} style={{ background: 'transparent', border: 'none', color: 'var(--text-white)', width: '45px', outline: 'none', fontWeight: 900, textAlign: 'right', fontSize: '0.85rem' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 900 }}>MIN</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <PredecessorInput value={task.predecessors} tasks={tasks} currentId={task.id} isError={!!taskError} onUpdate={(val) => updateTask(task.id, 'predecessors', val)} />
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <select value={task.zoning || 'None'} onChange={(e) => updateTask(task.id, 'zoning', e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', color: 'var(--text-white)', fontSize: '0.75rem', fontWeight: 900, outline: 'none', width: '100%' }}>
                          <option value="None">None</option>
                          {(config.custom_zones || []).map(zone => (
                            <option key={zone} value={zone}>{zone}</option>
                          ))}
                        </select>
                      </td>
                      {customColumns.map(col => (
                        <td key={col.key} style={{ padding: '0.75rem 1.5rem' }}>
                          <input
                            type={col.type}
                            value={task.custom_attributes?.[col.key] ?? (col.type === 'number' ? 0 : '')}
                            onChange={e => updateCustomAttr(task.id, col.key, col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--accent-secondary)', padding: '6px 8px', borderRadius: '4px', width: '100%', outline: 'none', fontSize: '0.8rem', fontWeight: 700 }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <button onClick={() => removeTask(task.id)} style={{ background: 'transparent', color: 'var(--text-sub)', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--accent-danger)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-sub)'}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'center' }}>
              <motion.button whileHover={{ scale: 1.02, backgroundColor: 'var(--bg-tertiary)' }} whileTap={{ scale: 0.98 }} onClick={addTask} style={{ background: 'transparent', border: '1px dashed var(--text-sub)', color: 'var(--text-sub)', padding: '0.8rem 2.5rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '1px' }}>
                <Plus size={18} /> APPEND NEW PROCESS STEP
              </motion.button>
            </div>
          </div>
        </div>

        {/* Formula Trace Sidebar */}
        <AnimatePresence>
          {showFormulaTrace && (
            <motion.div
              key="formula-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ overflow: 'hidden', flexShrink: 0, borderLeft: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}
            >
              <div style={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {/* Panel Header */}
                <div style={{ padding: '1.2rem 1.2rem 0.8rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Sigma size={14} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '2px' }}>FORMULA TRACE</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    Live derivation · Updates as you edit
                  </p>
                </div>

                {/* Steps */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  {formulaSteps.map((step, i) => (
                    <FormulaStep key={step.symbol} step={step} index={i} />
                  ))}
                </div>

                {/* Validation Status */}
                <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ background: errors.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(13,148,136,0.1)', border: `1px solid ${errors.length > 0 ? 'var(--accent-danger)' : 'var(--accent-primary)'}`, borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {errors.length > 0 ? <AlertTriangle size={14} color="var(--accent-danger)" /> : <CheckCircle size={14} color="var(--accent-primary)" />}
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: errors.length > 0 ? 'var(--accent-danger)' : 'var(--accent-primary)', letterSpacing: '0.5px' }}>
                      {errors.length > 0 ? `${errors.length} CONFLICT${errors.length > 1 ? 'S' : ''} DETECTED` : 'PRECEDENCE VALID'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div style={{ padding: '1rem 2rem', background: 'var(--card-bg)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '0.5px' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Cpu size={12} /> ENGINE RULE: LONGEST TASK FIRST (LTF)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={12} /> REAL-TIME CIRCULARITY ANALYTICS: ACTIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TooltipIcon size={12} />
          <span>ZONING CONSTRAINTS: ENABLED (V4.1)</span>
        </div>
        <div style={{ color: 'var(--accent-primary)' }}>SYSTEM STATUS: OPTIMAL</div>
      </div>
    </motion.div>
  );
};

export default ProcessPlanning;
