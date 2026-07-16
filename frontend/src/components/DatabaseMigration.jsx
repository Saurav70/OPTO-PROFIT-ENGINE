import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const DatabaseMigration = ({ onMigrationSuccess }) => {
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState('');

  const handleMigrate = async (e) => {
    e.preventDefault();
    setError('');
    
    if (recoveryPhrase.trim().replace(/-/g, '').length !== 16) {
      setError('Recovery Phrase must be exactly 16 characters.');
      return;
    }

    setIsMigrating(true);
    try {
      await api.post('/api/migration/unlock', {
        recovery_phrase: recoveryPhrase
      });
      onMigrationSuccess();
    } catch (err) {
      setError(err.message || 'Failed to migrate database. Invalid Recovery Phrase.');
      setIsMigrating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-4 relative overflow-hidden font-inter text-slate-200">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-900/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#161718] border border-red-900/30 rounded-2xl p-8 relative z-10 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-red-900/20 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-red-900/40">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Hardware Mismatch</h1>
          <p className="text-sm text-slate-400">
            This database is cryptographically locked to a different computer. Enter your Recovery Phrase to securely migrate it to this machine.
          </p>
        </div>

        <form onSubmit={handleMigrate} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              Recovery Phrase
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound size={18} className="text-slate-500" />
              </div>
              <input
                type="text"
                value={recoveryPhrase}
                onChange={(e) => setRecoveryPhrase(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full pl-11 pr-4 py-3 bg-[#0a0a0b] border border-slate-800 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all text-white placeholder-slate-600 font-mono tracking-widest outline-none"
                required
                disabled={isMigrating}
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isMigrating || !recoveryPhrase}
            className="w-full relative group overflow-hidden bg-white text-black py-3 px-4 rounded-xl font-medium transition-all hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isMigrating ? (
              <>
                <Loader2 size={18} className="animate-spin text-red-600" />
                <span>Migrating...</span>
              </>
            ) : (
              <>
                <span>Unlock & Migrate Database</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default DatabaseMigration;
