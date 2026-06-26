import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { UserPlus, Mail, Lock, RefreshCw, Building } from 'lucide-react';
import '../Welcome.css'; // Reuse existing styled elements

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password || !companyName) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await register(email, password, companyName);
      navigate('/');
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Registration failed. Please verify your entries.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="welcome-shell" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glow-card welcome-auth-card">
        <div className="auth-header">
          <div className="brand-logo-small">
            <div className="brand-badge">TE</div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '2px' }}>TEIRAC</span>
          </div>
          <h2 className="auth-title">SIGN UP</h2>
          <p className="auth-subtitle">Register to start optimizing output</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form-group">
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
              type="password"
              placeholder="Minimum 8 characters"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="input-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={12} /> COMPANY NAME
              </span>
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Industries"
              className="input-field"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {isLoading ? <RefreshCw size={18} className="spin" /> : <UserPlus size={18} />}
              {isLoading ? 'SIGNING UP...' : 'Sign Up'}
            </span>
          </button>

          <div className="auth-divider">
            <div className="divider-line" />
            <span className="divider-text">ALREADY REGISTERED?</span>
            <div className="divider-line" />
          </div>

          <Link to="/login" className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            Login
          </Link>
        </form>
      </div>
    </div>
  );
};

export default Register;
