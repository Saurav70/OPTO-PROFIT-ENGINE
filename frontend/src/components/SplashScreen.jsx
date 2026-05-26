import React from 'react';
import { motion } from 'framer-motion';

const SplashScreen = () => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      background: '#0f172a',
      zIndex: 10000,
    }}
  >
    {/* Pulsing ring */}
    <div style={{ position: 'relative', width: '88px', height: '88px' }}>
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid rgba(13, 148, 136, 0.25)',
        }}
      />
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ display: 'block' }}>
        <circle
          cx="44"
          cy="44"
          r="38"
          fill="none"
          stroke="rgba(13, 148, 136, 0.12)"
          strokeWidth="4"
        />
        <motion.circle
          cx="44"
          cy="44"
          r="38"
          fill="none"
          stroke="#0d9488"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="180 240"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '44px 44px' }}
        />
      </svg>
    </div>

    {/* Brand block */}
    <div style={{ textAlign: 'center' }}>
      <h1
        style={{
          margin: 0,
          fontSize: '1.3rem',
          fontWeight: 900,
          letterSpacing: '4px',
          color: '#0d9488',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        OPTO-PROFIT
      </h1>
      <motion.p
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          margin: '0.6rem 0 0 0',
          fontSize: '0.62rem',
          fontWeight: 800,
          letterSpacing: '3px',
          color: 'rgba(255, 255, 255, 0.35)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        AUTHENTICATING SESSION
      </motion.p>
    </div>
  </div>
);

export default SplashScreen;
