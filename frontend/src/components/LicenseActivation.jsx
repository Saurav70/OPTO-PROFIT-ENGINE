import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Copy, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import '../LicenseActivation.css';

const LicenseActivation = ({ onActivationSuccess }) => {
  const [hwid, setHwid] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [licensee, setLicensee] = useState('');

  useEffect(() => {
    // Fetch hardware ID on load
    api.get('/api/license/hwid').then(res => setHwid(res.hwid)).catch(console.error);
  }, []);

  const handleCopyHwid = () => {
    navigator.clipboard.writeText(hwid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.post('/api/license/activate', { key: licenseKey.trim() });
      if (response.success) {
        setSuccess(true);
        setLicensee(response.licensee);
        // If an access token was returned for the auto-created admin, set it.
        if (response.access_token) {
          api.auth.setToken(response.access_token);
        }
        setTimeout(() => {
          onActivationSuccess();
        }, 3000);
      } else {
        setError(response.error || 'Failed to activate. Invalid or expired key.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during activation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="activation-container">
      <motion.div 
        className="activation-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="activation-header">
          <ShieldCheck size={48} className="brand-icon" />
          <h1>OPTO-PROFIT Activation</h1>
          <p>Please enter your offline license key to unlock the software.</p>
        </div>

        {!success ? (
          <div className="activation-content">
            <div className="hwid-section">
              <label>Machine Fingerprint (HWID)</label>
              <div className="hwid-box">
                <code>{hwid || 'Loading...'}</code>
                <button className="copy-btn" onClick={handleCopyHwid} title="Copy HWID">
                  {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <small>Send this HWID to your distributor to receive a bound license key.</small>
            </div>

            <div className="key-section">
              <label>License Key</label>
              <textarea 
                className="license-textarea" 
                placeholder="Paste your base64 license key here..."
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                spellCheck="false"
              />
            </div>

            {error && (
              <motion.div className="error-banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </motion.div>
            )}

            <button 
              className="activate-btn" 
              onClick={handleActivate} 
              disabled={isLoading || !licenseKey.trim()}
            >
              {isLoading ? 'Verifying...' : 'Activate Software'}
            </button>
          </div>
        ) : (
          <motion.div 
            className="activation-success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle size={64} className="success-icon" />
            <h2>Activation Successful</h2>
            <p>Welcome, <strong>{licensee}</strong>!</p>
            <p className="redirect-text">Redirecting to application...</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default LicenseActivation;
