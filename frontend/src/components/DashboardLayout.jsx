import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Sun, Moon, Settings, LogOut, User, ChevronDown, Cpu, Upload, Download } from 'lucide-react';
import Sidebar from './Sidebar';
import useEngineStore from '../stores/useEngineStore';
import { exportStationDataToCSV } from '../utils/reportGenerator';

const DashboardLayout = ({
  children,
  currentScreen,
  navigateTo,
  sidebarItems,
  maxStepReached,
  darkMode,
  setDarkMode,
  onLogout,
  onOpenSettings,
  activeProfileName,
  user,
  onImportData
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const currentSimulationState = useEngineStore(state => state.currentSimulationState);
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      if (onImportData) {
        onImportData(content, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };


  const handleExportCSV = () => {
    const stations = currentSimulationState?.optimization?.stations;
    const tasks = currentSimulationState?.tasks;
    if (stations && tasks) {
      exportStationDataToCSV(stations, tasks);
    }
  };

  return (
    <div className="app-shell">
      {/* Mobile nav toggle button */}
      <button
        type="button"
        className="mobile-nav-toggle no-print"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={isMobileOpen}
      >
        <Menu size={20} />
      </button>

      {/* Sidebar overlay scrim for mobile view */}
      {isMobileOpen && (
        <button
          type="button"
          className="sidebar-scrim no-print"
          aria-label="Close navigation"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Persistent Left Sidebar */}
      <Sidebar
        sidebarItems={sidebarItems}
        currentScreen={currentScreen}
        maxStepReached={maxStepReached}
        navigateTo={(screen) => {
          setIsMobileOpen(false);
          navigateTo(screen);
        }}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={onLogout}
        onOpenSettings={onOpenSettings}
      />

      <div className="main-layout-wrapper">
        {/* Top Navigation Bar */}
        <header className="top-nav-bar no-print">
          <div className="top-nav-left">
            <h1 className="header-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-white)' }}>
              {sidebarItems.find(item => item.id === currentScreen)?.label || 'DASHBOARD'}
            </h1>
            {activeProfileName && (
              <span className="profile-indicator">
                <span className="dot pulse-teal"></span>
                ACTIVE PROFILE: {activeProfileName.toUpperCase()}
              </span>
            )}
          </div>

          <div className="top-nav-right">


            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".csv,.xlsx,.opto,.json"
              onChange={handleFileChange}
            />

            {/* Import Data Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-outline hover-glow top-nav-import-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '1px',
                borderRadius: 'var(--radius-md)',
                borderColor: 'var(--accent-primary)',
                color: 'var(--accent-primary)',
                background: 'transparent',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.1)',
                transition: 'all 0.2s ease',
              }}
            >
              <Upload size={14} /> Import Data
            </button>

            {/* Export to Excel (CSV) Button */}
            <button
              onClick={handleExportCSV}
              disabled={!currentSimulationState?.optimization?.stations}
              className="btn-outline hover-glow top-nav-export-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '1px',
                borderRadius: 'var(--radius-md)',
                borderColor: 'var(--accent-secondary)',
                color: 'var(--accent-secondary)',
                background: 'transparent',
                cursor: !currentSimulationState?.optimization?.stations ? 'not-allowed' : 'pointer',
                opacity: !currentSimulationState?.optimization?.stations ? 0.5 : 1,
                boxShadow: '0 4px 12px rgba(168, 85, 247, 0.1)',
                transition: 'all 0.2s ease',
              }}
            >
              <Download size={14} /> Export to Excel (CSV)
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="top-nav-action-btn"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              className="top-nav-action-btn"
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>

            {/* User Profile Dropdown */}
            {user && (
              <div className="user-dropdown-container">
                <button
                  className="user-profile-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  <div className="avatar">
                    <User size={16} />
                  </div>
                  <span className="username">{user.full_name || user.username}</span>
                  <ChevronDown size={14} />
                </button>
                
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <>
                      <div className="dropdown-overlay" onClick={() => setIsUserMenuOpen(false)} />
                      <motion.div
                        className="user-dropdown-menu"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="user-info-header">
                          <p className="user-name">{user.full_name || user.username}</p>
                          <p className="user-email">{user.email || 'No email'}</p>
                          <p className="user-role">{user.role?.toUpperCase() || 'ENGINEER'}</p>
                        </div>
                        <button className="dropdown-item" onClick={() => { setIsUserMenuOpen(false); onOpenSettings(); }}>
                          <Settings size={14} />
                          <span>Settings</span>
                        </button>
                        <button className="dropdown-item text-danger" onClick={() => { setIsUserMenuOpen(false); onLogout(); }}>
                          <LogOut size={14} />
                          <span>Sign Out</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area (Wraps children inside cards) */}
        <main className="app-main">
          <div className="app-content-card" id="optimization-dashboard-view">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScreen}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ width: '100%', height: '100%' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
