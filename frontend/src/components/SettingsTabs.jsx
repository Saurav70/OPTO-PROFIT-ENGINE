import React, { useState } from 'react';
import { User, Shield, KeyRound, LogOut, Save, AlertCircle, CheckCircle2, Database, Download, Upload, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export const AccountInfoTab = ({ user }) => {
  return (
    <div className="settings-tab-content">
      <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-white)', fontSize: '1.2rem', fontWeight: 800 }}>ACCOUNT INFORMATION</h3>
      
      <div className="settings-grid">
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
  const [hwid, setHwid] = useState(null);
  const [showHwid, setShowHwid] = useState(false);

  React.useEffect(() => {
    const fetchHwid = async () => {
      try {
        const res = await api.get('/api/license/hwid');
        if (res && res.hwid) {
          // Format as XXXX-XXXX-XXXX-XXXX
          const formatted = res.hwid.match(/.{1,4}/g).join('-');
          setHwid(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch HWID for recovery phrase', err);
      }
    };
    fetchHwid();
  }, []);

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

        {/* Recovery Phrase Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px' }}>DATABASE RECOVERY PHRASE</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-sub)' }}>
            Your database is cryptographically locked to this computer. Write down this Recovery Phrase. You will need it if you ever move your database file to a new computer.
          </p>
          
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px dashed var(--border-color)',
            padding: '1rem',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <button 
              onClick={() => setShowHwid(!showHwid)}
              className="btn-outline"
              style={{ alignSelf: 'flex-start', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            >
              {showHwid ? 'HIDE RECOVERY PHRASE' : 'REVEAL RECOVERY PHRASE'}
            </button>
            
            {showHwid && hwid && (
              <div style={{
                fontFamily: 'monospace',
                fontSize: '1.2rem',
                color: 'var(--text-white)',
                letterSpacing: '2px',
                textAlign: 'center',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                userSelect: 'all'
              }}>
                {hwid}
              </div>
            )}
          </div>
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


export const BackupTab = () => {
  const [file, setFile] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExport = async () => {
    try {
      setStatus({ type: '', message: '' });
      const token = localStorage.getItem('opto_auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/desktop/backup/export`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optoprofit_backup_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setStatus({ type: 'success', message: 'Database backup downloaded successfully.' });
    } catch (err) {
      console.error('Database export error:', err);
      setStatus({ type: 'error', message: 'Failed to export database. Please try again.' });
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) return;
    if (confirmText !== 'RESTORE') {
      setStatus({ type: 'error', message: 'Please type RESTORE exactly to confirm overwrite.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('opto_auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/desktop/backup/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.detail || 'Import failed');
      }

      setStatus({ type: 'success', message: 'Database successfully restored! App will reload in 3 seconds.' });
      setFile(null);
      setConfirmText('');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to import database.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="settings-tab-content">
      <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-white)', fontSize: '1.2rem', fontWeight: 800 }}>DATABASE BACKUP & RESTORE</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '500px' }}>
        
        {/* Export Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px' }}>EXPORT LOCAL DATABASE</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-sub)' }}>
            Download a portable copy of your local SQLite database containing all user configurations, task lists, and balancing parameters.
          </p>
          <div style={{ 
            fontSize: '0.75rem', 
            background: 'rgba(0,0,0,0.15)', 
            padding: '10px 14px', 
            borderRadius: '6px', 
            border: '1px solid var(--border-color)',
            fontFamily: 'monospace',
            color: 'var(--text-sub)'
          }}>
            Active File: %APPDATA%\OPTO-PROFIT\data.db
          </div>
          <button 
            className="btn-outline" 
            onClick={handleExport}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} />
            EXPORT PORTABLE DATABASE (.db)
          </button>
        </div>

        <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }} />

        {/* Import/Restore Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px' }}>RESTORE FROM BACKUP</h4>
          
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid var(--accent-danger)',
            padding: '12px 16px',
            borderRadius: '8px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={24} color="var(--accent-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h5 style={{ margin: '0 0 4px 0', color: 'var(--text-white)', fontSize: '0.85rem', fontWeight: 800 }}>CRITICAL DATA WARNING</h5>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)', lineHeight: '1.3' }}>
                Restoring a database completely overwrites all active layouts, engineering variables, users, and tasks. This operation cannot be undone.
              </p>
            </div>
          </div>

          <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="settings-field-group">
              <label className="input-label">SELECT BACKUP FILE (.db)</label>
              <input 
                type="file" 
                accept=".db"
                className="input-field" 
                onChange={(e) => {
                  setFile(e.target.files[0]);
                  setStatus({ type: '', message: '' });
                }} 
                style={{ padding: '8px' }}
              />
            </div>

            {file && (
              <div className="settings-field-group">
                <label className="input-label" style={{ color: 'var(--accent-danger)' }}>TYPE &quot;RESTORE&quot; TO CONFIRM</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type RESTORE to confirm overwrite" 
                  style={{ border: '1px solid var(--accent-danger)' }}
                />
              </div>
            )}

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
              type="submit"
              className="btn-primary" 
              disabled={isSubmitting || !file || confirmText !== 'RESTORE'}
              style={{ 
                alignSelf: 'flex-start', 
                background: file && confirmText === 'RESTORE' ? 'var(--accent-danger)' : 'rgba(255,255,255,0.05)',
                color: file && confirmText === 'RESTORE' ? '#fff' : 'var(--text-sub)',
                border: 'none',
                cursor: file && confirmText === 'RESTORE' ? 'pointer' : 'not-allowed'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={16} />
                {isSubmitting ? 'RESTORING...' : 'RESTORE DATABASE'}
              </span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
