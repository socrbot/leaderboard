// src/components/JoinLeague.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LEAGUES_API_ENDPOINT } from '../apiConfig';

export default function JoinLeague() {
  const { user, getIdToken, refreshUserData, signOut } = useAuth();

  const [inviteCode, setInviteCode] = useState('');
  const [teamName, setTeamName] = useState(user?.displayName || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter an invite code.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const token = await getIdToken();
      const res = await fetch(`${LEAGUES_API_ENDPOINT}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode: code, teamName: teamName.trim() || user?.displayName || '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to join league. Check your invite code.');
        return;
      }
      // Refresh user data so App.js sees inLeague: true and hides this screen
      await refreshUserData();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.logo}>⛳</div>
        <h2 style={styles.title}>Join the League</h2>
        <p style={styles.subtitle}>
          Signed in as <strong>{user?.displayName || user?.email}</strong>
        </p>
        <p style={styles.description}>
          Enter your invite code to join and see the full leaderboard.
        </p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Team Name</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder={user?.displayName || 'Your team name'}
            maxLength={40}
            style={styles.input}
            autoComplete="off"
            disabled={submitting}
          />
          <label style={styles.label}>Invite Code</label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="INVITE CODE"
            maxLength={10}
            style={styles.input}
            autoCapitalize="characters"
            autoComplete="off"
            disabled={submitting}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? 'Joining…' : 'Join League'}
          </button>
        </form>
        <button onClick={signOut} style={styles.signOutLink}>
          Sign out
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#1e1e1e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: '12px',
    padding: '2.5rem 2rem',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  logo: {
    fontSize: '3rem',
    marginBottom: '0.5rem',
  },
  title: {
    margin: '0 0 0.5rem',
    fontSize: '1.6rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  subtitle: {
    margin: '0 0 0.75rem',
    fontSize: '0.85rem',
    color: '#aaa',
  },
  description: {
    margin: '0 0 1.5rem',
    fontSize: '0.95rem',
    color: '#ccc',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  label: {
    textAlign: 'left',
    fontSize: '0.8rem',
    color: '#aaa',
    marginBottom: '-0.25rem',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid #444',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    fontSize: '1.1rem',
    letterSpacing: '0.15em',
    textAlign: 'center',
    outline: 'none',
  },
  button: {
    padding: '0.75rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1f5f33',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    margin: 0,
    color: '#ff6b6b',
    fontSize: '0.875rem',
  },
  signOutLink: {
    marginTop: '1.25rem',
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '0.85rem',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};
