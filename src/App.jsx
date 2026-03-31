import React, { useState } from 'react';
import { LayoutDashboard, Settings, Network, Box, Zap, Grid, TrendingUp, User } from 'lucide-react';
import Welcome from './components/Welcome';
import Dashboard from './components/Dashboard';
import ProcessPlanning from './components/ProcessPlanning';
import PrecedenceNetwork from './components/PrecedenceNetwork';
import ConceptualLayout from './components/ConceptualLayout';
import LineOptimization from './components/LineOptimization';
import FloorLayout from './components/FloorLayout';
import FinancialAnalytics from './components/FinancialAnalytics';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [tasks, setTasks] = useState([
    { id: 'A', name: 'PCB Preparation & Kitting', time: 12, predecessors: [] },
    { id: 'B', name: 'Motherboard SMT & Assembly', time: 18, predecessors: ['A'] },
    { id: 'C', name: 'Display Module Preparation', time: 15, predecessors: ['A'] },
    { id: 'D', name: 'Power Supply Unit (PSU) Prep', time: 10, predecessors: ['A'] },
    { id: 'E', name: 'Core Integration (Board + Display + PSU)', time: 20, predecessors: ['B', 'C', 'D'] },
    { id: 'F', name: 'Firmware Flashing & Calibration', time: 25, predecessors: ['E'] },
    { id: 'G', name: 'Chassis Housing Assembly', time: 14, predecessors: ['F'] },
    { id: 'H', name: 'Final QA, Testing & Packaging', time: 16, predecessors: ['G'] },
  ]);
  
  const [config, setConfig] = useState({
    shiftTime: 480,
    demand: 16,
    productName: 'Digital Oscilloscope Model-X',
    workDaysPerMonth: 20,
    unitPrice: 5000,
    unitCost: 3500,
    currentCycleTime: 35,
    currentOperators: 6
  });

  const sidebarItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', num: 1 },
    { id: 'planning', icon: Settings, label: 'Process Planning', num: 2 },
    { id: 'network', icon: Network, label: 'Precedence Network', num: 3 },
    { id: 'conceptual', icon: Box, label: 'Conceptual Layout', num: 4 },
    { id: 'optimization', icon: Zap, label: 'Line Optimization', num: 5 },
    { id: 'floor', icon: Grid, label: 'Floor Layout', num: 6 },
    { id: 'financials', icon: TrendingUp, label: 'Financial Performance', num: 7 },
  ];

  if (currentScreen === 'welcome') {
    return <Welcome onContinue={() => setCurrentScreen('dashboard')} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '280px',
        background: 'var(--bg-secondary)',
        padding: '1.5rem 1rem',
        borderRight: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '2.5rem', padding: '0 0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #007d8a 0%, #64ffda 100%)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '0.7rem', color: '#fff', letterSpacing: '1px'
          }}>TE</div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '1.5px' }}>TEIRAC</div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-sub)', letterSpacing: '2px' }}>INNOVATE. ELEVATE.</div>
          </div>
        </div>

        <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)', padding: '0 0.5rem', marginBottom: '0.8rem', fontWeight: 600, letterSpacing: '1.5px' }}>NAVIGATION</div>
        
        <nav style={{ flex: 1 }}>
          {sidebarItems.map(item => {
            const isActive = currentScreen === item.id;
            return (
              <div 
                key={item.id}
                onClick={() => setCurrentScreen(item.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.8rem',
                  padding: '0.7rem 0.8rem', marginBottom: '2px', borderRadius: '8px',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  backgroundColor: isActive ? 'rgba(100, 255, 218, 0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-sub)'
                }}
              >
                <span style={{ fontSize: '0.65rem', fontWeight: 700, width: '18px', opacity: 0.5 }}>{item.num}.</span>
                <item.icon size={16} />
                <span style={{ fontSize: '0.8rem', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              </div>
            );
          })}
        </nav>
        
        {/* User Profile */}
        <div style={{ padding: '1.2rem 0.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--bg-tertiary), #1a2744)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--glass-border)'
          }}>
            <User size={16} color="var(--text-white)" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-white)', fontWeight: 600 }}>A. Engineer</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>Production Lead</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem', maxHeight: '100vh' }}>
        {currentScreen === 'dashboard' && <Dashboard tasks={tasks} config={config} setConfig={setConfig} onNavigate={setCurrentScreen} />}
        {currentScreen === 'planning' && <ProcessPlanning tasks={tasks} setTasks={setTasks} config={config} onNavigate={setCurrentScreen} />}
        {currentScreen === 'network' && <PrecedenceNetwork tasks={tasks} />}
        {currentScreen === 'conceptual' && <ConceptualLayout tasks={tasks} config={config} />}
        {currentScreen === 'optimization' && <LineOptimization tasks={tasks} config={config} />}
        {currentScreen === 'floor' && <FloorLayout tasks={tasks} config={config} />}
        {currentScreen === 'financials' && <FinancialAnalytics tasks={tasks} config={config} />}
      </main>
    </div>
  );
};

export default App;
