import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage({ onClose }) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleGoogleSignIn = async () => {
    setLocalError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      if (onClose) onClose();
    } catch (err) {
      setLocalError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
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

        <button style={styles.googleBtn} onClick={handleGoogleSignIn} disabled={loading}>
          <svg style={styles.googleIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Signing in…' : 'Sign in with Google'}
        </button>

        {onClose && (
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        )}
      </div>
    </div>,
    document.body
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
