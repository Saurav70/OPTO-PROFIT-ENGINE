import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LayoutDashboard, Settings, Network, Box, Zap, Grid, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './services/api';
import Sidebar from './components/Sidebar';

import Welcome from './components/Welcome';
import Dashboard from './components/Dashboard';
import ProcessPlanning from './components/ProcessPlanning';
import PrecedenceNetwork from './components/PrecedenceNetwork';
import ConceptualLayout from './components/ConceptualLayout';
import LineOptimization from './components/LineOptimization';
import FloorLayout from './components/FloorLayout';
import FinancialAnalytics from './components/FinancialAnalytics';
import { calculateTaktTime, runOptimization } from './utils/optimizer';

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

const STORAGE_KEYS = {
  TASKS: 'opto_tasks',
  CONFIG: 'opto_config',
  DARK_MODE: 'opto_darkmode',
  PROFILES: 'opto_profiles',
  ACTIVE_PROFILE: 'opto_active_profile_id',
  AUTH_TOKEN: 'opto_auth_token'
};

const App = () => {
  // Initial State Hydration
  const savedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
  const savedProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
  const savedActiveProfileId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE);

  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [darkMode, setDarkMode] = useState(savedDarkMode ? JSON.parse(savedDarkMode) : false);
  const [isLoading, setIsLoading] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(0); 
  const [twoFactorRequired, setTwoFactorRequired] = useState(false); // New state for 2FA
  
  const [tasks, setTasks] = useState([]);
  const [config, setConfig] = useState({});

  useEffect(() => {
    const verifySession = async () => {
      const token = api.auth.getToken(); // Use api.auth.getToken() to check main token
      const temp2faToken = api.auth.getTemp2faToken(); // Check for temporary 2FA token

      if (!token && !temp2faToken) {
        setAuthChecked(true);
        return;
      }

      try {
        await api.get('/api/auth/me', { useTempToken: !!temp2faToken }); // Use temp token if available
        setIsAuthenticated(true);
        setCurrentScreen('dashboard');
        // If there was a temp2faToken and /me succeeds, it means 2FA was already verified for this session
        // and the main token would have been set by apiRequest.
      } catch (err) {
        console.error('Session verification failed:', err);
        api.auth.clearToken(); // Clears both main and temp 2FA token
        setIsAuthenticated(false);
        setTwoFactorRequired(false);
      } finally {
        setAuthChecked(true);
      }
    };
    verifySession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        const [tasksData, configData] = await Promise.all([
          api.get('/api/tasks'),
          api.get('/api/config')
        ]);
        setTasks(tasksData);
        setConfig(configData);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  const [profiles, setProfiles] = useState(savedProfiles ? JSON.parse(savedProfiles) : []);
  const [activeProfileId, setActiveProfileId] = useState(savedActiveProfileId || null);

  // Shared optimization result — single source of truth for all modules
  const sharedOptimization = useMemo(() => {
    const takt = calculateTaktTime(config);
    return runOptimization(tasks, takt, 'LTF', config);
  }, [tasks, config]);

  // Persistence Effects
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config)); }, [config]);
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(darkMode));
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // Initial fetch for profiles
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchProfiles = async () => {
      try {
        const data = await api.get('/api/profiles');
        setProfiles(data);
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
      }
    };
    fetchProfiles();
  }, [isAuthenticated]);

  const handleAuthSuccess = useCallback((response) => {
    setAuthError('');
    if (response?.two_factor_required) {
      setTwoFactorRequired(true);
      // Keep isAuthenticated as false until 2FA is verified
    } else {
      setIsAuthenticated(true);
      setCurrentScreen('dashboard');
      setMaxStepReached(0);
      setTwoFactorRequired(false);
    }
  }, []);

  const handle2faSuccess = useCallback(() => {
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    setMaxStepReached(0);
    setTwoFactorRequired(false);
    api.auth.clearTemp2faToken(); // Clear temp token after successful 2FA
  }, []);

  // Profile Handlers
  const saveProfile = useCallback(async (name) => {
    const newProfile = {
      id: Date.now().toString(),
      name,
      tasks: [...tasks],
      config: { ...config },
      timestamp: new Date().toISOString()
    };
    try {
      await api.post('/api/profiles', newProfile);
      setProfiles(prev => [...prev, newProfile]);
      setActiveProfileId(newProfile.id);
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  }, [tasks, config]);

  const handleSaveConfig = useCallback(async (newConfig) => {
    try {
      await api.put('/api/config', newConfig);
      setConfig(newConfig);
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  }, []);

  const loadProfile = useCallback(async (id) => {
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      setIsLoading(true);
      setTasks(profile.tasks);
      setConfig(profile.config);
      setActiveProfileId(id);
      setTimeout(() => setIsLoading(false), 600);
    }
  }, [profiles]);

  const deleteProfile = useCallback(async (id) => {
    try {
      await api.delete(`/api/profiles/${id}`);
      setProfiles(prev => prev.filter(p => p.id !== id));
      if (activeProfileId === id) setActiveProfileId(null);
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
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

  if (!authChecked) {
    return <div style={{ padding: '2rem' }}>Checking session...</div>;
  }

  if (twoFactorRequired) {
    return (
      <div className="welcome-page">
        <Welcome 
          onAuthSuccess={handleAuthSuccess} 
          authError={authError} 
          setAuthError={setAuthError}
          twoFactorRequired={true}
          on2faSuccess={handle2faSuccess}
        />
      </div>
    );
  }

  if (!isAuthenticated || currentScreen === 'welcome') {
    return (
      <div className="welcome-page">
        <Welcome 
          onAuthSuccess={handleAuthSuccess} 
          authError={authError} 
          setAuthError={setAuthError}
          twoFactorRequired={false}
          on2faSuccess={handle2faSuccess} // This won't be used but passed for consistency
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', transition: 'all 0.3s ease' }}>
      
      <Sidebar 
        sidebarItems={sidebarItems}
        currentScreen={currentScreen}
        maxStepReached={maxStepReached}
        navigateTo={navigateTo}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main style={{ flex: 1, padding: '1.5rem', maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <div style={{ background: 'var(--card-bg)', borderRadius: '16px', flex: 1, boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%', height: '100%' }}><SkeletonLoader /></motion.div>
            ) : (
              <motion.div key={currentScreen} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} style={{ width: '100%', height: '100%' }}>
                {currentScreen === 'dashboard' && <Dashboard tasks={tasks} config={config} setConfig={handleSaveConfig} onNavigate={navigateTo} profiles={profiles} activeProfileId={activeProfileId} onSaveProfile={saveProfile} onLoadProfile={loadProfile} onDeleteProfile={deleteProfile} optimization={sharedOptimization} />}
                {currentScreen === 'planning' && <ProcessPlanning tasks={tasks} setTasks={setTasks} config={config} onNavigate={navigateTo} optimization={sharedOptimization} />}
                {currentScreen === 'network' && <PrecedenceNetwork tasks={tasks} />}
                {currentScreen === 'conceptual' && <ConceptualLayout tasks={tasks} config={config} optimization={sharedOptimization} />}
                {currentScreen === 'optimization' && <LineOptimization tasks={tasks} config={config} optimization={sharedOptimization} />}
                {currentScreen === 'floor' && <FloorLayout tasks={tasks} config={config} />}
                {currentScreen === 'financials' && <FinancialAnalytics tasks={tasks} config={config} optimization={sharedOptimization} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default App;
