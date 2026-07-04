import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Save, Download, AlertTriangle, CheckCircle, Sigma, Settings2, X, PanelLeft, ClipboardList, ListX, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectCircularDependency, generateFormulaTrace, calculateTaktTime, runOptimization } from '../utils/optimizer';
import EmptyState from './EmptyState';
import LineOptimization from './LineOptimization';

/* ─── Predecessor Dropdown ─── */
const PredecessorInput = ({ value, tasks, currentId, onUpdate, isError, inputId }) => {
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
        id={inputId}
        type="text"
        value={value.join(', ')}
        placeholder="None"
        aria-label="Task predecessors — click to select from available tasks"
        aria-expanded={showSuggestions}
        aria-haspopup="listbox"
        role="combobox"
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
            role="listbox"
            aria-label="Select predecessor tasks"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="glow-card"
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '8px', padding: '12px', maxHeight: '180px', overflowY: 'auto' }}
          >
            <p style={{ margin: '0 0 10px 0', fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '1px' }}>SELECT PREDECESSORS</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))', gap: '6px' }}>
              {availableTasks.map(t => (
                <motion.div
                  key={t.id}
                  role="option"
                  aria-selected={currentPreds.includes(t.id)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && togglePred(t.id)}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => togglePred(t.id)}
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
const ProcessPlanning = ({ tasks, setTasks, onSaveTasks, config, setConfig, onNavigate, optimization, syncStatus }) => {
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizationOpen, setIsOptimizationOpen] = useState(false);
  const [showFormulaTrace, setShowFormulaTrace] = useState(true);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [customColumns, setCustomColumns] = useState(() => {
    const keys = new Set();
    tasks.forEach(t => Object.keys(t.custom_attributes || {}).forEach(k => keys.add(k)));
    return Array.from(keys).map(k => ({ key: k, label: k, type: 'text' }));
  });
  const [newColKey, setNewColKey] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isStacked = viewportWidth < 1024;

  // Form panel state — new task being built in the left panel
  const [formDraft, setFormDraft] = useState({
    name: '',
    time: '',
    predecessors: [],
    zoning: 'None',
  });
  const [selectedTaskId, setSelectedTaskId] = useState(null); // null = adding new, else editing existing

  const errors = useMemo(() => detectCircularDependency(tasks), [tasks]);

  const [formulaSteps, setFormulaSteps] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const compute = async () => {
      const takt = await calculateTaktTime(config);
      const opt = optimization || runOptimization(tasks, takt, 'LTF', config);
      const steps = await generateFormulaTrace(tasks, config, opt);
      if (!cancelled) setFormulaSteps(steps);
    };
    compute();
    return () => { cancelled = true; };
  }, [tasks, config, optimization]);

  // When a row is selected for editing, load it into the form panel
  useEffect(() => {
    if (selectedTaskId !== null) {
      const t = tasks.find(t => t.id === selectedTaskId);
      if (t) {
        setFormDraft({
          name: t.name,
          time: t.time,
          predecessors: t.predecessors || [],
          zoning: t.zoning || 'None',
        });
      }
    } else {
      setFormDraft({ name: '', time: '', predecessors: [], zoning: 'None' });
    }
  }, [selectedTaskId, tasks]);

  // Generate next task ID
  const generateNextId = () => {
    const idx = tasks.length;
    if (idx < 26) return String.fromCharCode(65 + idx);
    const first = String.fromCharCode(65 + Math.floor((idx - 26) / 26));
    const second = String.fromCharCode(65 + ((idx - 26) % 26));
    return `${first}${second}`;
  };

  const handleFormApply = () => {
    const trimmedName = (formDraft.name || '').trim();
    const parsedTime = parseFloat(formDraft.time) || 0;
    if (!trimmedName) return;

    if (selectedTaskId !== null) {
      // Update existing task
      setTasks(tasks.map(t => t.id === selectedTaskId
        ? { ...t, name: trimmedName, time: parsedTime, predecessors: formDraft.predecessors, zoning: formDraft.zoning || 'None' }
        : t
      ));
      setSelectedTaskId(null);
    } else {
      // Add new task
      const baseAttrs = {};
      customColumns.forEach(c => { baseAttrs[c.key] = c.type === 'number' ? 0 : ''; });
      const newId = generateNextId();
      setTasks([...tasks, {
        id: newId,
        name: trimmedName,
        time: parsedTime,
        predecessors: formDraft.predecessors,
        zoning: formDraft.zoning || 'None',
        custom_attributes: baseAttrs
      }]);
    }
    setFormDraft({ name: '', time: '', predecessors: [], zoning: 'None' });
  };

  const removeTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  };

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
    const headers = ['Task ID', 'Description', 'Standard Time (mins)', 'Predecessors', ...customHeaders];
    const rows = tasks.map(t => [
      t.id, t.name, t.time, t.predecessors.join('|'),
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
      {/* Toolbar */}
      <div style={{ padding: '0.85rem 1.5rem', display: 'flex', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', gap: '1rem', position: 'relative', flexWrap: 'wrap', alignItems: 'center' }}>
        <AnimatePresence>
          {showSaveSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              role="status"
              aria-live="polite"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#ccfbf1', color: '#0d9488', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 900, zIndex: 100, border: '1px solid #0d9488', letterSpacing: '1px' }}
            >
              <CheckCircle size={16} /> DATA PERSISTED
            </motion.div>
          )}
        </AnimatePresence>
        <button
          disabled={isSaving}
          onClick={handleSave}
          id="btn-save-master"
          aria-label={isSaving ? 'Saving process data...' : 'Save all tasks to server'}
          className="btn-primary"
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', opacity: isSaving ? 0.65 : 1 }}
        >
          <Save size={14} /> {isSaving ? 'SAVING...' : 'SAVE MASTER'}
        </button>
        <button
          onClick={handleExport}
          className="btn-outline"
          aria-label="Export process planning tasks as CSV"
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={14} /> DOWNLOAD CSV
        </button>
        {syncStatus && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.7rem',
            fontWeight: 900,
            padding: '0.4rem 0.8rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: syncStatus === 'saved' ? 'var(--accent-primary)' : syncStatus === 'saving' ? 'var(--accent-warning)' : 'var(--accent-danger)',
            letterSpacing: '1px'
          }}>
            <motion.span 
              animate={syncStatus === 'saving' ? { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] } : {}}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: syncStatus === 'saved' ? 'var(--accent-primary)' : syncStatus === 'saving' ? 'var(--accent-warning)' : 'var(--accent-danger)',
                display: 'inline-block'
              }}
            />
            {syncStatus === 'saved' && 'SYNCED TO SERVER'}
            {syncStatus === 'saving' && 'SAVING...'}
            {syncStatus === 'error' && 'SYNC ERROR'}
          </div>
        )}
        {saveError && (
          <div role="alert" aria-live="assertive" style={{ color: 'var(--accent-danger)', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.5px' }}>
            {saveError}
          </div>
        )}
        <button
          id="btn-manage-columns"
          onClick={() => setShowColumnManager(v => !v)}
          aria-label="Manage custom data columns"
          aria-pressed={showColumnManager}
          className="btn-outline"
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', borderColor: showColumnManager ? 'var(--accent-secondary)' : 'var(--border-color)', color: showColumnManager ? 'var(--accent-secondary)' : 'var(--text-sub)' }}
        >
          <Settings2 size={14} /> MANAGE COLUMNS
        </button>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowFormulaTrace(v => !v)}
          aria-label={showFormulaTrace ? 'Hide formula trace panel' : 'Show formula trace panel'}
          aria-pressed={showFormulaTrace}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            background: showFormulaTrace ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
            border: `1px solid ${showFormulaTrace ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            color: showFormulaTrace ? '#fff' : 'var(--text-sub)',
            fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.5px',
            transition: 'all 0.2s'
          }}
        >
          <Sigma size={14} /> FORMULA TRACE
        </motion.button>
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
                <p id="custom-columns-heading" style={{ margin: '0 0 10px 0', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>ACTIVE CUSTOM COLUMNS</p>
                <div role="list" aria-labelledby="custom-columns-heading" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {customColumns.length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>No custom columns defined</span>}
                  {customColumns.map(col => (
                    <div key={col.key} role="listitem" style={{ background: 'var(--bg-main)', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {col.label} <span style={{ opacity: 0.5 }}>({col.type})</span>
                      <button
                        aria-label={`Remove custom column: ${col.label}`}
                        onClick={() => removeCustomColumn(col.key)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div className="planning-form-field" style={{ gap: '4px' }}>
                  <label htmlFor="new-col-name" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)' }}>COLUMN NAME</label>
                  <input
                    id="new-col-name"
                    value={newColKey}
                    onChange={e => setNewColKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomColumn()}
                    placeholder="e.g. Required Skill"
                    aria-label="New custom column name"
                    className="industrial-input"
                    style={{ width: '180px' }}
                  />
                </div>
                <div className="planning-form-field" style={{ gap: '4px' }}>
                  <label htmlFor="new-col-type" style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)' }}>TYPE</label>
                  <select
                    id="new-col-type"
                    value={newColType}
                    onChange={e => setNewColType(e.target.value)}
                    aria-label="New custom column data type"
                    className="industrial-input"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                  </select>
                </div>
                <button
                  id="btn-add-column"
                  onClick={addCustomColumn}
                  aria-label="Add new custom column to task table"
                  className="btn-primary"
                  style={{ padding: '0.55rem 1rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={13} /> ADD
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Body: Form Entry Panel + Table + Formula Trace */}
      <div className="planning-body-flow">

        {/* ── Main View: Table + Bottom Form ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', flex: 1 }}>
            {tasks.length === 0 ? (
              <EmptyState
                icon={ListX}
                title="NO OPERATIONS DEFINED"
                description="Use the form panel to define your first process operation. Add a task name, standard time, zoning constraints, and predecessors to get started."
              />
            ) : (
              <div className="glow-card">
                <div className="table-responsive-wrapper">
                  <table
                    style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}
                    role="table"
                    aria-label="Assembly process operations table"
                  >
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th scope="col" style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '70px', letterSpacing: '1px', fontSize: '0.7rem' }}>ID</th>
                        <th scope="col" style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, letterSpacing: '1px', fontSize: '0.7rem' }}>DESCRIPTION</th>
                        <th scope="col" style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '120px', letterSpacing: '1px', fontSize: '0.7rem' }}>TIME (MIN)</th>
                        <th scope="col" style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '200px', letterSpacing: '1px', fontSize: '0.7rem' }}>PREDECESSORS</th>
                        {customColumns.map(col => (
                          <th key={col.key} scope="col" style={{ padding: '1rem 1.5rem', color: 'var(--accent-secondary)', fontWeight: 900, width: '140px', letterSpacing: '1px', fontSize: '0.7rem' }}>{col.label.toUpperCase()}</th>
                        ))}
                        <th scope="col" style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, textAlign: 'right', width: '80px', letterSpacing: '1px', fontSize: '0.7rem' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => {
                        const taskError = errors.find(e => e.taskId === task.id || (e.cycle && e.cycle.includes(task.id)));
                        const isSelected = selectedTaskId === task.id;
                        return (
                          <tr
                            key={task.id}
                            onClick={() => {
                              setSelectedTaskId(isSelected ? null : task.id);
                            }}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              background: isSelected ? 'rgba(13, 148, 136, 0.06)' : taskError ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                              outline: isSelected ? '2px solid var(--accent-primary)' : 'none',
                              outlineOffset: '-2px',
                            }}
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                setSelectedTaskId(isSelected ? null : task.id);
                              }
                            }}
                            aria-selected={isSelected}
                            aria-label={`Task ${task.id}: ${task.name}. ${isSelected ? 'Currently selected for editing.' : 'Press Enter to edit.'}`}
                          >
                            <td style={{ padding: '0.85rem 1.5rem', fontWeight: 900, color: taskError ? 'var(--accent-danger)' : isSelected ? 'var(--accent-primary)' : 'var(--accent-primary)', fontSize: '1.05rem' }}>
                              {task.id}
                            </td>
                            <td style={{ padding: '0.85rem 1.5rem' }}>
                              <input
                                id={`task-name-${task.id}`}
                                value={task.name}
                                onClick={e => e.stopPropagation()}
                                onChange={(e) => updateTask(task.id, 'name', e.target.value)}
                                aria-label={`Task ${task.id} description`}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-white)', width: '100%', outline: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'text' }}
                              />
                            </td>
                            <td style={{ padding: '0.85rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                <input
                                  id={`task-time-${task.id}`}
                                  type="number"
                                  value={task.time}
                                  onClick={e => e.stopPropagation()}
                                  onChange={(e) => updateTask(task.id, 'time', parseFloat(e.target.value) || 0)}
                                  aria-label={`Task ${task.id} standard time in minutes`}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-white)', width: '45px', outline: 'none', fontWeight: 900, textAlign: 'right', fontSize: '0.85rem' }}
                                />
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 900 }}>MIN</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 1.5rem' }} onClick={e => e.stopPropagation()}>
                              <PredecessorInput
                                inputId={`task-preds-${task.id}`}
                                value={task.predecessors}
                                tasks={tasks}
                                currentId={task.id}
                                isError={!!taskError}
                                onUpdate={(val) => updateTask(task.id, 'predecessors', val)}
                              />
                            </td>
                            {customColumns.map(col => (
                              <td key={col.key} style={{ padding: '0.75rem 1.5rem' }} onClick={e => e.stopPropagation()}>
                                <input
                                  id={`task-${task.id}-${col.key}`}
                                  type={col.type}
                                  value={task.custom_attributes?.[col.key] ?? (col.type === 'number' ? 0 : '')}
                                  onChange={e => updateCustomAttr(task.id, col.key, col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                                  aria-label={`Task ${task.id}: ${col.label}`}
                                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--accent-secondary)', padding: '5px 8px', borderRadius: '4px', width: '100%', outline: 'none', fontSize: '0.8rem', fontWeight: 700 }}
                                />
                              </td>
                            ))}
                            <td style={{ padding: '0.85rem 1.5rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                              <button
                                id={`btn-delete-task-${task.id}`}
                                onClick={() => removeTask(task.id)}
                                aria-label={`Delete task ${task.id}: ${task.name}`}
                                style={{ background: 'transparent', color: 'var(--text-sub)', border: 'none', cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-danger)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-sub)'}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── BOTTOM FORM: Data Entry ── */}
              <div className="glow-card" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', boxShadow: '0 8px 30px rgba(13, 148, 136, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <p className="form-section-label" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>
                      {selectedTaskId !== null ? `EDITING TASK ${selectedTaskId}` : 'ADD NEW TASK'}
                    </p>
                    {selectedTaskId !== null && (
                      <button
                        onClick={() => { setSelectedTaskId(null); }}
                        aria-label="Cancel editing and return to new task form"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-sub)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', transition: 'var(--transition-fast)' }}
                      >
                        <X size={12} /> CANCEL EDIT
                      </button>
                    )}
                  </div>
                  
                  {/* Task count summary */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ClipboardList size={16} color="var(--accent-primary)" />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.55rem', fontWeight: 900, letterSpacing: '1px', color: 'var(--text-sub)' }}>TOTAL OPERATIONS</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-white)' }}>
                          {tasks.length}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '0.55rem', fontWeight: 900, letterSpacing: '1px', color: 'var(--text-sub)' }}>TOTAL TIME</p>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                        {tasks.reduce((s, t) => s + (Number(t.time) || 0), 0).toFixed(1)} <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>min</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  {/* Task Name */}
                  <div className="planning-form-field">
                    <label htmlFor="form-task-name">TASK DESCRIPTION</label>
                    <input
                      id="form-task-name"
                      type="text"
                      value={formDraft.name}
                      onChange={e => setFormDraft(d => ({ ...d, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleFormApply()}
                      placeholder="e.g. Mount PCB Board"
                      className="industrial-input"
                    />
                  </div>

                  {/* Standard Time */}
                  <div className="planning-form-field">
                    <label htmlFor="form-task-time">STANDARD TIME (MIN)</label>
                    <input
                      id="form-task-time"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formDraft.time}
                      onChange={e => setFormDraft(d => ({ ...d, time: e.target.value }))}
                      placeholder="0.0"
                      className="industrial-input"
                    />
                  </div>

                  {/* Predecessors */}
                  {tasks.length > 0 && (
                    <div className="planning-form-field">
                      <label htmlFor="form-task-predecessors">PREDECESSORS</label>
                      <PredecessorInput
                        inputId="form-task-predecessors"
                        value={formDraft.predecessors}
                        tasks={tasks}
                        currentId={selectedTaskId}
                        isError={false}
                        onUpdate={(val) => {
                          const parsed = val.split(',').map(v => v.trim()).filter(v => v !== '');
                          setFormDraft(d => ({ ...d, predecessors: parsed }));
                        }}
                      />
                    </div>
                  )}

                  {/* Apply / Add button */}
                  <motion.button
                    id="btn-apply-task"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleFormApply}
                    disabled={!(formDraft.name || '').trim()}
                    className="btn-primary"
                    style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.78rem', opacity: !(formDraft.name || '').trim() ? 0.5 : 1, padding: '0 1rem' }}
                  >
                    <Plus size={16} />
                    {selectedTaskId !== null ? 'APPLY CHANGES' : 'ADD TO PLAN'}
                  </motion.button>
                </div>

                {errors.length > 0 && (
                  <div role="alert" style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--accent-danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <AlertTriangle size={16} color="var(--accent-danger)" style={{ flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent-danger)', letterSpacing: '0.5px' }}>DEPENDENCY CONFLICT: <span style={{ fontWeight: 600 }}>{errors[0].message}</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Line Optimization Collapsible Panel ── */}
              <div style={{ marginTop: '1.5rem', background: 'var(--bg-secondary)', border: `1px solid ${isOptimizationOpen ? 'var(--accent-secondary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden', transition: 'border-color 0.3s' }}>
                <button
                  onClick={() => setIsOptimizationOpen(!isOptimizationOpen)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: isOptimizationOpen ? 'rgba(168, 85, 247, 0.05)' : 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'var(--accent-secondary)', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={14} color="#fff" />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '0.5px' }}>LINE OPTIMIZATION</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 600 }}>Configure and run the heuristic line balancing algorithm</div>
                    </div>
                  </div>
                  {isOptimizationOpen ? <ChevronUp size={20} color="var(--text-sub)" /> : <ChevronDown size={20} color="var(--text-sub)" />}
                </button>
                <AnimatePresence>
                  {isOptimizationOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ marginTop: '1rem' }}>
                          <LineOptimization tasks={tasks} config={config} setConfig={setConfig} embedded />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </div>
        </div>

        {/* ── Formula Trace Sidebar ── */}
        <AnimatePresence>
          {showFormulaTrace && (
            <motion.div
              key="formula-panel"
              initial={isStacked ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
              animate={isStacked ? { height: 'auto', width: '100%', opacity: 1 } : { width: 300, opacity: 1 }}
              exit={isStacked ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ overflow: 'hidden', flexShrink: 0, borderLeft: isStacked ? 'none' : '1px solid var(--border-color)', borderTop: isStacked ? '1px solid var(--border-color)' : 'none', background: 'var(--sidebar-bg)' }}
            >
              <div style={{ width: isStacked ? '100%' : 300, height: isStacked ? 'auto' : '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ padding: '1.2rem 1.2rem 0.8rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Sigma size={14} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '2px' }}>FORMULA TRACE</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    Live derivation · Updates as you edit
                  </p>
                </div>
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  {formulaSteps.map((step, i) => (
                    <FormulaStep key={step.symbol} step={step} index={i} />
                  ))}
                </div>
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

    </motion.div>
  );
};

export default ProcessPlanning;
