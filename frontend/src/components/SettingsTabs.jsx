import React, { useState } from 'react';
import { User, Shield, KeyRound, LogOut, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const AccountInfoTab = ({ user }) => {
  return (
    <div className="settings-tab-content">
      <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-white)', fontSize: '1.2rem', fontWeight: 800 }}>ACCOUNT INFORMATION</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="settings-field-group">
          <label className="input-label">USERNAME</label>
          <div className="read-only-value">{user?.username || 'N/A'}</div>
        </div>
        <div className="settings-field-group">
          <label className="input-label">EMAIL ADDRESS</label>
          <div className="read-only-value">{user?.email || 'N/A'}</div>
        </div>
        <div className="settings-field-group">
          <label className="input-label">ROLE</label>
          <div className="read-only-value">{user?.role || 'User'}</div>
        </div>
        <div className="settings-field-group">
          <label className="input-label">TENANT ID</label>
          <div className="read-only-value">{user?.tenant_id || 'N/A'}</div>
        </div>
        <div className="settings-field-group">
          <label className="input-label">JOIN DATE</label>
          <div className="read-only-value">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</div>
        </div>
        <div className="settings-field-group">
          <label className="input-label">2FA STATUS</label>
          <div className="read-only-value" style={{ color: user?.is_2fa_enabled ? 'var(--accent-primary)' : 'var(--text-sub)' }}>
            {user?.is_2fa_enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PersonalInfoTab = ({ user, onUpdateUser, setHasUnsavedChanges }) => {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone_number: user?.phone_number || '',
    email: user?.email || ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setHasUnsavedChanges(true);
    setStatus({ type: '', message: '' });
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });
    try {
      const updatedUser = await api.put('/api/users/me', formData);
      onUpdateUser(updatedUser);
      setHasUnsavedChanges(false);
      setStatus({ type: 'success', message: 'Personal information updated successfully.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to update information.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="settings-tab-content">
      <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-white)', fontSize: '1.2rem', fontWeight: 800 }}>PERSONAL INFORMATION</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px' }}>
        <div className="settings-field-group">
          <label className="input-label">FULL NAME</label>
          <input 
            type="text" 
            name="full_name" 
            className="input-field" 
            value={formData.full_name} 
            onChange={handleChange} 
            placeholder="Jane Doe" 
          />
        </div>
        
        <div className="settings-field-group">
          <label className="input-label">PHONE NUMBER</label>
          <input 
            type="text" 
            name="phone_number" 
            className="input-field" 
            value={formData.phone_number} 
            onChange={handleChange} 
            placeholder="+1 (555) 000-0000" 
          />
        </div>
        
        <div className="settings-field-group">
          <label className="input-label">EMAIL ADDRESS</label>
          <input 
            type="email" 
            name="email" 
            className="input-field" 
            value={formData.email} 
            onChange={handleChange} 
          />
        </div>

        {status.message && (
          <div style={{ 
            padding: '10px 12px', 
            borderRadius: '6px', 
            fontSize: '0.8rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(13, 148, 136, 0.1)',
            color: status.type === 'error' ? 'var(--accent-danger)' : 'var(--accent-primary)',
            border: `1px solid ${status.type === 'error' ? 'var(--accent-danger)' : 'var(--accent-primary)'}`
          }}>
            {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {status.message}
          </div>
        )}

        <button 
          className="btn-primary" 
          onClick={handleSave}
          disabled={isSubmitting}
          style={{ marginTop: '1rem', alignSelf: 'flex-start' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={16} />
            {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
          </span>
        </button>
      </div>
    </div>
  );
};

export const SecurityTab = ({ onLogout }) => {
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setStatus({ type: '', message: '' });
  };

  const handleChangePassword = async () => {
    if (passwords.new_password !== passwords.confirm_password) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (passwords.new_password.length < 8) {
      setStatus({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: '', message: '' });
    try {
      await api.post('/api/auth/change-password', passwords);
      setStatus({ type: 'success', message: 'Password updated successfully.' });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to change password.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="settings-tab-content">
      <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-white)', fontSize: '1.2rem', fontWeight: 800 }}>SECURITY & ACCESS</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '400px' }}>
        
        {/* Password Change Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px' }}>CHANGE PASSWORD</h4>
          
          <div className="settings-field-group">
            <label className="input-label">CURRENT PASSWORD</label>
            <input 
              type="password" 
              name="current_password" 
              className="input-field" 
              value={passwords.current_password} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="settings-field-group">
            <label className="input-label">NEW PASSWORD</label>
            <input 
              type="password" 
              name="new_password" 
              className="input-field" 
              value={passwords.new_password} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="settings-field-group">
            <label className="input-label">CONFIRM NEW PASSWORD</label>
            <input 
              type="password" 
              name="confirm_password" 
              className="input-field" 
              value={passwords.confirm_password} 
              onChange={handleChange} 
            />
          </div>

          {status.message && (
            <div style={{ 
              padding: '10px 12px', 
              borderRadius: '6px', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(13, 148, 136, 0.1)',
              color: status.type === 'error' ? 'var(--accent-danger)' : 'var(--accent-primary)',
              border: `1px solid ${status.type === 'error' ? 'var(--accent-danger)' : 'var(--accent-primary)'}`
            }}>
              {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              {status.message}
            </div>
          )}

          <button 
            className="btn-outline" 
            onClick={handleChangePassword}
            disabled={isSubmitting || !passwords.current_password || !passwords.new_password}
            style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={16} />
              {isSubmitting ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </span>
          </button>
        </div>

        <div style={{ height: '1px', background: 'var(--border-color)', margin: '1rem 0' }} />

        {/* Logout Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px' }}>SESSION MANAGEMENT</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-sub)' }}>
            Log out of your current session securely.
          </p>
          <button 
            onClick={onLogout}
            style={{ 
              alignSelf: 'flex-start',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--accent-danger)',
              border: '1px solid var(--accent-danger)',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent-danger)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = 'var(--accent-danger)'; }}
          >
            <LogOut size={16} />
            SECURE LOGOUT
          </button>
        </div>

      </div>
    </div>
  );
};

export const PreferencesTab = ({ setHasUnsavedChanges }) => {
  const [globalTarget, setGlobalTarget] = useState(() => {
    return Number(localStorage.getItem('opto_global_target_efficiency')) || 85;
  });
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSave = () => {
    localStorage.setItem('opto_global_target_efficiency', globalTarget.toString());
    setStatus({ type: 'success', message: 'Preferences updated successfully.' });
    setHasUnsavedChanges(false);
  };

  return (
    <div className="settings-tab-content">
      <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-white)', fontSize: '1.2rem', fontWeight: 800 }}>GLOBAL SYSTEM DEFAULTS</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px' }}>
        <div className="settings-field-group">
          <label className="input-label">GLOBAL TARGET EFFICIENCY (%)</label>
          <input 
            type="number" 
            min="10"
            max="100"
            className="input-field" 
            value={globalTarget} 
            onChange={(e) => {
              setGlobalTarget(Math.min(100, Math.max(10, Number(e.target.value) || 85)));
              setHasUnsavedChanges(true);
              setStatus({ type: '', message: '' });
            }} 
            placeholder="85" 
          />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginTop: '4px', display: 'block' }}>
            This target efficiency will be applied globally across all active projects as the default line-balancing baseline.
          </span>
        </div>

        {status.message && (
          <div style={{ 
            padding: '10px 12px', 
            borderRadius: '6px', 
            fontSize: '0.8rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: 'rgba(13, 148, 136, 0.1)',
            color: 'var(--accent-primary)',
            border: '1px solid var(--accent-primary)'
          }}>
            <CheckCircle2 size={16} />
            {status.message}
          </div>
        )}

        <button 
          className="btn-primary" 
          onClick={handleSave}
          style={{ marginTop: '1rem', alignSelf: 'flex-start' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={16} />
            SAVE PREFERENCES
          </span>
        </button>
      </div>
    </div>
  );
};
