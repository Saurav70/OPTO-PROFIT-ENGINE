import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Download, AlertTriangle, Eye } from 'lucide-react';
import { detectCircularDependency } from '../utils/optimizer';

const ProcessPlanning = ({ tasks, setTasks, config, onNavigate }) => {
  const [errors, setErrors] = useState([]);
  
  // Validate whenever tasks change
  useEffect(() => {
    const newErrors = detectCircularDependency(tasks);
    setErrors(newErrors);
  }, [tasks]);

  const addTask = () => {
    const newId = String.fromCharCode(65 + tasks.length); // A, B, C...
    setTasks([...tasks, { id: newId, name: 'New Task', time: 5, predecessors: [] }]);
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

  return (
    <div className="animate-fade">
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Process Planning</h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '1.1rem' }}>Manufacturing Line: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{config.productName}</span></p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1.5rem', border: '1px solid var(--glass-border)', background: 'transparent' }}>
             <Download size={18} color="var(--accent-primary)" />
             <span style={{ fontSize: '0.9rem', color: 'var(--text-white)', fontWeight: 600 }}>EXPORT DATA</span>
           </button>
           <button 
             onClick={() => onNavigate && onNavigate('network')}
             style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1.5rem', background: 'var(--accent-secondary)', color: 'var(--bg-primary)', fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
             <Eye size={18} />
             <span>VISUALIZE FLOW</span>
           </button>
           <button style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1.5rem', background: 'var(--accent-primary)', color: 'var(--bg-primary)', fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
             <Save size={18} />
             <span>SAVE PROCESS</span>
           </button>
        </div>
      </header>

      {errors.length > 0 && (
        <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', borderColor: 'var(--accent-danger)', background: 'rgba(245, 101, 101, 0.05)' }}>
          <AlertTriangle color="var(--accent-danger)" size={24} />
          <div>
            <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--accent-danger)' }}>Optimization Alert</h4>
            {errors.map((e, idx) => (
              <p key={idx} style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-sub)' }}>{e.message}</p>
            ))}
          </div>
        </div>
      )}

      <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '1.5rem', color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Task ID</th>
              <th style={{ padding: '1.5rem', color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Task Description</th>
              <th style={{ padding: '1.5rem', color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Standard Time (mins)</th>
              <th style={{ padding: '1.5rem', color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Predecessor(s)</th>
              <th style={{ padding: '1.5rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => {
              const taskError = errors.find(e => e.taskId === task.id || (e.cycle && e.cycle.includes(task.id)));
              const rowStyle = {
                borderBottom: '1px solid var(--glass-border)',
                transition: 'var(--transition-fast)',
                backgroundColor: taskError ? 'rgba(245, 101, 101, 0.1)' : 'transparent'
              };

              return (
                <tr key={task.id} style={rowStyle} className="table-row-hover">
                  <td style={{ padding: '1.5rem', color: taskError ? 'var(--accent-danger)' : 'var(--accent-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{task.id}</td>
                  <td style={{ padding: '1.5rem' }}>
                    <input 
                      value={task.name}
                      onChange={(e) => updateTask(task.id, 'name', e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-white)', width: '100%', outline: 'none' }}
                    />
                  </td>
                  <td style={{ padding: '1.5rem' }}>
                    <input 
                      type="number"
                      value={task.time}
                      onChange={(e) => updateTask(task.id, 'time', parseFloat(e.target.value) || 0)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-white)', width: '80px', outline: 'none' }}
                    />
                  </td>
                  <td style={{ padding: '1.5rem' }}>
                     <input 
                      value={task.predecessors.join(', ')}
                      placeholder="None"
                      onChange={(e) => updateTask(task.id, 'predecessors', e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: taskError ? 'var(--accent-danger)' : 'var(--accent-warning)', width: '100%', outline: 'none', fontStyle: task.predecessors.length === 0 ? 'italic' : 'normal' }}
                    />
                  </td>
                  <td style={{ padding: '1.5rem', textAlign: 'right' }}>
                    <button onClick={() => removeTask(task.id)} style={{ background: 'transparent', padding: '0.4rem', color: 'rgba(245, 101, 101, 0.4)', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.01)' }}>
          <button 
            onClick={addTask}
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'transparent', color: 'var(--text-sub)', border: '1px dashed var(--glass-border)', width: '200px', justifyContent: 'center', padding: '0.8rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            <Plus size={18} />
            <span>ADD NEW TASK</span>
          </button>
        </div>
      </div>
      
      <p style={{ marginTop: '2rem', color: 'var(--text-sub)', fontSize: '0.85rem', fontStyle: 'italic', display: 'flex', justifyContent: 'space-between' }}>
        <span>Note: The optimization engine uses the <strong>Longest Task First (LTF)</strong> rule for line balancing calculations.</span>
        <span>Press Enter to save row. Circles will be auto-validated</span>
      </p>
    </div>
  );
};

export default ProcessPlanning;
