import React from 'react';

const StepNavigation = ({ 
  sidebarItems, 
  currentScreen, 
  maxStepReached, 
  navigateTo 
}) => {
  return (
    <div className="no-print" style={{ 
      background: 'var(--card-bg)', 
      borderRadius: '12px', 
      padding: '0.75rem 1.5rem', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)', 
      border: '1px solid var(--border-color)', 
      transition: 'all 0.3s ease' 
    }}>
      {sidebarItems.map((item, idx) => {
        const isActive = currentScreen === item.id;
        const isCompleted = sidebarItems.findIndex(i => i.id === currentScreen) > idx;
        const isLocked = idx > maxStepReached + 1;
        
        return (
          <React.Fragment key={item.id}>
            <div 
              onClick={() => !isLocked && navigateTo(item.id)} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '4px', 
                cursor: isLocked ? 'not-allowed' : 'pointer', 
                opacity: isLocked ? 0.2 : (isActive || isCompleted ? 1 : 0.4), 
                transition: 'all 0.3s' 
              }}
            >
              <div style={{ 
                width: '28px', 
                height: '28px', 
                borderRadius: '50%', 
                background: isActive ? 'var(--accent-primary)' : isCompleted ? '#ccfbf1' : 'var(--bg-tertiary)', 
                border: `2px solid ${isActive ? 'var(--accent-primary)' : isCompleted ? 'var(--accent-primary)' : 'var(--border-color)'}`, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.7rem', 
                fontWeight: 900, 
                color: isActive ? '#fff' : isCompleted ? 'var(--accent-primary)' : 'var(--text-sub)', 
                boxShadow: isActive ? '0 0 10px rgba(13, 148, 136, 0.3)' : 'none' 
              }}>
                {isCompleted ? '✓' : item.num}
              </div>
              <span style={{ 
                fontSize: '0.6rem', 
                fontWeight: 800, 
                color: isActive ? 'var(--accent-primary)' : 'var(--text-sub)', 
                letterSpacing: '0.5px' 
              }}>{item.label.toUpperCase()}</span>
            </div>
            
            {idx < sidebarItems.length - 1 && (
              <div style={{ 
                flex: 1, 
                height: '2px', 
                background: isCompleted ? 'var(--accent-primary)' : 'var(--border-color)', 
                margin: '0 1rem', 
                marginBottom: '14px', 
                opacity: isLocked ? 0.2 : 1 
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepNavigation;
