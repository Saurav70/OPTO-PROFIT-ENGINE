import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Calculator, Code, Save, Play, Hash, Terminal } from 'lucide-react';
import { evaluateFormula, buildContext } from '../utils/formulaEngine';

const OPERATORS = [
  { label: '+', value: '+' },
  { label: '-', value: '-' },
  { label: '*', value: '*' },
  { label: '/', value: '/' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
  { label: 'IF', value: '?' },
  { label: 'THEN', value: ':' },
  { label: '>', value: '>' },
  { label: '<', value: '<' },
  { label: '==', value: '==' },
];

const FormulaEditor = ({ formula, variables, onSave, onCancel, title = "Formula Editor" }) => {
  const [isTextMode, setIsTextMode] = useState(false);
  const [textFormula, setTextFormula] = useState(formula || '');
  const [blocks, setBlocks] = useState([]);
  const idCounter = useRef(0);

  // Convert string formula to blocks (naive parser for initialization)
  useEffect(() => {
    if (formula && blocks.length === 0) {
      // Very simple split by spaces for demo purposes
      const parts = formula.split(/(\s+|\+|-|\*|\/|\(|\)|\?|:|>|<|==)/).filter(p => p.trim());
      setBlocks(parts.map((p) => ({ id: `b-${idCounter.current++}`, value: p.trim() })));
    }
  }, [formula, blocks.length]);

  const currentFormula = isTextMode ? textFormula : blocks.map(b => b.value).join(' ');
  const context = buildContext(variables);
  const previewResult = evaluateFormula(currentFormula, context);

  const addBlock = (val) => {
    setBlocks([...blocks, { id: `block-${idCounter.current++}`, value: val }]);
  };

  const removeBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const handleSave = () => {
    const finalFormula = isTextMode ? textFormula : blocks.map(b => b.value).join(' ');
    onSave(finalFormula);
  };

  return (
    <div className="industrial-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glow-card" 
        style={{ width: '100%', maxWidth: '900px', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'var(--accent-primary)20', borderRadius: '8px' }}>
              <Calculator size={20} color="var(--accent-primary)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-white)' }}>{title}</h3>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-sub)' }}>Universal Mathematical Logic Builder</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button 
              onClick={() => setIsTextMode(!isTextMode)} 
              className="btn-outline" 
              style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: isTextMode ? 'var(--accent-primary)' : 'var(--border-color)' }}
            >
              {isTextMode ? <Terminal size={14} /> : <Code size={14} />} {isTextMode ? 'BLOCK MODE' : 'TEXT MODE'}
            </button>
            <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '250px 1fr', overflow: 'hidden' }}>
          
          {/* Palette */}
          <div style={{ borderRight: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', overflowY: 'auto', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Variables */}
            <div>
              <h4 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '1px', marginBottom: '10px' }}>VARIABLES</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {variables.map(v => (
                  <button 
                    key={v.key} 
                    onClick={() => addBlock(v.key)}
                    style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-white)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    className="hover-glow"
                  >
                    <Hash size={12} color="var(--accent-secondary)" /> {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Operators */}
            <div>
              <h4 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '1px', marginBottom: '10px' }}>OPERATORS</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {OPERATORS.map(op => (
                  <button 
                    key={op.label} 
                    onClick={() => addBlock(op.value)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-white)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                    className="hover-glow"
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div style={{ background: 'var(--bg-main)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ flex: 1, position: 'relative', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '2px dashed var(--border-color)', padding: '1.5rem', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: '10px' }}>
              <AnimatePresence>
                {isTextMode ? (
                  <textarea 
                    value={textFormula}
                    onChange={(e) => setTextFormula(e.target.value)}
                    style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '1.2rem', fontFamily: 'monospace', outline: 'none', resize: 'none' }}
                    placeholder="Type formula here... e.g. (shift_time - 30) / demand"
                  />
                ) : (
                  blocks.length === 0 ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)', fontSize: '0.8rem' }}>
                      Add variables and operators from the sidebar to build your formula
                    </div>
                  ) : (
                    blocks.map((block) => (
                      <motion.div 
                        key={block.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)40', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: variables.some(v => v.key === block.value) ? 'var(--accent-secondary)' : 'var(--text-white)' }}>
                          {variables.find(v => v.key === block.value)?.label || block.value}
                        </span>
                        <X size={12} style={{ cursor: 'pointer', color: 'var(--accent-danger)' }} onClick={() => removeBlock(block.id)} />
                      </motion.div>
                    ))
                  )
                )}
              </AnimatePresence>
            </div>

            {/* Preview Strip */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '1.2rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'var(--accent-secondary)20', padding: '10px', borderRadius: '50%' }}>
                  <Play size={16} color="var(--accent-secondary)" />
                </div>
                <div>
                  <h5 style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-sub)', letterSpacing: '1px' }}>LIVE RESULT PREVIEW</h5>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-white)' }}>
                    {typeof previewResult === 'number' ? previewResult.toFixed(2) : 'ERROR'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={onCancel} className="btn-outline" style={{ padding: '0.8rem 1.5rem' }}>CANCEL</button>
                <button onClick={handleSave} className="btn-primary" style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} /> SAVE FORMULA
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FormulaEditor;
