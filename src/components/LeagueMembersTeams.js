// src/components/LeagueMembersTeams.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LEAGUES_API_ENDPOINT } from '../apiConfig';
import '../App.css';

export default function LeagueMembersTeams({ activeLeagueId }) {
  const { getIdToken } = useAuth();
  const [members, setMembers] = useState([]);
  const [leagueName, setLeagueName] = useState('');
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null); // uid being removed

  const fetchData = useCallback(async () => {
    if (!activeLeagueId) return;
    setLoading(true);
    try {
      const token = await getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [membersRes, leagueRes] = await Promise.all([
        fetch(`${LEAGUES_API_ENDPOINT}/${activeLeagueId}/members`, { headers }),
        fetch(`${LEAGUES_API_ENDPOINT}/${activeLeagueId}`),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (leagueRes.ok) {
        const d = await leagueRes.json();
        setLeagueName(d.name || '');
      }
    } catch {}
    setLoading(false);
  }, [activeLeagueId, getIdToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRemove = async (uid, displayName) => {
    if (!window.confirm(`Remove "${displayName || uid}" from this league?`)) return;
    setRemoving(uid);
    try {
      const token = await getIdToken();
      const res = await fetch(`${LEAGUES_API_ENDPOINT}/${activeLeagueId}/members/${uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.uid !== uid));
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to remove member.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setRemoving(null);
    }
  };

  if (!activeLeagueId) {
    return (
      <div className="team-management">
        <p className="subtitle">No league selected. Select a league from the League tab first.</p>
      </div>
    );
  }

  return (
    <div className="team-management">
      <h2>Members — {leagueName || 'League'}</h2>
      <p className="subtitle">
        Each member who joined is a team. Share your invite code from the League tab to add players.
      </p>

      {loading ? (
        <p>Loading members...</p>
      ) : members.length === 0 ? (
        <div className="no-teams-message">
          <p>No members yet. Share your invite code so players can join.</p>
        </div>
      ) : (
        <table className="teams-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.uid}>
                <td>{i + 1}</td>
                <td>{m.displayName || <em style={{ color: '#888' }}>No display name</em>}</td>
                <td>{m.email}</td>
                <td>{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '—'}</td>
                <td>
                  <button
                    onClick={() => handleRemove(m.uid, m.displayName)}
                    disabled={removing === m.uid}
                    style={{
                      background: 'transparent',
                      border: '1px solid #c0392b',
                      color: '#c0392b',
                      borderRadius: '4px',
                      padding: '2px 10px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    {removing === m.uid ? '…' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
