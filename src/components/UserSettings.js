// src/components/UserSettings.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_BASE_URL, TOURNAMENTS_API_ENDPOINT, LEAGUES_API_ENDPOINT } from '../apiConfig';
import '../App.css';

export default function UserSettings({ activeLeagueId }) {
  const { getIdToken, userData } = useAuth();

  const [tournaments, setTournaments] = useState([]);
  const [leagueName, setLeagueName] = useState('');
  const [enrolled, setEnrolled] = useState([]); // list of tournamentIds
  const [participatesInAnnual, setParticipatesInAnnual] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const authHeaders = { Authorization: `Bearer ${token}` };

      const [settingsRes, tournamentsRes] = await Promise.all([
        fetch(`${BACKEND_BASE_URL}/user/settings`, { headers: authHeaders }),
        activeLeagueId
          ? fetch(`${TOURNAMENTS_API_ENDPOINT}?leagueId=${activeLeagueId}`)
          : Promise.resolve(null),
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setEnrolled(s.enrolledTournaments || []);
        setParticipatesInAnnual(s.participatesInAnnual !== false);
      }

      if (tournamentsRes && tournamentsRes.ok) {
        setTournaments(await tournamentsRes.json());
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

  return (
    <div className="team-management">
      <h2>My Settings{leagueName ? ` — ${leagueName}` : ''}</h2>
      <p className="subtitle">Choose which tournaments you're playing in and whether to enter the annual championship.</p>

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
};
