import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Shield, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { AccountInfoTab, PersonalInfoTab, SecurityTab } from './SettingsTabs';

const SettingsModal = ({ onClose, onLogout, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isStacked = viewportWidth < 768;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // GET /api/users/me - Hooked to FastAPI endpoints built in Phase 2
        const data = await api.get('/api/users/me');
        setUserData(data);
        if (onUpdateUser) onUpdateUser(data);
      } catch (err) {
        setError('Failed to load user profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [onUpdateUser]);

  const handleUpdateUser = (updatedUser) => {
    setUserData(updatedUser);
    if (onUpdateUser) onUpdateUser(updatedUser);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowExitWarning(true);
    } else {
      onClose();
    }
  };

  const confirmExit = () => {
    setShowExitWarning(false);
    onClose();
  };

  const tabs = [
    { id: 'account', label: 'Account Info', icon: User },
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="settings-modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isStacked ? '1rem' : '2rem'
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="settings-modal-content glow-card"
          style={{
            background: 'var(--card-bg)',
            width: '100%',
            maxWidth: '900px',
            height: isStacked ? '90vh' : '80vh',
            maxHeight: isStacked ? 'none' : '700px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: isStacked ? 'column' : 'row',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Sidebar Navigation */}
          <div style={{
            width: isStacked ? '100%' : '250px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRight: isStacked ? 'none' : '1px solid var(--border-color)',
            borderBottom: isStacked ? '1px solid var(--border-color)' : 'none',
            padding: isStacked ? '1.25rem 1.5rem' : '2rem 1.5rem',
            display: 'flex',
            flexDirection: isStacked ? 'row' : 'column',
            alignItems: isStacked ? 'center' : 'stretch',
            justifyContent: isStacked ? 'space-between' : 'flex-start',
            gap: isStacked ? '1rem' : '0',
            flexWrap: isStacked ? 'wrap' : 'nowrap'
          }}>
            <h2 style={{
              fontSize: isStacked ? '1.1rem' : '1.4rem',
              fontWeight: 900,
              letterSpacing: '1px',
              color: 'var(--text-white)',
              margin: 0
            }}>SETTINGS</h2>

            <nav style={{ 
              display: 'flex', 
              flexDirection: isStacked ? 'row' : 'column', 
              gap: '0.5rem',
              flexWrap: isStacked ? 'wrap' : 'nowrap',
              marginTop: isStacked ? 0 : '2rem'
            }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isStacked ? '8px' : '12px',
                      padding: isStacked ? '0.5rem 0.75rem' : '1rem',
                      borderRadius: '8px',
                      background: isActive ? 'rgba(13, 148, 136, 0.15)' : 'transparent',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-main)',
                      border: isActive ? '1px solid rgba(13, 148, 136, 0.3)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: isActive ? 700 : 500,
                      textAlign: 'left',
                      fontSize: isStacked ? '0.75rem' : '0.85rem'
                    }}
                  >
                    <tab.icon size={isStacked ? 15 : 18} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, padding: isStacked ? '1.5rem' : '2.5rem', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
            >
              <X size={20} />
            </button>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div style={{ color: 'var(--text-sub)' }}>Loading user data...</div>
              </div>
            ) : error ? (
              <div style={{ color: 'var(--accent-danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                {error}
              </div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {activeTab === 'account' && <AccountInfoTab user={userData} />}
                {activeTab === 'personal' && (
                  <PersonalInfoTab 
                    user={userData} 
                    onUpdateUser={handleUpdateUser} 
                    setHasUnsavedChanges={setHasUnsavedChanges} 
                  />
                )}
                {activeTab === 'security' && <SecurityTab onLogout={onLogout} />}
              </div>
            )}
          </div>

          {/* Unsaved Changes Warning Modal */}
          {showExitWarning && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}>
              <div style={{
                background: 'var(--card-bg)',
                padding: '2rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                maxWidth: '400px',
                textAlign: 'center'
              }}>
                <AlertTriangle size={48} color="var(--accent-danger)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ margin: '0 0 1rem', color: 'var(--text-white)' }}>Unsaved Changes</h3>
                <p style={{ color: 'var(--text-sub)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  You have unsaved changes in your personal information. Are you sure you want to exit without saving?
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button 
                    className="btn-outline" 
                    onClick={() => setShowExitWarning(false)}
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={confirmExit}
                    style={{
                      background: 'var(--accent-danger)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    EXIT ANYWAY
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SettingsModal;
