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

  if (!activeLeagueId) {
    return (
      <div className="team-management">
        <p className="subtitle">No league selected. Select a league from the League tab first.</p>
      </div>
    );
  }

  return (
    <div className="team-management">
      <h2>Teams — {leagueName || 'League'}</h2>
      <p className="subtitle">
        Each member who joined your league is a team. Share your invite code from the League tab to add more teams.
      </p>

      {loading ? (
        <p>Loading members...</p>
      ) : members.length === 0 ? (
        <div className="no-teams-message">
          <p>No members yet. Share your invite code so players can join as teams.</p>
        </div>
      ) : (
        <table className="teams-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team Name (Display Name)</th>
              <th>Email</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.uid}>
                <td>{i + 1}</td>
                <td>{m.displayName || <em style={{ color: '#888' }}>No display name</em>}</td>
                <td>{m.email}</td>
                <td>{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
