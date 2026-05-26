import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { LayoutDashboard, Settings, Network, Box, Zap, Grid, TrendingUp, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './services/api';
import Sidebar from './components/Sidebar';
import SettingsLayout from './components/SettingsLayout';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import ToastContainer, { useToast } from './components/Toast';

// Lazy-loaded components for performance
const Welcome = lazy(() => import('./components/Welcome'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ProcessPlanning = lazy(() => import('./components/ProcessPlanning'));
const ConceptualLayout = lazy(() => import('./components/ConceptualLayout'));
const LineOptimization = lazy(() => import('./components/LineOptimization'));
const FinancialAnalytics = lazy(() => import('./components/FinancialAnalytics'));
const PrecedenceNetwork = lazy(() => import('./components/PrecedenceNetwork'));
const FloorLayout = lazy(() => import('./components/FloorLayout'));

import { calculateTaktTime, runOptimization } from './utils/optimizer';
import { oscilloscopeSampleProfile } from './data/sampleProfiles';

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
  // Initial State Hydration (P0-2: hydrate from localStorage for offline resilience)
  const savedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
  const savedProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
  const savedActiveProfileId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE);
  const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
  const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);

  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [darkMode, setDarkMode] = useState(savedDarkMode ? JSON.parse(savedDarkMode) : false);
  const [isLoading, setIsLoading] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false); // New state for 2FA
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [tasks, setTasks] = useState(() => { try { return savedTasks ? JSON.parse(savedTasks) : []; } catch { return []; } });
  const [config, setConfig] = useState(() => { try { return savedConfig ? JSON.parse(savedConfig) : {}; } catch { return {}; } });
  const [dataLoaded, setDataLoaded] = useState(false);
  const lastSavedTasksJsonRef = useRef('');
  const autosaveTimerRef = useRef(null);

  // P0-1: Toast notifications for autosave and other async feedback
  const [toasts, addToast, dismissToast] = useToast();

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
        lastSavedTasksJsonRef.current = JSON.stringify(tasksData);
        setDataLoaded(true);
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
      // P2-2: Caller now explicitly stores the main auth token
      if (response?.access_token) {
        api.auth.setToken(response.access_token);
      }
      setIsAuthenticated(true);
      setCurrentScreen('dashboard');
      setMaxStepReached(0);
      setTwoFactorRequired(false);
    }
  }, []);

  const handle2faSuccess = useCallback((response) => {
    // P2-2: Caller stores token after successful 2FA verification
    if (response?.access_token) {
      api.auth.setToken(response.access_token);
    }
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

  const handleSaveTasks = useCallback(async (nextTasks) => {
    try {
      const savedTasks = await api.put('/api/tasks', nextTasks);
      lastSavedTasksJsonRef.current = JSON.stringify(savedTasks);
      setTasks(savedTasks);
      return savedTasks;
    } catch (err) {
      console.error('Failed to save tasks:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !dataLoaded) return undefined;

    const serializedTasks = JSON.stringify(tasks);
    if (serializedTasks === lastSavedTasksJsonRef.current) return undefined;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      handleSaveTasks(tasks).catch(() => {
        addToast({ message: 'Autosave failed — your changes are saved locally but not synced to the server.', variant: 'warning', duration: 8000 });
      });
    }, 600);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [tasks, isAuthenticated, dataLoaded, handleSaveTasks, addToast]);

  const loadProfile = useCallback(async (id) => {
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      setIsLoading(true);
      setTasks(profile.tasks);
      setConfig(profile.config);
      lastSavedTasksJsonRef.current = JSON.stringify(profile.tasks);
      try {
        await Promise.all([
          api.put('/api/tasks', profile.tasks),
          api.put('/api/config', profile.config)
        ]);
      } catch (err) {
        console.error('Failed to persist loaded profile:', err);
      }
      setActiveProfileId(id);
      setIsLoading(false);
    }
  }, [profiles]);

  const loadSampleProfile = useCallback(async () => {
    setIsLoading(true);
    setTasks(oscilloscopeSampleProfile.tasks);
    setConfig(oscilloscopeSampleProfile.config);
    lastSavedTasksJsonRef.current = JSON.stringify(oscilloscopeSampleProfile.tasks);
    try {
      await Promise.all([
        api.put('/api/tasks', oscilloscopeSampleProfile.tasks),
        api.put('/api/config', oscilloscopeSampleProfile.config)
      ]);
      setActiveProfileId(oscilloscopeSampleProfile.id);
    } catch (err) {
      console.error('Failed to load sample profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    setIsMobileNavOpen(false);
    setCurrentScreen(screen);
    if (targetIdx > maxStepReached) setMaxStepReached(targetIdx);
  };

  const handleLogout = useCallback(() => {
    api.auth.clearToken();
    setIsAuthenticated(false);
    setCurrentScreen('welcome');
    setMaxStepReached(0);
    setTwoFactorRequired(false);
    setDataLoaded(false);
    setTasks([]);
    setConfig({});
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
    };
    window.addEventListener('opto-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('opto-unauthorized', handleUnauthorized);
    };
  }, [handleLogout]);

  if (!authChecked) {
    return <SplashScreen />;
  }

  if (twoFactorRequired) {
    return (
      <div className="welcome-page">
        <Suspense fallback={<SkeletonLoader />}>
          <Welcome
            onAuthSuccess={handleAuthSuccess}
            authError={authError}
            setAuthError={setAuthError}
            twoFactorRequired={true}
            on2faSuccess={handle2faSuccess}
          />
        </Suspense>
      </div>
    );
  }

  if (!isAuthenticated || currentScreen === 'welcome') {
    return (
      <div className="welcome-page">
        <Suspense fallback={<SkeletonLoader />}>
          <Welcome
            onAuthSuccess={handleAuthSuccess}
            authError={authError}
            setAuthError={setAuthError}
            twoFactorRequired={false}
            on2faSuccess={handle2faSuccess} // This won't be used but passed for consistency
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', transition: 'all 0.3s ease' }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <button
        type="button"
        className="mobile-nav-toggle no-print"
        onClick={() => setIsMobileNavOpen(true)}
        aria-label="Open navigation"
        aria-expanded={isMobileNavOpen}
      >
        <Menu size={20} />
      </button>

      {isMobileNavOpen && (
        <button
          type="button"
          className="sidebar-scrim no-print"
          aria-label="Close navigation"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      <Sidebar
        sidebarItems={sidebarItems}
        currentScreen={currentScreen}
        maxStepReached={maxStepReached}
        navigateTo={navigateTo}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {isSettingsOpen && (
        <SettingsLayout
          onClose={() => setIsSettingsOpen(false)}
          onLogout={handleLogout}
        />
      )}

      <main className="app-main" style={{ flex: 1, padding: '1.5rem', maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <div className="app-content-card" style={{ background: 'var(--card-bg)', borderRadius: '16px', flex: 1, boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%', height: '100%' }}><SkeletonLoader /></motion.div>
            ) : (
              <motion.div className="screen-motion-wrapper" key={currentScreen} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} style={{ width: '100%', height: '100%' }}>
                <ErrorBoundary key={`eb-${currentScreen}`}>
                <Suspense fallback={<SkeletonLoader />}>
                  {currentScreen === 'dashboard' && <Dashboard tasks={tasks} config={config} setConfig={handleSaveConfig} onNavigate={navigateTo} profiles={profiles} activeProfileId={activeProfileId} onSaveProfile={saveProfile} onLoadProfile={loadProfile} onLoadSampleProfile={loadSampleProfile} onDeleteProfile={deleteProfile} optimization={sharedOptimization} />}
                  {currentScreen === 'planning' && <ProcessPlanning tasks={tasks} setTasks={setTasks} onSaveTasks={handleSaveTasks} config={config} onNavigate={navigateTo} optimization={sharedOptimization} />}
                  {currentScreen === 'network' && <PrecedenceNetwork tasks={tasks} onNavigate={navigateTo} />}
                  {currentScreen === 'conceptual' && <ConceptualLayout tasks={tasks} config={config} optimization={sharedOptimization} onNavigate={navigateTo} />}
                  {currentScreen === 'optimization' && <LineOptimization tasks={tasks} config={config} setConfig={handleSaveConfig} optimization={sharedOptimization} />}
                  {currentScreen === 'floor' && <FloorLayout tasks={tasks} config={config} onNavigate={navigateTo} optimization={sharedOptimization} />}
                  {currentScreen === 'financials' && <FinancialAnalytics tasks={tasks} config={config} optimization={sharedOptimization} />}
                </Suspense>
                </ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default App;
