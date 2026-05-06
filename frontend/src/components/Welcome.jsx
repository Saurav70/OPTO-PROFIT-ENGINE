import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, KeyRound } from 'lucide-react';
import { api } from '../services/api';

const Welcome = ({ onAuthSuccess, authError, setAuthError, twoFactorRequired, on2faSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState('');

  // FIX 1: Pass `data` to onAuthSuccess so App.jsx can detect two_factor_required.
  // FIX 2: Removed premature api.auth.setToken() call — apiRequest() already
  //         handles token storage correctly (AUTH_TOKEN_KEY vs TEMP_2FA_TOKEN_KEY).
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
      onAuthSuccess(data); // FIX 1: was onAuthSuccess() — response data must be passed
    } catch (error) {
      setAuthError(error?.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // FIX 3: New handler for 2FA code submission
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
        throw new Error('2FA verification failed — no token returned.');
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

  // ── 2FA Screen ──────────────────────────────────────────────────────────────
  // FIX 3: Render a dedicated 2FA entry panel when twoFactorRequired is true
  if (twoFactorRequired) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', background: 'transparent', overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(var(--accent-primary) 1px, transparent 1px), linear-gradient(90deg, var(--accent-primary) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass"
          style={{ width: '440px', padding: '3.5rem', boxShadow: '0 25px 60px -12px rgba(13, 148, 136, 0.15)', position: 'relative', zIndex: 1 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', borderRadius: '12px', marginBottom: '1.25rem', boxShadow: 'var(--shadow-glow)' }}>
              <KeyRound size={24} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-white)', margin: '0 0 0.3rem 0', fontWeight: 800, letterSpacing: '1px' }}>
              TWO-FACTOR AUTH
            </h2>
            <p style={{ color: 'var(--text-sub)', fontSize: '0.8rem', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            <div>
              <label style={{ color: 'var(--text-sub)', fontSize: '0.7rem', fontWeight: 800, display: 'block', marginBottom: '0.5rem', letterSpacing: '1.5px' }}>
                VERIFICATION CODE
              </label>
              <input
                placeholder="000000"
                className="input-field"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 700 }}
                onKeyDown={(e) => e.key === 'Enter' && submit2fa()}
                autoFocus
              />
            </div>

            {authError ? (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: 0 }}>{authError}</p>
            ) : null}

            <button
              onClick={submit2fa}
              className="btn-primary"
              style={{ marginTop: '0.5rem' }}
              disabled={isSubmitting || twoFactorCode.length !== 6}
            >
              {isSubmitting ? 'VERIFYING...' : 'VERIFY & ENTER'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Login / Register Screen ─────────────────────────────────────────────────
  return (
    <div
      style={{
        width: '100vw', height: '100vh', display: 'flex',
        background: 'transparent',
        overflow: 'hidden', position: 'relative'
      }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(var(--accent-primary) 1px, transparent 1px), linear-gradient(90deg, var(--accent-primary) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          flex: 1, padding: '6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, transparent 100%)',
          position: 'relative', zIndex: 1
        }}
      >
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '3rem' }}>
          <div style={{
            width: '48px', height: '48px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            borderRadius: '10px', boxShadow: 'var(--shadow-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '0.9rem', color: '#fff', letterSpacing: '1px'
          }}>TE</div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '3px' }}>TEIRAC</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-sub)', letterSpacing: '3px', fontWeight: 700 }}>INNOVATE. ELEVATE.</div>
          </div>
        </motion.div>

        <motion.p variants={itemVariants} style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 400, letterSpacing: '2px', margin: '0 0 0.5rem 0' }}>TEIRAC PRIVATE LIMITED</motion.p>
        <motion.h1 variants={itemVariants} style={{ fontSize: '4.5rem', fontWeight: 900, margin: '0 0 1.5rem 0', lineHeight: 1.05, color: 'var(--text-white)' }}>
          OPTOPROFIT<br />
          <span style={{ color: 'var(--accent-primary)' }}>ENGINE</span>
        </motion.h1>
        <motion.p variants={itemVariants} style={{ fontSize: '1.2rem', color: 'var(--text-sub)', maxWidth: '480px', marginBottom: '3rem', fontWeight: 300, lineHeight: 1.6 }}>
          Advanced analytics and assembly line optimization for<br />
          <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>Maximum Factory Output &amp; Profitability</span>
        </motion.p>

        <motion.div variants={itemVariants} style={{ display: 'flex', gap: '2rem', marginTop: '4rem', opacity: 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)', letterSpacing: '1px' }}>ENTERPRISE GRADE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="var(--accent-warning)" />
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)', letterSpacing: '1px' }}>REAL-TIME ENGINE</span>
          </div>
        </motion.div>
      </motion.div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass"
          style={{ width: '440px', padding: '3.5rem', boxShadow: '0 25px 60px -12px rgba(13, 148, 136, 0.15)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <div style={{
                width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '0.6rem', color: '#fff'
              }}>TE</div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '2px' }}>TEIRAC</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-white)', margin: '0 0 0.3rem 0', fontWeight: 800, letterSpacing: '1px' }}>PORTAL ACCESS</h2>
            <p style={{ color: 'var(--text-sub)', fontSize: '0.8rem', margin: 0, fontWeight: 500 }}>Enter your credentials to continue</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            {!isRecovery ? (
              <>
                <div>
                  <label style={{ color: 'var(--text-sub)', fontSize: '0.7rem', fontWeight: 800, display: 'block', marginBottom: '0.5rem', letterSpacing: '1.5px' }}>OFFICIAL EMAIL</label>
                  <input
                    placeholder="engineer@teirac.com"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitAuth('login')}
                  />
                </div>

                <div>
                  <label style={{ color: 'var(--text-sub)', fontSize: '0.7rem', fontWeight: 800, display: 'block', marginBottom: '0.5rem', letterSpacing: '1.5px' }}>SECURITY ACCESS KEY</label>
                  <input
                    type="password"
                    placeholder="************"
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitAuth('login')}
                  />
                </div>

                {authError ? (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: 0 }}>{authError}</p>
                ) : null}

                <button
                  onClick={() => submitAuth('login')}
                  className="btn-primary"
                  style={{ marginTop: '0.5rem' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'AUTHORIZING...' : 'AUTHORIZE & ENTER'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 600 }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                </div>

                <button
                  className="btn-outline"
                  style={{ padding: '0.8rem', fontSize: '0.8rem', border: '1px solid var(--glass-border)', color: 'var(--text-sub)' }}
                  onClick={() => submitAuth('register')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'PROCESSING...' : 'REQUEST SYSTEM ACCESS'}
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Enter your <strong>Registered Email</strong> to receive a secure restoration token.
                </p>
                
                <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                  <label style={{ color: 'var(--text-sub)', fontSize: '0.7rem', fontWeight: 800, display: 'block', marginBottom: '0.5rem', letterSpacing: '1.5px' }}>REGISTERED EMAIL</label>
                  <input
                    placeholder="engineer@teirac.com"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {authError ? (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '1rem' }}>{authError}</p>
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
                  {isSubmitting ? 'SENDING...' : 'SEND RECOVERY EMAIL'}
                </button>

                <button
                  className="btn-outline"
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                  onClick={() => {
                    setIsRecovery(false);
                    setRecoverySuccess('');
                    setAuthError('');
                  }}
                >
                  RETURN TO LOGIN
                </button>
              </div>
            )}

            <p
              style={{ textAlign: 'center', color: 'var(--accent-primary)', fontSize: '0.75rem', margin: '0.5rem 0 0 0', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setIsRecovery(!isRecovery)}
            >
              {isRecovery ? 'Back to Authentication' : 'Recovery Options'}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Welcome;
