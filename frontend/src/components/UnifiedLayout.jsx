import React, { useState } from 'react';
import { LayoutGrid, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConceptualLayout from './ConceptualLayout';
import FloorLayout from './FloorLayout';

const UnifiedLayout = ({ tasks, config, setConfig, optimization, onOverrideOptimization, onNavigate }) => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'canvas'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* View Toggle Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 0 0.75rem 0',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            padding: '3px',
            gap: '2px',
          }}
        >
          {[
            { id: 'grid', label: 'Grid View', icon: LayoutGrid },
            { id: 'canvas', label: 'Canvas View', icon: Map },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: '0.7rem',
                  letterSpacing: '0.8px',
                  background: 'transparent',
                  color: isActive ? '#fff' : 'var(--text-sub)',
                  transition: 'color 0.2s ease',
                  overflow: 'hidden'
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeViewTab"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'var(--accent-primary)',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'var(--shadow-glow)',
                      zIndex: 0
                    }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon size={14} />
                  {tab.label.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginLeft: 'auto',
            fontSize: '0.62rem',
            fontWeight: 800,
            color: 'var(--text-sub)',
            letterSpacing: '0.5px',
          }}
        >
          {viewMode === 'grid' ? 'Station cards with task assignments' : 'Interactive 2D floor canvas with flow simulation'}
        </div>
      </div>

      {/* View Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={{ height: '100%' }}
          >
            {viewMode === 'grid' ? (
              <ConceptualLayout
                tasks={tasks}
                config={config}
                optimization={optimization}
                onNavigate={onNavigate}
                onOverrideOptimization={onOverrideOptimization}
                embedded
              />
            ) : (
              <FloorLayout
                tasks={tasks}
                config={config}
                setConfig={setConfig}
                optimization={optimization}
                onNavigate={onNavigate}
                embedded
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default UnifiedLayout;
