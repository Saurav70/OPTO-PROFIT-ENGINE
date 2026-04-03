import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, Save, Download, AlertTriangle, Eye, CheckCircle, Cpu, FileText, Table, Info as TooltipIcon, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectCircularDependency } from '../utils/optimizer';

// Sub-component for Smart Predecessor Suggestions
const PredecessorInput = ({ value, tasks, currentId, onUpdate, isError }) => {
  const [showSuggestions, setShowShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  const availableTasks = tasks.filter(t => t.id !== currentId);
  const currentPreds = value;

  const togglePred = (id) => {
    let newPreds;
    if (currentPreds.includes(id)) {
      newPreds = currentPreds.filter(p => p !== id);
    } else {
      newPreds = [...currentPreds, id];
    }
    onUpdate(newPreds.join(', '));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input 
        value={value.join(', ')}
        placeholder="None"
        onFocus={() => setShowShowSuggestions(true)}
        onChange={(e) => onUpdate(e.target.value)}
        style={{ 
          background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px',
          color: isError ? 'var(--accent-danger)' : 'var(--accent-warning)', width: '100%', outline: 'none', fontSize: '0.75rem', fontWeight: 800 
        }}
      />
      <AnimatePresence>
        {showSuggestions && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{ 
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: 'var(--card-bg)', border: '1px solid var(--border-color)',
              borderRadius: '8px', marginTop: '4px', padding: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              maxHeight: '150px', overflowY: 'auto'
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontSize: '0.6rem', color: 'var(--text-sub)', fontWeight: 800, letterSpacing: '0.5px' }}>SELECT PREDECESSORS</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '4px' }}>
              {availableTasks.map(t => (
                <div 
                  key={t.id}
                  onClick={() => togglePred(t.id)}
                  style={{ 
                    padding: '4px', textAlign: 'center', borderRadius: '4px', cursor: 'pointer',
                    fontSize: '0.7rem', fontWeight: 900,
                    background: currentPreds.includes(t.id) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: currentPreds.includes(t.id) ? '#fff' : 'var(--text-main)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {t.id}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProcessPlanning = ({ tasks, setTasks, config, setConfig, onNavigate }) => {
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'bulk'
  const [bulkText, setBulkText] = useState(tasks.map(t => `${t.id},${t.name},${t.time},${t.predecessors.join('|')}`).join('\n'));
  const fileInputRef = useRef(null);
  
  // Validate whenever tasks change
  const errors = useMemo(() => detectCircularDependency(tasks), [tasks]);

  const addTask = () => {
    const newId = String.fromCharCode(65 + tasks.length); // A, B, C...
    setTasks([...tasks, { id: newId, name: 'New Task', time: 5, predecessors: [], zoning: 'None' }]);
  };

  const removeTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id, field, value) => {
    if (field === 'predecessors') {
      value = value.split(',').map(v => v.trim()).filter(v => v !== '');
    }
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleBulkSync = () => {
    try {
      const lines = bulkText.split('\n').filter(l => l.trim() !== '');
      const newTasks = lines.map(line => {
        const [id, name, time, preds] = line.split(',');
        return {
          id: id.trim(),
          name: name.trim(),
          time: parseFloat(time) || 0,
          predecessors: preds ? preds.split('|').map(p => p.trim()).filter(p => p !== '') : [],
          zoning: 'None'
        };
      });
      setTasks(newTasks);
      setViewMode('table');
    } catch {
      alert("Error parsing bulk data. Ensure format: ID,Name,Time,Pred1|Pred2");
    }
  };

  const handleJsonExport = () => {
    const projectData = {
      version: "4.1",
      timestamp: new Date().toISOString(),
      config,
      tasks
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `opto_project_${config.productName.toLowerCase().replace(/ /g, '_')}.opto`;
    link.click();
  };

  const handleJsonImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.tasks && data.config) {
          setTasks(data.tasks);
          // Update individual config fields if setConfig exists
          if (typeof setConfig === 'function') {
            setConfig(data.config);
          }
          alert("Project imported successfully.");
        }
      } catch {
        alert("Invalid project file.");
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const headers = ['Task ID', 'Description', 'Standard Time (mins)', 'Predecessors', 'Zoning'];
    const rows = tasks.map(t => [t.id, t.name, t.time, t.predecessors.join('|'), t.zoning || 'None']);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `process_plan_${config.productName.toLowerCase().replace(/ /g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = () => {
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000);
  };

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
            MODULE 02
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-white)', letterSpacing: '1px' }}>LABOR OPERATIONS PLANNING</h2>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px', display: 'flex' }}>
           <button 
             onClick={() => setViewMode('table')}
             style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === 'table' ? 'var(--card-bg)' : 'transparent', fontSize: '0.7rem', fontWeight: 800, color: viewMode === 'table' ? 'var(--accent-primary)' : 'var(--text-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
           ><Table size={14}/> STANDARD</button>
           <button 
             onClick={() => {
               setBulkText(tasks.map(t => `${t.id},${t.name},${t.time},${t.predecessors.join('|')}`).join('\n'));
               setViewMode('bulk');
             }}
             style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: viewMode === 'bulk' ? 'var(--card-bg)' : 'transparent', fontSize: '0.7rem', fontWeight: 800, color: viewMode === 'bulk' ? 'var(--accent-primary)' : 'var(--text-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
           ><FileText size={14}/> BULK ENTRY</button>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', gap: '1rem', position: 'relative' }}>
        <AnimatePresence>
          {showSaveSuccess && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{ 
                position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)',
                background: '#ccfbf1', color: '#0d9488', 
                padding: '0.5rem 1rem', borderRadius: '4px', 
                display: 'flex', alignItems: 'center', gap: '8px', 
                fontSize: '0.75rem', fontWeight: 800, zIndex: 100,
                border: '1px solid #0d9488'
              }}
            >
                <CheckCircle size={16} /> DATA PERSISTED
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={handleSave}
          style={{ 
            background: 'var(--accent-primary)', color: '#fff', border: 'none', 
            padding: '0.6rem 1.2rem', borderRadius: '4px', fontSize: '0.75rem', 
            fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 4px 0 #0f766e', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Save size={14} /> SAVE MASTER
        </button>

        <button 
          onClick={handleJsonExport}
          style={{ 
            background: 'transparent', color: 'var(--text-sub)', border: '1px solid var(--border-color)', 
            padding: '0.6rem 1.2rem', borderRadius: '4px', fontSize: '0.75rem', 
            fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Download size={14} /> DOWNLOAD .OPTO
        </button>

        <button 
          onClick={() => fileInputRef.current.click()}
          style={{ 
            background: 'transparent', color: 'var(--text-sub)', border: '1px solid var(--border-color)', 
            padding: '0.6rem 1.2rem', borderRadius: '4px', fontSize: '0.75rem', 
            fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Upload size={14} /> IMPORT .OPTO
        </button>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".opto,.json" onChange={handleJsonImport} />

        <button 
          onClick={handleExport}
          style={{ 
            marginLeft: 'auto', background: 'var(--bg-secondary)', color: 'var(--text-sub)', border: '1px solid var(--border-color)', 
            padding: '0.6rem 1.2rem', borderRadius: '4px', fontSize: '0.75rem', 
            fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Download size={14} /> EXPORT CSV
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-main)', padding: '2rem' }}>
        
        {errors.length > 0 && (
          <div style={{ 
            background: 'var(--accent-danger)20', border: '1px solid var(--accent-danger)', 
            padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '2rem',
            display: 'flex', gap: '1.2rem', alignItems: 'center',
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.1)'
          }}>
            <AlertTriangle color="var(--accent-danger)" size={20} />
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent-danger)' }}>DEPENDENCY CONFLICT DETECTED</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--accent-danger)', fontWeight: 600 }}>{errors[0].message}</p>
            </div>
          </div>
        )}

        {viewMode === 'table' ? (
          <div style={{ background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '80px' }}>ID</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900 }}>TASK IDENTIFICATION & DESCRIPTION</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '100px' }}>TIME (MIN)</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '180px' }}>PREDECESSORS</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, width: '140px' }}>ZONING</th>
                  <th style={{ padding: '1rem 1.5rem', color: 'var(--text-sub)', fontWeight: 900, textAlign: 'right', width: '80px' }}>OP</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const taskError = errors.find(e => e.taskId === task.id || (e.cycle && e.cycle.includes(task.id)));
                  return (
                    <tr key={task.id} style={{ borderBottom: '1px solid var(--border-color)', background: taskError ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 900, color: taskError ? 'var(--accent-danger)' : 'var(--accent-primary)', fontSize: '1.1rem' }}>{task.id}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <input 
                          value={task.name}
                          onChange={(e) => updateTask(task.id, 'name', e.target.value)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-white)', width: '100%', outline: 'none', fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <input 
                            type="number"
                            value={task.time}
                            onChange={(e) => updateTask(task.id, 'time', parseFloat(e.target.value) || 0)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-white)', width: '40px', outline: 'none', fontWeight: 900, textAlign: 'right' }}
                          />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 800 }}>MIN</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <PredecessorInput 
                          value={task.predecessors}
                          tasks={tasks}
                          currentId={task.id}
                          isError={!!taskError}
                          onUpdate={(val) => updateTask(task.id, 'predecessors', val)}
                        />
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <select 
                          value={task.zoning || 'None'}
                          onChange={(e) => updateTask(task.id, 'zoning', e.target.value)}
                          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', color: 'var(--text-white)', fontSize: '0.7rem', fontWeight: 800, outline: 'none', width: '100%' }}
                        >
                          <option value="None">None</option>
                          <option value="Positive-1">Positive (Zone 1)</option>
                          <option value="Positive-2">Positive (Zone 2)</option>
                          <option value="Negative-A">Negative (A-Excl)</option>
                          <option value="Negative-B">Negative (B-Excl)</option>
                        </select>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => removeTask(task.id)} 
                          style={{ background: 'transparent', color: 'var(--text-sub)', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={addTask}
                style={{ 
                  background: 'transparent', border: '1px dashed var(--text-sub)', 
                  color: 'var(--text-sub)', padding: '0.8rem 2rem', borderRadius: '6px', 
                  fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Plus size={16} /> APPEND NEW PROCESS STEP
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-white)' }}>BULK CSV DATA ENTRY</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>Format: ID, Description, Time, Predecessors (pipe separated)</p>
             </div>
             <textarea 
               value={bulkText}
               onChange={(e) => setBulkText(e.target.value)}
               style={{ 
                 width: '100%', height: '300px', background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                 borderRadius: '8px', padding: '1.5rem', color: 'var(--text-white)', fontFamily: 'monospace',
                 fontSize: '0.9rem', outline: 'none'
               }}
               placeholder="A,Task Name,10,&#10;B,Next Task,15,A"
             />
             <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={handleBulkSync}
                  style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '0.8rem 2rem', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                >SYNC TO PROCESS GRID</button>
                <button 
                  onClick={() => setViewMode('table')}
                  style={{ background: 'transparent', color: 'var(--text-sub)', border: '1px solid var(--border-color)', padding: '0.8rem 2rem', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}
                >CANCEL</button>
             </div>
          </div>
        )}
      </div>

      <div style={{ padding: '1rem 2rem', background: 'var(--card-bg)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-sub)' }}>
         <div style={{ display: 'flex', gap: '2rem' }}>
           <span>ENGINE RULE: LONGEST TASK FIRST (LTF)</span>
           <span>REAL-TIME CIRCULARITY ANALYTICS: ACTIVE</span>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TooltipIcon size={12} />
            <span>ZONING CONSTRAINTS: ENABLED (V4.1)</span>
         </div>
         <div>SYSTEM STATUS: READY</div>
      </div>
    </motion.div>
  );
};

export default ProcessPlanning;
