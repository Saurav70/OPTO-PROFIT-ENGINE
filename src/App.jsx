import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Settings, Network, Box, Zap, Grid, TrendingUp, User, Cpu, ChevronRight, HardDrive, Moon, Sun, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Welcome from './components/Welcome';
import Dashboard from './components/Dashboard';
import ProcessPlanning from './components/ProcessPlanning';
import PrecedenceNetwork from './components/PrecedenceNetwork';
import ConceptualLayout from './components/ConceptualLayout';
import LineOptimization from './components/LineOptimization';
import FloorLayout from './components/FloorLayout';
import FinancialAnalytics from './components/FinancialAnalytics';

const SkeletonLoader = () => (
  <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflow: 'hidden' }}>
    <div style={{ display: 'flex', gap: '1.5rem' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="skeleton" style={{ flex: 1, height: '100px', borderRadius: '8px' }} />
      ))}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', flex: 1 }}>
      <div className="skeleton industrial-pattern" style={{ borderRadius: '12px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ flex: 1, borderRadius: '12px' }} />
        <div className="skeleton" style={{ flex: 1, borderRadius: '12px' }} />
      </div>
    </div>
  </div>
);

const App = () => {
  // Persistence Keys
  const STORAGE_KEYS = {
    TASKS: 'opto_tasks',
    CONFIG: 'opto_config',
    DARK_MODE: 'opto_darkmode',
    PROFILES: 'opto_profiles',
    ACTIVE_PROFILE: 'opto_active_profile_id'
  };

  // Initial State Hydration
  const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
  const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
  const savedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
  const savedProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
  const savedActiveProfileId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE);

  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [darkMode, setDarkMode] = useState(savedDarkMode ? JSON.parse(savedDarkMode) : false);
  const [isLoading, setIsLoading] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(0); 
  
  const [tasks, setTasks] = useState(savedTasks ? JSON.parse(savedTasks) : [
    { id: 'A', name: 'PCB Preparation & Kitting', time: 12, predecessors: [] },
    { id: 'B', name: 'Motherboard SMT & Assembly', time: 18, predecessors: ['A'] },
    { id: 'C', name: 'Display Module Preparation', time: 15, predecessors: ['A'] },
    { id: 'D', name: 'Power Supply Unit (PSU) Prep', time: 10, predecessors: ['A'] },
    { id: 'E', name: 'Core Integration (Board + Display + PSU)', time: 20, predecessors: ['B', 'C', 'D'] },
    { id: 'F', name: 'Firmware Flashing & Calibration', time: 25, predecessors: ['E'] },
    { id: 'G', name: 'Chassis Housing Assembly', time: 14, predecessors: ['F'] },
    { id: 'H', name: 'Final QA, Testing & Packaging', time: 16, predecessors: ['G'] },
  ]);
  
  const [config, setConfig] = useState(savedConfig ? JSON.parse(savedConfig) : {
    shiftTime: 480,
    demand: 16,
    productName: 'Digital Oscilloscope Model-X',
    workDaysPerMonth: 20,
    unitPrice: 5000,
    unitCost: 3500,
    currentCycleTime: 35,
    currentOperators: 6
  });

  const [profiles, setProfiles] = useState(savedProfiles ? JSON.parse(savedProfiles) : []);
  const [activeProfileId, setActiveProfileId] = useState(savedActiveProfileId || null);

  // Persistence Effects
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config)); }, [config]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(darkMode));
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, activeProfileId || ''); }, [activeProfileId]);

  // Profile Handlers
  const saveProfile = useCallback((name) => {
    const newProfile = {
      id: Date.now().toString(),
      name,
      tasks: [...tasks],
      config: { ...config },
      timestamp: new Date().toISOString()
    };
    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
  }, [tasks, config]);

  const loadProfile = useCallback((id) => {
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      setIsLoading(true);
      setTasks(profile.tasks);
      setConfig(profile.config);
      setActiveProfileId(id);
      setTimeout(() => setIsLoading(false), 600);
    }
  }, [profiles]);

  const deleteProfile = useCallback((id) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) setActiveProfileId(null);
  }, [activeProfileId]);

  const sidebarItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', num: 1 },
    { id: 'planning', icon: Settings, label: 'Process Planning', num: 2 },
    { id: 'network', icon: Network, label: 'Precedence Network', num: 3 },
    { id: 'conceptual', icon: Box, label: 'Conceptual Layout', num: 4 },
    { id: 'optimization', icon: Zap, label: 'Line Optimization', num: 5 },
    { id: 'floor', icon: Grid, label: 'Floor Layout', num: 6 },
    { id: 'financials', icon: TrendingUp, label: 'Financial Performance', num: 7 },
  ];

  const navigateTo = (screen) => {
    if (screen === currentScreen) return;
    const targetIdx = sidebarItems.findIndex(i => i.id === screen);
    if (targetIdx > maxStepReached + 1) return; 
    setIsLoading(true);
    setCurrentScreen(screen);
    if (targetIdx > maxStepReached) setMaxStepReached(targetIdx);
    setTimeout(() => setIsLoading(false), 800);
  };

  if (currentScreen === 'welcome') {
    return (
      <div className="welcome-page">
        <Welcome onContinue={() => navigateTo('dashboard')} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', transition: 'all 0.3s ease' }}>
      
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
          <div style={{ width: '42px', height: '42px', background: 'var(--accent-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(13, 148, 136, 0.4)' }}>
            <Cpu size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}>OPTO-PROFIT</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--accent-primary)', fontWeight: 800, letterSpacing: '1px' }}>INDUSTRIAL ENGINE v4.0</div>
          </div>
        </div>

        <div style={{ fontSize: '0.65rem', color: 'var(--text-sidebar)', marginBottom: '1.2rem', fontWeight: 900, letterSpacing: '2px', opacity: 0.6 }}>ENGINE MODULES</div>
        
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sidebarItems.map((item, idx) => {
            const isActive = currentScreen === item.id;
            const isLocked = idx > maxStepReached + 1;
            return (
              <motion.div key={item.id} onClick={() => !isLocked && navigateTo(item.id)} whileHover={!isLocked ? { x: 4 } : {}} transition={{ duration: 0.2 }} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '0.8rem 1rem', borderRadius: '8px', cursor: isLocked ? 'not-allowed' : 'pointer', background: isActive ? 'rgba(13, 148, 136, 0.15)' : 'transparent', border: `1px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`, color: isLocked ? 'var(--bg-tertiary)' : isActive ? 'var(--accent-primary)' : 'var(--text-sidebar)', transition: 'background 0.2s, border 0.2s, color 0.2s', opacity: isLocked ? 0.4 : 1 }}>
                <item.icon size={18} style={{ opacity: isActive ? 1 : 0.6 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, flex: 1 }}>{item.label}</span>
                {isLocked ? <Lock size={12} /> : isActive && <ChevronRight size={14} />}
              </motion.div>
            );
          })}
        </nav>
        
        <div style={{ marginTop: 'auto', padding: '1.5rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div style={{ width: '32px', height: '32px', background: 'var(--bg-tertiary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <User size={16} color="var(--accent-primary)" />
              </div>
              <div style={{ flex: 1 }}>
                 <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>A. ENGINEER</div>
                 <div style={{ fontSize: '0.6rem', color: 'var(--text-sidebar)', fontWeight: 700 }}>ROOT PRIVILEGES</div>
              </div>
              <div onClick={() => setDarkMode(!darkMode)} style={{ cursor: 'pointer', color: 'var(--accent-primary)', opacity: 0.8 }}>
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </div>
           </div>
           <div style={{ fontSize: '0.65rem', color: 'var(--text-sidebar)', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.6 }}>
              <HardDrive size={10} />
              <span>CLUSTER: AP-SOUTHEAST-1</span>
           </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '1.5rem', maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="no-print" style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', transition: 'all 0.3s ease' }}>
          {sidebarItems.map((item, idx) => {
            const isActive = currentScreen === item.id;
            const isCompleted = sidebarItems.findIndex(i => i.id === currentScreen) > idx;
            const isLocked = idx > maxStepReached + 1;
            return (
              <React.Fragment key={item.id}>
                <div onClick={() => !isLocked && navigateTo(item.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.2 : (isActive || isCompleted ? 1 : 0.4), transition: 'all 0.3s' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isActive ? 'var(--accent-primary)' : isCompleted ? '#ccfbf1' : 'var(--bg-tertiary)', border: `2px solid ${isActive ? 'var(--accent-primary)' : isCompleted ? 'var(--accent-primary)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: isActive ? '#fff' : isCompleted ? 'var(--accent-primary)' : 'var(--text-sub)', boxShadow: isActive ? '0 0 10px rgba(13, 148, 136, 0.3)' : 'none' }}>
                    {isCompleted ? '✓' : item.num}
                  </div>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: isActive ? 'var(--accent-primary)' : 'var(--text-sub)', letterSpacing: '0.5px' }}>{item.label.toUpperCase()}</span>
                </div>
                {idx < sidebarItems.length - 1 && (
                  <div style={{ flex: 1, height: '2px', background: isCompleted ? 'var(--accent-primary)' : 'var(--border-color)', margin: '0 1rem', marginBottom: '14px', opacity: isLocked ? 0.2 : 1 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ background: 'var(--card-bg)', borderRadius: '16px', flex: 1, boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%', height: '100%' }}><SkeletonLoader /></motion.div>
            ) : (
              <motion.div key={currentScreen} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} style={{ width: '100%', height: '100%' }}>
                {currentScreen === 'dashboard' && <Dashboard tasks={tasks} config={config} setConfig={setConfig} onNavigate={navigateTo} profiles={profiles} activeProfileId={activeProfileId} onSaveProfile={saveProfile} onLoadProfile={loadProfile} onDeleteProfile={deleteProfile} />}
                {currentScreen === 'planning' && <ProcessPlanning tasks={tasks} setTasks={setTasks} config={config} onNavigate={navigateTo} />}
                {currentScreen === 'network' && <PrecedenceNetwork tasks={tasks} />}
                {currentScreen === 'conceptual' && <ConceptualLayout tasks={tasks} config={config} />}
                {currentScreen === 'optimization' && <LineOptimization tasks={tasks} config={config} />}
                {currentScreen === 'floor' && <FloorLayout tasks={tasks} config={config} />}
                {currentScreen === 'financials' && <FinancialAnalytics tasks={tasks} config={config} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default App;
