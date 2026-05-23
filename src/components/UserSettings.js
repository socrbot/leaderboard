// src/components/UserSettings.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_BASE_URL, LEAGUES_API_ENDPOINT } from '../apiConfig';
import '../App.css';

export default function UserSettings({ activeLeagueId, onSignOut }) {
  const { user, getIdToken } = useAuth();

  const [leagueName, setLeagueName] = useState('');
  const [participatesInAnnual, setParticipatesInAnnual] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const authHeaders = { Authorization: `Bearer ${token}` };

      const [settingsRes, profileRes] = await Promise.all([
        fetch(`${BACKEND_BASE_URL}/user/settings`, { headers: authHeaders }),
        fetch(`${BACKEND_BASE_URL}/user/profile`, { headers: authHeaders }),
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setParticipatesInAnnual(s.participatesInAnnual !== false);
      }

      if (profileRes && profileRes.ok) {
        setUserProfile(await profileRes.json());
      }

      if (activeLeagueId) {
        const lr = await fetch(`${LEAGUES_API_ENDPOINT}/${activeLeagueId}`);
        if (lr.ok) {
          const d = await lr.json();
          setLeagueName(d.name || '');
        }
      }
    } catch {}
    setLoading(false);
  }, [activeLeagueId, getIdToken]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) { setJoinError('Please enter an invite code.'); return; }
    setJoining(true);
    setJoinError('');
    setJoinSuccess('');
    try {
      const token = await getIdToken();
      const res = await fetch(`${LEAGUES_API_ENDPOINT}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode: code, teamName: (joinTeamName.trim() || user?.displayName || '') }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || 'Invalid invite code.');
      } else {
        setJoinSuccess(data.alreadyMember ? 'Already a member of that league.' : 'Joined successfully!');
        setJoinCode('');
        setJoinTeamName('');
        setShowJoinForm(false);
        load(); // refresh profile to show new league
      }
    } catch {
      setJoinError('Network error. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const token = await getIdToken();
      const res = await fetch(`${BACKEND_BASE_URL}/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ participatesInAnnual }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to save.');
      } else {
        setSaved(true);
      }
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="team-management"><p>Loading your settings…</p></div>;

  const activeLeagueEntry = userProfile?.leagues?.find(l => l.leagueId === activeLeagueId);

  return (
    <div className="team-management">
      <h2>My Settings{leagueName ? ` — ${leagueName}` : ''}</h2>
      <p className="subtitle">Manage your profile and annual championship preference.</p>

      {/* Profile Card */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>My Profile</h3>
        <table style={styles.profileTable}>
          <tbody>
            <tr>
              <td style={styles.profileLabel}>Email</td>
              <td style={styles.profileValue}>{userProfile?.email || user?.email || '—'}</td>
            </tr>
            <tr>
              <td style={styles.profileLabel}>Display Name</td>
              <td style={styles.profileValue}>{userProfile?.displayName || user?.displayName || '—'}</td>
            </tr>
            {activeLeagueEntry && (
              <tr>
                <td style={styles.profileLabel}>Team Name</td>
                <td style={styles.profileValue}>{activeLeagueEntry.teamName || '—'}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 14 }}>
          <div style={{ ...styles.profileLabel, marginBottom: 6 }}>My Leagues</div>
          {userProfile?.leagues?.length > 0 ? (
            <ul style={styles.leagueList}>
              {userProfile.leagues.map(l => (
                <li key={l.leagueId} style={styles.leagueItem}>
                  <span style={{ color: '#e0e0e0' }}>{l.name || l.leagueId}</span>
                  {l.teamName && (
                    <span style={{ color: '#888', marginLeft: 8, fontSize: '0.85rem' }}>({l.teamName})</span>
                  )}
                  {l.leagueId === activeLeagueId && (
                    <span style={styles.activeBadge}>active</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 8px' }}>No leagues yet.</p>
          )}

          {joinSuccess && <p style={{ color: '#4caf50', fontSize: '0.85rem', margin: '6px 0' }}>{joinSuccess}</p>}

          {showJoinForm ? (
            <form onSubmit={handleJoin} style={styles.joinForm}>
              <input
                type="text"
                placeholder="Team name (optional)"
                value={joinTeamName}
                onChange={e => setJoinTeamName(e.target.value)}
                maxLength={40}
                disabled={joining}
                className="form-input"
                style={styles.joinInput}
              />
              <input
                type="text"
                placeholder="Invite code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={10}
                disabled={joining}
                className="form-input"
                style={styles.joinInput}
                autoCapitalize="characters"
                autoComplete="off"
              />
              {joinError && <p style={{ color: '#c0392b', fontSize: '0.8rem', margin: '4px 0' }}>{joinError}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={joining} className="btn-primary" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                  {joining ? 'Joining…' : 'Join'}
                </button>
                <button type="button" onClick={() => { setShowJoinForm(false); setJoinError(''); }} className="btn-secondary" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { setShowJoinForm(true); setJoinSuccess(''); }}
              className="btn-secondary"
              style={{ marginTop: 8, fontSize: '0.85rem', padding: '6px 14px' }}
            >
              + Join a New League
            </button>
          )}
        </div>
      </div>

      {/* Annual Championship */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Annual Championship</h3>
        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={participatesInAnnual}
            onChange={e => { setParticipatesInAnnual(e.target.checked); setSaved(false); }}
            style={{ marginRight: 10 }}
          />
          Include me in the Annual Championship standings
        </label>
      </div>

      {error && <p style={{ color: '#c0392b' }}>{error}</p>}

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="create-tournament-btn"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <span style={{ color: '#27ae60', fontSize: '0.9rem' }}>Saved ✓</span>}
      </div>

      {onSignOut && (
        <div style={{ marginTop: 24, borderTop: '1px solid #333', paddingTop: 16 }}>
          <button
            onClick={onSignOut}
            className="btn-secondary"
            style={{ fontSize: '0.85rem', padding: '6px 16px', color: '#f87171', borderColor: '#f87171' }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  section: {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 16,
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '1rem',
    color: '#ccc',
    fontWeight: 600,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  profileTable: {
    borderCollapse: 'collapse',
    width: '100%',
  },
  profileLabel: {
    color: '#888',
    fontSize: '0.85rem',
    paddingRight: 16,
    paddingBottom: 6,
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
  },
  profileValue: {
    color: '#e0e0e0',
    fontSize: '0.95rem',
    paddingBottom: 6,
  },
  leagueList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  leagueItem: {
    padding: '5px 0',
    borderBottom: '1px solid #2a2a2a',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.9rem',
  },
  joinForm: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  joinInput: {
    fontSize: '0.9rem',
    padding: '6px 10px',
  },
  activeBadge: {
    marginLeft: 8,
    background: '#1a4a1a',
    color: '#4caf50',
    border: '1px solid #2e7d32',
    borderRadius: 4,
    padding: '1px 6px',
    fontSize: '0.75rem',
  },
};
