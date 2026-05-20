import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * EmptyState — Reusable industrial-grade empty state component.
 * Props:
 *   icon        — Lucide-React icon component
 *   title       — Primary heading
 *   description — Descriptive helper text
 *   actionText  — CTA button label (optional)
 *   onAction    — Callback for CTA button (optional)
 */
const EmptyState = ({ icon: Icon, title, description, actionText, onAction }) => {
  return (
    <motion.div
      className="empty-state-container"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {Icon && (
        <div className="empty-state-icon-wrap">
          <Icon size={32} strokeWidth={1.5} />
        </div>
      )}

      <h3 className="empty-state-title">{title}</h3>

      {description && (
        <p className="empty-state-description">{description}</p>
      )}

      {actionText && onAction && (
        <button className="empty-state-btn" onClick={onAction}>
          {actionText}
          <ArrowRight size={15} />
        </button>
      )}
    </motion.div>
  );
};

export default EmptyState;
