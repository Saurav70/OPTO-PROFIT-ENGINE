import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Lock, ChevronRight, Sun, Moon } from 'lucide-react';

const Sidebar = ({ 
  sidebarItems, 
  currentScreen, 
  maxStepReached, 
  navigateTo, 
  darkMode, 
  setDarkMode 
}) => {
  return (
    <aside className="no-print" style={{
      width: '300px',
      background: 'var(--sidebar-bg)',
      padding: '2rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      boxShadow: '10px 0 30px rgba(0,0,0,0.1)',
      zIndex: 100,
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '42px', 
          height: '42px', 
          background: 'var(--accent-primary)', 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          boxShadow: '0 0 20px rgba(13, 148, 136, 0.4)' 
        }}>
          <Cpu size={24} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}>OPTO-PROFIT</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--accent-primary)', fontWeight: 800, letterSpacing: '1px' }}>INDUSTRIAL ENGINE v4.0</div>
        </div>
      </div>

      <div style={{ 
        fontSize: '0.65rem', 
        color: 'var(--text-sidebar)', 
        marginBottom: '1.2rem', 
        fontWeight: 900, 
        letterSpacing: '2px', 
        opacity: 0.6 
      }}>ENGINE MODULES</div>
      
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sidebarItems.map((item, idx) => {
          const isActive = currentScreen === item.id;
          const isLocked = idx > maxStepReached + 1;
          return (
            <motion.div 
              key={item.id} 
              onClick={() => !isLocked && navigateTo(item.id)} 
              className={`sidebar-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
              whileHover={!isLocked ? { x: 4 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <item.icon size={18} style={{ opacity: isActive ? 1 : 0.6 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, flex: 1 }}>{item.label}</span>
              {isLocked ? <Lock size={12} /> : isActive && <ChevronRight size={14} />}
            </motion.div>
          );
        })}
      </nav>
      
      <div style={{ 
        marginTop: 'auto', 
        padding: '1rem', 
        display: 'flex', 
        justifyContent: 'center', 
        borderTop: '1px solid rgba(255,255,255,0.05)' 
      }}>
         <div 
          onClick={() => setDarkMode(!darkMode)} 
          style={{ 
            cursor: 'pointer', 
            color: 'var(--accent-primary)', 
            opacity: 0.8, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.75rem', 
            fontWeight: 800 
          }}
        >
           {darkMode ? <Sun size={16} /> : <Moon size={16} />}
           <span>{darkMode ? 'LIGHT MODE' : 'DARK MODE'}</span>
         </div>
      </div>
    </aside>
  );
};

export default Sidebar;
