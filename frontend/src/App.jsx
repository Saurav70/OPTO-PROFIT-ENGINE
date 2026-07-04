import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { LayoutDashboard, Settings, Network, Box, Zap, Grid, TrendingUp, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './services/api';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import ToastContainer, { useToast } from './components/Toast';
import DashboardLayout from './components/DashboardLayout';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import useEngineStore from './stores/useEngineStore';
import LicenseActivation from './components/LicenseActivation';

// Lazy-loaded components for performance
const Welcome = lazy(() => import('./components/Welcome'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ProcessPlanning = lazy(() => import('./components/ProcessPlanning'));
const UnifiedLayout = lazy(() => import('./components/UnifiedLayout'));
const LineOptimization = lazy(() => import('./components/LineOptimization'));
const FinancialAnalytics = lazy(() => import('./components/FinancialAnalytics'));
const PrecedenceNetwork = lazy(() => import('./components/PrecedenceNetwork'));

import { calculateTaktTime, runOptimization } from './utils/optimizer';
import { oscilloscopeSampleProfile } from './data/sampleProfiles';

const SkeletonLoader = () => (
  <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflow: 'hidden' }}>
    <div style={{ display: 'flex', gap: '1.5rem' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="skeleton" style={{ flex: 1, height: '100px', borderRadius: '8px' }} />
      ))}
    </div>
    <div className="skeleton-grid">
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
  const [darkMode, setDarkMode] = useState(savedDarkMode ? JSON.parse(savedDarkMode) : false);
  const [isLoading, setIsLoading] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userData, setUserData] = useState(null);

  const [isActivated, setIsActivated] = useState(false);
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);

  const [tasks, setTasks] = useState(() => { try { return savedTasks ? JSON.parse(savedTasks) : []; } catch { return []; } });
  const [config, setConfig] = useState(() => { try { return savedConfig ? JSON.parse(savedConfig) : {}; } catch { return {}; } });
  const [dataLoaded, setDataLoaded] = useState(false);
  const lastSavedTasksJsonRef = useRef('');
  const autosaveTimerRef = useRef(null);

  // P0-1: Toast notifications for autosave and other async feedback
  const [toasts, addToast, dismissToast] = useToast();

  const authState = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check license status first
    const checkLicense = async () => {
      try {
        const status = await api.get('/api/license/status');
        setIsActivated(!!status.activated);
      } catch (err) {
        // If the backend returns 404 Not Found, we are running in standard web/SaaS mode without license enforcement
        if (err.status === 404) {
          setIsActivated(true);
        } else {
          setIsActivated(false);
        }
      } finally {
        setIsCheckingLicense(false);
      }
    };
    checkLicense();
  }, []);

  useEffect(() => {
    setIsAuthenticated(authState.isAuthenticated);
    setUserData(authState.user);
    setAuthChecked(true);
    if (authState.isAuthenticated) {
      if (currentScreen === 'welcome') {
        setCurrentScreen('dashboard');
      }
    }
  }, [authState.isAuthenticated, authState.user, currentScreen]);

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

  // Handle .opto file double-clicks from Electron
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onOpenFile) {
      window.electronAPI.onOpenFile(async (fileContent) => {
        try {
          const profile = JSON.parse(fileContent);
          if (profile.tasks && profile.config) {
            setIsLoading(true);
            setTasks(profile.tasks);
            setConfig(profile.config);
            lastSavedTasksJsonRef.current = JSON.stringify(profile.tasks);
            if (isAuthenticated) {
              await Promise.all([
                api.put('/api/tasks', profile.tasks),
                api.put('/api/config', profile.config)
              ]);
            }
            addToast({ message: 'Project loaded successfully', variant: 'success' });
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Failed to parse .opto file', err);
          addToast({ message: 'Failed to load project file. Invalid format.', variant: 'error' });
          setIsLoading(false);
        }
      });
    }
  }, [isAuthenticated, addToast]);

  const [profiles, setProfiles] = useState(savedProfiles ? JSON.parse(savedProfiles) : []);
  const [activeProfileId, setActiveProfileId] = useState(savedActiveProfileId || null);

  // Shared optimization result — single source of truth for all modules
  const [sharedOptimization, setSharedOptimization] = useState(null);
  const workerRef = useRef(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('./utils/optimizerWorker.js', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'SUCCESS') {
        setSharedOptimization(e.data.result);
      } else {
        console.error('Optimizer Worker Error:', e.data.error);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      const takt = await calculateTaktTime(config);
      const targetCycleTime = Number(config?.variables?.find(v => v.key === 'target_cycle_time')?.value || takt);
      const cycleTime = targetCycleTime > 0 ? targetCycleTime : takt;
      const heuristic = config.heuristic || 'LTF';
      
      if (workerRef.current) {
        workerRef.current.postMessage({ tasks, cycleTime, heuristic, config });
      }
    };
    run();
  }, [tasks, config]);

  // Persistence Effects
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config)); }, [config]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(darkMode));
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // Zustand store synchronization
  const setCurrentSimulationState = useEngineStore(state => state.setCurrentSimulationState);
  useEffect(() => {
    if (isAuthenticated && dataLoaded) {
      setCurrentSimulationState({
        tasks,
        config,
        optimization: sharedOptimization
      });
    }
  }, [tasks, config, sharedOptimization, isAuthenticated, dataLoaded, setCurrentSimulationState]);

  // Set baseline state when active profile or profile list is loaded/selected
  const setBaselineState = useEngineStore(state => state.setBaselineState);
  useEffect(() => {
    if (isAuthenticated && dataLoaded && activeProfileId) {
      const activeProfile = profiles.find(p => p.id === activeProfileId);
      if (activeProfile) {
        setBaselineState({
          tasks: activeProfile.tasks,
          config: activeProfile.config,
          optimization: null
        });
      } else if (activeProfileId === oscilloscopeSampleProfile.id) {
        setBaselineState({
          tasks: oscilloscopeSampleProfile.tasks,
          config: oscilloscopeSampleProfile.config,
          optimization: null
        });
      }
    }
  }, [activeProfileId, profiles, isAuthenticated, dataLoaded, setBaselineState]);

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

  const [syncStatus, setSyncStatus] = useState('saved');
  const saveQueueRef = useRef(null);

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

  // Initialize sequential queue for tasks autosave to prevent race conditions
  if (!saveQueueRef.current) {
    let inFlight = false;
    let nextData = null;

    const runSave = async (data) => {
      inFlight = true;
      setSyncStatus('saving');
      try {
        await handleSaveTasks(data);
        setSyncStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSyncStatus('error');
        addToast({ 
          message: 'Autosave failed — your changes are saved locally but not synced to the server.', 
          variant: 'warning', 
          duration: 8000 
        });
      } finally {
        inFlight = false;
        if (nextData !== null) {
          const dataToSave = nextData;
          nextData = null;
          runSave(dataToSave);
        }
      }
    };

    saveQueueRef.current = {
      trigger: (data) => {
        if (inFlight) {
          nextData = data;
          setSyncStatus('saving');
        } else {
          runSave(data);
        }
      }
    };
  }

  useEffect(() => {
    if (!isAuthenticated || !dataLoaded) return undefined;

    const serializedTasks = JSON.stringify(tasks);
    if (serializedTasks === lastSavedTasksJsonRef.current) return undefined;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveQueueRef.current.trigger(tasks);
    }, 600);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [tasks, isAuthenticated, dataLoaded, addToast]);

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
    { id: 'layout', icon: Box, label: 'Line & Floor Layout', num: 4 },
    { id: 'financials', icon: TrendingUp, label: 'Financial Performance', num: 5 },
  ];

  const navigateTo = (screen) => {
    if (screen === currentScreen) return;
    const targetIdx = sidebarItems.findIndex(i => i.id === screen);
    setCurrentScreen(screen);
    if (targetIdx > maxStepReached) setMaxStepReached(targetIdx);
  };

  const handleLogout = useCallback(() => {
    authState.logout();
    setIsAuthenticated(false);
    setUserData(null);
    setCurrentScreen('welcome');
    setMaxStepReached(0);
    setDataLoaded(false);
    setTasks([]);
    setConfig({});
    navigate('/login');
  }, [authState, navigate]);

  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
    };
    window.addEventListener('opto-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('opto-unauthorized', handleUnauthorized);
    };
  }, [handleLogout]);

  if (!authChecked || isCheckingLicense) {
    return <SplashScreen />;
  }

  if (!isActivated) {
    return <LicenseActivation onActivationSuccess={() => setIsActivated(true)} />;
  }

  const handleManualFileImport = async (fileContent, fileName) => {
    try {
      if (fileName.endsWith('.opto') || fileName.endsWith('.json')) {
        const profile = JSON.parse(fileContent);
        if (profile.tasks && profile.config) {
          setIsLoading(true);
          setTasks(profile.tasks);
          setConfig(profile.config);
          lastSavedTasksJsonRef.current = JSON.stringify(profile.tasks);
          if (isAuthenticated) {
            await Promise.all([
              api.put('/api/tasks', profile.tasks),
              api.put('/api/config', profile.config)
            ]);
          }
          addToast({ message: 'Project loaded successfully', variant: 'success' });
          setIsLoading(false);
        }
      } else if (fileName.endsWith('.csv')) {
        const Papa = await import('papaparse');
        Papa.default.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            const parsedTasks = results.data.map((row, index) => ({
              id: row.id || `T${index + 1}`,
              name: row.name || `Task ${index + 1}`,
              time: Number(row.time) || 0,
              predecessors: row.predecessors ? row.predecessors.split(',').map(s => s.trim()) : [],
              zoning: row.zoning || 'None'
            }));
            
            setIsLoading(true);
            setTasks(parsedTasks);
            lastSavedTasksJsonRef.current = JSON.stringify(parsedTasks);
            if (isAuthenticated) {
              await api.put('/api/tasks', parsedTasks);
            }
            addToast({ message: `${parsedTasks.length} tasks imported successfully`, variant: 'success' });
            setIsLoading(false);
          },
          error: (err) => {
            console.error('CSV parse error', err);
            addToast({ message: 'Failed to parse CSV.', variant: 'error' });
          }
        });
      } else {
        addToast({ message: 'Unsupported file type.', variant: 'error' });
      }
    } catch (err) {
      console.error('Failed to import file', err);
      addToast({ message: 'Failed to import file. Invalid format.', variant: 'error' });
      setIsLoading(false);
    }
  };

  // Derive active profile name
  const activeProfileName = profiles.find(p => p.id === activeProfileId)?.name || (activeProfileId === oscilloscopeSampleProfile.id ? oscilloscopeSampleProfile.name : '');

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <DashboardLayout
            currentScreen={currentScreen}
            navigateTo={navigateTo}
            sidebarItems={sidebarItems}
            maxStepReached={maxStepReached}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onLogout={handleLogout}
            onOpenSettings={() => setIsSettingsOpen(true)}
            activeProfileName={activeProfileName}
            user={userData}
            onImportData={handleManualFileImport}
          >
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {isSettingsOpen && (
              <SettingsModal
                onClose={() => setIsSettingsOpen(false)}
                onLogout={handleLogout}
                onUpdateUser={setUserData}
              />
            )}

            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%', height: '100%' }}><SkeletonLoader /></motion.div>
              ) : (
                <motion.div className="screen-motion-wrapper" key={currentScreen} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} style={{ width: '100%', height: '100%' }}>
                  <ErrorBoundary key={`eb-${currentScreen}`}>
                  <Suspense fallback={<SkeletonLoader />}>
                    {currentScreen === 'dashboard' && <Dashboard tasks={tasks} config={config} setConfig={handleSaveConfig} onNavigate={navigateTo} profiles={profiles} activeProfileId={activeProfileId} onSaveProfile={saveProfile} onLoadProfile={loadProfile} onLoadSampleProfile={loadSampleProfile} onDeleteProfile={deleteProfile} optimization={sharedOptimization} />}
                    {currentScreen === 'planning' && <ProcessPlanning tasks={tasks} setTasks={setTasks} onSaveTasks={handleSaveTasks} config={config} setConfig={handleSaveConfig} onNavigate={navigateTo} optimization={sharedOptimization} syncStatus={syncStatus} />}
                    {currentScreen === 'network' && <PrecedenceNetwork tasks={tasks} onNavigate={navigateTo} />}
                    {currentScreen === 'layout' && <UnifiedLayout tasks={tasks} config={config} setConfig={handleSaveConfig} optimization={sharedOptimization} onOverrideOptimization={setSharedOptimization} onNavigate={navigateTo} />}
                    {currentScreen === 'optimization' && <LineOptimization tasks={tasks} config={config} setConfig={handleSaveConfig} optimization={sharedOptimization} />}
                    {currentScreen === 'financials' && <FinancialAnalytics tasks={tasks} config={config} optimization={sharedOptimization} />}
                  </Suspense>
                  </ErrorBoundary>
                </motion.div>
              )}
            </AnimatePresence>
          </DashboardLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

export default App;
