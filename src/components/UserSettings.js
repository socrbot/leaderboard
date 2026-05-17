// src/components/UserSettings.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_BASE_URL, TOURNAMENTS_API_ENDPOINT, LEAGUES_API_ENDPOINT } from '../apiConfig';
import '../App.css';

export default function UserSettings({ activeLeagueId }) {
  const { user, getIdToken } = useAuth();

  const [tournaments, setTournaments] = useState([]);
  const [leagueName, setLeagueName] = useState('');
  const [enrolled, setEnrolled] = useState([]); // list of tournamentIds
  const [participatesInAnnual, setParticipatesInAnnual] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const authHeaders = { Authorization: `Bearer ${token}` };

      const [settingsRes, tournamentsRes, profileRes] = await Promise.all([
        fetch(`${BACKEND_BASE_URL}/user/settings`, { headers: authHeaders }),
        activeLeagueId
          ? fetch(`${TOURNAMENTS_API_ENDPOINT}?leagueId=${activeLeagueId}`)
          : Promise.resolve(null),
        fetch(`${BACKEND_BASE_URL}/user/profile`, { headers: authHeaders }),
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setEnrolled(s.enrolledTournaments || []);
        setParticipatesInAnnual(s.participatesInAnnual !== false);
      }

      if (tournamentsRes && tournamentsRes.ok) {
        setTournaments(await tournamentsRes.json());
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

  const toggleEnrolment = (tid) => {
    setEnrolled(prev =>
      prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]
    );
    setSaved(false);
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
        body: JSON.stringify({ enrolledTournaments: enrolled, participatesInAnnual }),
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
      <p className="subtitle">Choose which tournaments you're playing in and whether to enter the annual championship.</p>

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

        {userProfile?.leagues?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ ...styles.profileLabel, marginBottom: 6 }}>My Leagues</div>
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
          </div>
        )}
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

      {/* Tournament Enrolment */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Tournaments</h3>
        {tournaments.length === 0 ? (
          <p style={{ color: '#888' }}>No tournaments available in your league yet.</p>
        ) : (
          <table className="teams-table">
            <thead>
              <tr>
                <th>Tournament</th>
                <th>Year</th>
                <th style={{ textAlign: 'center' }}>I'm playing</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.year}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={enrolled.includes(t.id)}
                      onChange={() => toggleEnrolment(t.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
