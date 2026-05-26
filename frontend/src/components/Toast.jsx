/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

const VARIANT_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: 'rgba(13, 148, 136, 0.12)',
    border: 'rgba(13, 148, 136, 0.4)',
    color: 'var(--accent-primary)',
    shadow: 'rgba(13, 148, 136, 0.15)',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.4)',
    color: 'var(--accent-warning)',
    shadow: 'rgba(245, 158, 11, 0.15)',
  },
  error: {
    icon: XCircle,
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.4)',
    color: 'var(--accent-danger)',
    shadow: 'rgba(239, 68, 68, 0.15)',
  },
};

/**
 * Toast — A single self-dismissing notification.
 *
 * Props:
 *  - id: unique key
 *  - message: string
 *  - variant: 'success' | 'warning' | 'error'
 *  - duration: auto-dismiss ms (0 = sticky)
 *  - onDismiss(id): callback
 */
const ToastItem = ({ id, message, variant = 'error', duration = 5000, onDismiss }) => {
  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.error;
  const Icon = cfg.icon;

  useEffect(() => {
    if (!duration) return undefined;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.94 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '0.75rem 1rem',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '10px',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 8px 24px ${cfg.shadow}`,
        minWidth: '280px',
        maxWidth: '420px',
      }}
    >
      <Icon size={16} color={cfg.color} style={{ flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          fontSize: '0.74rem',
          fontWeight: 700,
          color: cfg.color,
          lineHeight: 1.4,
          letterSpacing: '0.3px',
        }}
      >
        {message}
      </span>
      <button
        onClick={() => onDismiss(id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: cfg.color,
          opacity: 0.5,
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

/**
 * ToastContainer — Renders a stack of toasts.
 *
 * Props:
 *  - toasts: [{ id, message, variant, duration }]
 *  - onDismiss(id): removes from array
 */
const ToastContainer = ({ toasts = [], onDismiss }) => (
  <div
    style={{
      position: 'fixed',
      top: '1.2rem',
      right: '1.2rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      pointerEvents: 'none',
    }}
  >
    <AnimatePresence mode="popLayout">
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem {...t} onDismiss={onDismiss} />
        </div>
      ))}
    </AnimatePresence>
  </div>
);

/**
 * useToast — Hook that manages toast state.
 *
 * Returns [toasts, addToast, dismissToast].
 * addToast({ message, variant?, duration? })
 */
export const useToast = () => {
  const [toasts, setToasts] = React.useState([]);

  const addToast = useCallback(({ message, variant = 'error', duration = 5000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, variant, duration }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return [toasts, addToast, dismissToast];
};

export default ToastContainer;
