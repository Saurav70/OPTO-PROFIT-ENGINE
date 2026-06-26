import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { KeyRound, Mail, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import '../Welcome.css'; // Reuse existing styled elements

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // Direct call to check if 2FA is needed
      const response = await api.post('/api/auth/login', {
        username: email.trim(),
        password,
      });

      if (response?.two_factor_required) {
        setTwoFactorRequired(true);
      } else {
        if (response?.access_token) {
          api.auth.setToken(response.access_token);
        }
        // Sync with useAuthStore and navigate
        const userProfile = await api.get('/api/auth/me');
        useAuthStore.setState({
          token: response.access_token,
          user: userProfile,
          isAuthenticated: true,
        });
        navigate('/');
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Authentication failed. Please verify your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handle2faVerify = async (e) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setError('Please enter your 6-digit verification code.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await api.post(
        '/api/auth/2fa/verify',
        { code: twoFactorCode.trim() },
        { useTempToken: true }
      );

      if (response?.access_token) {
        api.auth.setToken(response.access_token);
      }
      
      const userProfile = await api.get('/api/auth/me');
      useAuthStore.setState({
        token: response.access_token,
        user: userProfile,
        isAuthenticated: true,
      });
      api.auth.clearTemp2faToken();
      navigate('/');
    } catch (err) {
      setError(err?.message || '2FA verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (twoFactorRequired) {
    return (
      <div className="two-factor-container">
        <div className="glow-card welcome-auth-card">
          <div className="auth-header">
            <div className="two-factor-icon-wrapper">
              <KeyRound size={24} color="#fff" />
            </div>
            <h2 className="auth-title">TWO-FACTOR AUTH</h2>
            <p className="auth-subtitle">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <form onSubmit={handle2faVerify} className="auth-form-group">
            <div>
              <label className="input-label">VERIFICATION CODE</label>
              <input
                placeholder="000000"
                className="input-field two-factor-input"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoFocus
                disabled={isLoading}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn-primary" disabled={isLoading || twoFactorCode.length !== 6}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isLoading ? <RefreshCw size={18} className="spin" /> : <ShieldCheck size={18} />}
                {isLoading ? 'VERIFYING...' : 'Verify Login'}
              </span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-shell" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glow-card welcome-auth-card">
        <div className="auth-header">
          <div className="brand-logo-small">
            <div className="brand-badge">TE</div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '2px' }}>TEIRAC</span>
          </div>
          <h2 className="auth-title">LOGIN</h2>
          <p className="auth-subtitle">Access your assembly line optimizer</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form-group">
          <div>
            <label className="input-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={12} /> OFFICIAL EMAIL
              </span>
            </label>
            <input
              type="email"
              placeholder="engineer@teirac.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="input-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={12} /> PASSWORD
              </span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="************"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <label className="password-toggle">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              Show Password
            </label>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {isLoading ? <RefreshCw size={18} className="spin" /> : <KeyRound size={18} />}
              {isLoading ? 'LOGGING IN...' : 'Login'}
            </span>
          </button>

          <div className="auth-divider">
            <div className="divider-line" />
            <span className="divider-text">NEW USER?</span>
            <div className="divider-line" />
          </div>

          <Link to="/register" className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </form>
      </div>
    </div>
  );
};

export default Login;
