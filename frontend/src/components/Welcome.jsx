import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, KeyRound, Mail, Lock, ArrowLeft, RefreshCw, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import '../Welcome.css';

const Welcome = ({ onAuthSuccess, authError, setAuthError, twoFactorRequired, on2faSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);

  const submitAuth = async (mode) => {
    setAuthError('');
    setRecoverySuccess('');
    setIsSubmitting(true);
    try {
      const payload = { username: email.trim(), password, email: email.trim() };
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const data = await api.post(endpoint, payload);
      if (!data?.access_token) {
        throw new Error('No access token returned by server.');
      }
      onAuthSuccess(data);
    } catch (error) {
      setAuthError(error?.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submit2fa = async () => {
    if (!twoFactorCode.trim()) {
      setAuthError('Please enter your 6-digit verification code.');
      return;
    }
    setAuthError('');
    setIsSubmitting(true);
    try {
      const data = await api.post('/api/auth/2fa/verify', { code: twoFactorCode.trim() }, { useTempToken: true });
      if (!data?.access_token) {
        throw new Error('2FA verification failed - no token returned.');
      }
      on2faSuccess();
    } catch (error) {
      setAuthError(error?.message || '2FA verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecovery = async () => {
    if (!email) {
      setAuthError('Please enter your registered email.');
      return;
    }
    setAuthError('');
    setRecoverySuccess('');
    setIsSubmitting(true);
    try {
      const data = await api.post('/api/auth/forgot-password', { email });
      setRecoverySuccess(data.message);
    } catch (error) {
      setAuthError(error?.message || 'Recovery request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim()) {
      setAuthError('Please enter the reset token from your email.');
      return;
    }
    if (newPassword.length < 8) {
      setAuthError('New password must be at least 8 characters.');
      return;
    }

    setAuthError('');
    setIsSubmitting(true);
    try {
      const data = await api.post('/api/auth/reset-password', {
        token: resetToken.trim(),
        new_password: newPassword
      });
      setRecoverySuccess(data.message || 'Password reset complete. You can log in now.');
      setResetToken('');
      setNewPassword('');
    } catch (error) {
      setAuthError(error?.message || 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  if (twoFactorRequired) {
    return (
      <div className="two-factor-container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass welcome-auth-card"
        >
          <div className="auth-header">
            <div className="two-factor-icon-wrapper">
              <KeyRound size={24} color="#fff" />
            </div>
            <h2 className="auth-title">TWO-FACTOR AUTH</h2>
            <p className="auth-subtitle">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="auth-form-group">
            <div>
              <label className="input-label">VERIFICATION CODE</label>
              <input
                placeholder="000000"
                className="input-field two-factor-input"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && submit2fa()}
                autoFocus
              />
            </div>

            {authError ? (
              <p className="auth-error">{authError}</p>
            ) : null}

            <button
              onClick={submit2fa}
              className="btn-primary"
              disabled={isSubmitting || twoFactorCode.length !== 6}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isSubmitting ? <RefreshCw size={18} className="spin" /> : <ShieldCheck size={18} />}
                {isSubmitting ? 'VERIFYING...' : 'Verify Login'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="welcome-shell">
      <motion.div
        className="welcome-brand-panel"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '3rem' }}>
          <div className="brand-badge" style={{ width: '48px', height: '48px', fontSize: '0.9rem' }}>TE</div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '3px' }}>TEIRAC</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-sub)', letterSpacing: '3px', fontWeight: 700 }}>INNOVATE. ELEVATE.</div>
          </div>
        </motion.div>

        <motion.p variants={itemVariants} style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 400, letterSpacing: '2px', margin: '0 0 0.5rem 0' }}>TEIRAC PRIVATE LIMITED</motion.p>
        <motion.h1 variants={itemVariants} className="brand-title">
          OPTOPROFIT<br />
          <span style={{ color: 'var(--accent-primary)' }}>ENGINE</span>
        </motion.h1>
        <motion.p variants={itemVariants} className="brand-subtitle">
          Advanced analytics and assembly line optimization for<br />
          <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>Maximum Factory Output &amp; Profitability</span>
        </motion.p>

        <motion.div variants={itemVariants} style={{ display: 'flex', gap: '2rem', marginTop: '4rem' }}>
          <div className="feature-badge">
            <ShieldCheck size={16} color="var(--accent-primary)" />
            <span className="feature-text">ENTERPRISE GRADE</span>
          </div>
          <div className="feature-badge">
            <Zap size={16} color="var(--accent-warning)" />
            <span className="feature-text">REAL-TIME ENGINE</span>
          </div>
        </motion.div>
      </motion.div>

      <div className="welcome-auth-panel">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass welcome-auth-card"
        >
          <div className="auth-header" style={{ marginBottom: '2.5rem' }}>
            <div className="brand-logo-small">
              <div className="brand-badge">TE</div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '2px' }}>TEIRAC</span>
            </div>
            <h2 className="auth-title">Login</h2>
            <p className="auth-subtitle">Enter your credentials to access the engine</p>
          </div>

          <div className="auth-form-group">
            {!isRecovery ? (
              <>
                <div>
                  <label className="input-label">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={12} /> OFFICIAL EMAIL
                    </span>
                  </label>
                  <input
                    placeholder="engineer@teirac.com"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitAuth('login')}
                  />
                </div>

                <div>
                  <label className="input-label">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={12} /> PASSWORD
                    </span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="************"
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitAuth('login')}
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

                {authError ? (
                  <p className="auth-error">{authError}</p>
                ) : null}

                <button
                  onClick={() => submitAuth('login')}
                  className="btn-primary"
                  style={{ marginTop: '0.5rem' }}
                  disabled={isSubmitting}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {isSubmitting ? <RefreshCw size={18} className="spin" /> : <KeyRound size={18} />}
                    {isSubmitting ? 'LOGGING IN...' : 'Login'}
                  </span>
                </button>

                <div className="auth-divider">
                  <div className="divider-line" />
                  <span className="divider-text">OR</span>
                  <div className="divider-line" />
                </div>

                <button
                  className="btn-outline"
                  onClick={() => submitAuth('register')}
                  disabled={isSubmitting}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <UserPlus size={18} />
                    {isSubmitting ? 'PROCESSING...' : 'Sign Up'}
                  </span>
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Enter your <strong>registered email</strong> to receive a secure password reset token.
                </p>
                
                <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                  <label className="input-label">REGISTERED EMAIL</label>
                  <input
                    placeholder="engineer@teirac.com"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {authError ? (
                  <p className="auth-error" style={{ marginBottom: '1rem' }}>{authError}</p>
                ) : null}

                {recoverySuccess ? (
                  <div style={{ background: 'rgba(13, 148, 136, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--accent-primary)' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{recoverySuccess}</p>
                  </div>
                ) : null}

                <button
                  className="btn-primary"
                  style={{ width: '100%', marginBottom: '1rem' }}
                  onClick={handleRecovery}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'SENDING...' : 'Send Reset Email'}
                </button>

                <div className="auth-divider" style={{ margin: '1rem 0 1.25rem' }}>
                  <div className="divider-line" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                  <div>
                    <label className="input-label">RESET TOKEN</label>
                    <input
                      placeholder="Paste token from email"
                      className="input-field"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="input-label">NEW PASSWORD</label>
                    <input
                      type={showRecoveryPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      className="input-field"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                    />
                    <label className="password-toggle">
                      <input
                        type="checkbox"
                        checked={showRecoveryPassword}
                        onChange={(e) => setShowRecoveryPassword(e.target.checked)}
                        style={{ accentColor: 'var(--accent-primary)' }}
                      />
                      Show Password
                    </label>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  style={{ width: '100%', marginBottom: '1rem' }}
                  onClick={handleResetPassword}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'RESETTING...' : 'Reset Password'}
                </button>

                <button
                  className="btn-outline"
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                  onClick={() => {
                    setIsRecovery(false);
                    setRecoverySuccess('');
                    setAuthError('');
                    setResetToken('');
                    setNewPassword('');
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <ArrowLeft size={16} /> Back to Login
                  </span>
                </button>
              </div>
            )}

            <p
              className="forgot-password-link"
              onClick={() => setIsRecovery(!isRecovery)}
            >
              {isRecovery ? 'Back to Login' : 'Forgot Password?'}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Welcome;
