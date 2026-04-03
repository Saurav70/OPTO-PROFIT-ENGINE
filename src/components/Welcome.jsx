import React from 'react';

const Welcome = ({ onContinue }) => {
  return (
    <div style={{ 
      width: '100vw', height: '100vh', display: 'flex',
      background: 'transparent', // Let the body's dynamic gradient show through
      overflow: 'hidden', position: 'relative'
    }}>
      {/* Decorative grid lines */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(var(--accent-primary) 1px, transparent 1px), linear-gradient(90deg, var(--accent-primary) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Brand Side */}
      <div style={{ 
        flex: 1, padding: '6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, transparent 100%)',
        position: 'relative', zIndex: 1
      }}>
        {/* TEIRAC Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '3rem' }}>
          <div style={{
            width: '48px', height: '48px',
            background: 'linear-gradient(135deg, var(--accent-primary), #38bdf8)',
            borderRadius: '10px', boxShadow: 'var(--shadow-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '0.9rem', color: '#fff', letterSpacing: '1px'
          }}>TE</div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '3px' }}>TEIRAC</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-sub)', letterSpacing: '3px' }}>INNOVATE. ELEVATE.</div>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 400, letterSpacing: '2px', margin: '0 0 0.5rem 0' }}>TEIRAC PRIVATE LIMITED</p>
        <h1 style={{ fontSize: '4rem', fontWeight: 900, margin: '0 0 1.5rem 0', lineHeight: 1.05, color: 'var(--text-white)' }}>
          OPTOPROFIT<br />
          <span style={{ color: 'var(--accent-primary)' }}>ENGINE</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-sub)', maxWidth: '480px', marginBottom: '3rem', fontWeight: 300, lineHeight: 1.6 }}>
          Optimizing Assembly Lines for<br />
          <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>Maximum Output & Profit</span>
        </p>
        
        <button 
          onClick={onContinue}
          style={{ 
            width: '220px', padding: '1.1rem', fontSize: '0.85rem', fontWeight: 700,
            background: 'transparent', border: '2px solid var(--accent-primary)',
            color: 'var(--accent-primary)', letterSpacing: '1px',
            transition: 'all 0.3s ease', cursor: 'pointer', borderRadius: '8px'
          }}
          onMouseEnter={(e) => { e.target.style.background = 'var(--accent-primary)'; e.target.style.color = 'var(--bg-primary)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--accent-primary)'; }}
        >
          CLICK TO CONTINUE
        </button>
      </div>

      {/* Login Card Side */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div className="glass" style={{ width: '420px', padding: '3rem', boxShadow: '0 25px 60px -12px rgba(2, 132, 199, 0.15)' }}>
          {/* Card Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <div style={{
                width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--accent-primary), #38bdf8)',
                borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '0.6rem', color: '#fff'
              }}>TE</div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '2px' }}>TEIRAC</span>
            </div>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--text-white)', margin: '0 0 0.3rem 0', fontWeight: 700 }}>OPTOPROFIT ENGINE</h2>
            <p style={{ color: 'var(--text-sub)', fontSize: '0.8rem', margin: 0 }}>PORTAL ACCESS</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ color: 'var(--text-sub)', fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', letterSpacing: '1px' }}>USER ID</label>
              <input 
                placeholder="Enter your ID"
                style={{ 
                  width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)',
                  padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', color: 'var(--text-white)',
                  fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s'
                }}
              />
            </div>

            <div>
              <label style={{ color: 'var(--text-sub)', fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', letterSpacing: '1px' }}>PASSWORD</label>
              <input 
                type="password" placeholder="••••••••"
                style={{ 
                  width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)',
                  padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', color: 'var(--text-white)',
                  fontSize: '0.9rem', outline: 'none'
                }}
              />
            </div>
            
            <button 
              onClick={onContinue}
              style={{
                padding: '1rem', borderRadius: 'var(--radius-md)',
                background: 'var(--accent-primary)', color: 'var(--bg-primary)',
                fontWeight: 700, border: 'none', fontSize: '0.9rem',
                letterSpacing: '1px', marginTop: '0.5rem', cursor: 'pointer'
              }}
            >LOG IN</button>

            <button 
              style={{
                padding: '1rem', borderRadius: 'var(--radius-md)',
                background: 'transparent', color: 'var(--text-sub)',
                fontWeight: 600, border: '1px solid var(--glass-border)',
                fontSize: '0.85rem', cursor: 'pointer'
              }}
            >SIGN UP</button>

            <p style={{ textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.75rem', margin: '0.5rem 0 0 0', cursor: 'pointer' }}>Forgot Password?</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
