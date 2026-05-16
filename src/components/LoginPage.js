import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage({ onClose }) {
  const { signIn, resetPassword, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      if (onClose) onClose();
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found'
        ? 'Invalid email or password.'
        : 'Sign in failed. Please try again.';
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email) {
      setLocalError('Enter your email address above to reset your password.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setLocalError('Could not send reset email. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.logo}>⛳</span>
          <h2 style={styles.title}>Admin Sign In</h2>
          <p style={styles.subtitle}>Alumni Golf Tournament</p>
        </div>

        {localError && (
          <div style={styles.errorBox}>{localError}</div>
        )}

        {resetSent ? (
          <div style={styles.successBox}>
            Password reset email sent to <strong>{email}</strong>. Check your inbox.
            <button style={styles.linkBtn} onClick={() => { setResetSent(false); setShowReset(false); }}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignIn} style={styles.form} noValidate>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />

            {!showReset && (
              <>
                <label style={styles.label}>Password</label>
                <input
                  style={styles.input}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
              </>
            )}

            {!showReset ? (
              <>
                <button type="submit" style={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
                <button
                  type="button"
                  style={styles.linkBtn}
                  onClick={() => { setShowReset(true); setLocalError(''); }}
                >
                  Forgot password?
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  style={styles.primaryBtn}
                  disabled={loading}
                  onClick={handleResetPassword}
                >
                  {loading ? 'Sending…' : 'Send Reset Email'}
                </button>
                <button
                  type="button"
                  style={styles.linkBtn}
                  onClick={() => { setShowReset(false); setLocalError(''); }}
                >
                  Back to sign in
                </button>
              </>
            )}
          </form>
        )}

        {onClose && (
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    position: 'relative',
    background: '#1a1a2e',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '40px 36px 32px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logo: {
    fontSize: '2rem',
  },
  title: {
    color: '#fff',
    margin: '8px 0 4px',
    fontSize: '1.4rem',
    fontWeight: 700,
  },
  subtitle: {
    color: '#888',
    margin: 0,
    fontSize: '0.85rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#aaa',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '8px',
  },
  input: {
    background: '#111',
    border: '1px solid #444',
    borderRadius: '6px',
    color: '#fff',
    padding: '10px 12px',
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    marginTop: '16px',
    background: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '11px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#4ade80',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginTop: '10px',
    padding: 0,
    textDecoration: 'underline',
    display: 'block',
    textAlign: 'center',
  },
  errorBox: {
    background: 'rgba(248,113,113,0.15)',
    border: '1px solid rgba(248,113,113,0.4)',
    borderRadius: '6px',
    color: '#f87171',
    padding: '10px 12px',
    fontSize: '0.85rem',
    marginBottom: '12px',
  },
  successBox: {
    background: 'rgba(74,222,128,0.1)',
    border: '1px solid rgba(74,222,128,0.3)',
    borderRadius: '6px',
    color: '#4ade80',
    padding: '14px 12px',
    fontSize: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '14px',
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '1rem',
    cursor: 'pointer',
    lineHeight: 1,
  },
};
