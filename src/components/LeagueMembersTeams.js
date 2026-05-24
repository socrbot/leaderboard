// src/components/LeagueMembersTeams.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LEAGUES_API_ENDPOINT } from '../apiConfig';
import './LeagueManagement.css';

export default function LeagueMembersTeams({ activeLeagueId }) {
  const { getIdToken } = useAuth();
  const [members, setMembers] = useState([]);
  const [leagueName, setLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
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
        setInviteCode(d.inviteCode || '');
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
      <div className="league-v2-shell">
        <p className="league-v2-empty">No league selected. Select a league from the League tab first.</p>
      </div>
    );
  }

  return (
    <div className="league-v2-shell">
      <div className="league-v2-header">
        <h2 className="league-v2-title">Members — {leagueName || 'League'}</h2>
        <p className="league-v2-subtitle">Each member who joined is a team. Share your invite code to add players.</p>
      </div>

      <section className="league-v2-card league-v2-members-card">
        <div className="league-v2-summary league-v2-members-summary">
          <div className="league-v2-summary-left">
            <span className="material-symbols-outlined league-v2-icon" aria-hidden="true">golf_course</span>
            <div>
              <h3 className="league-v2-card-title">{leagueName || 'League'}</h3>
              <p className="league-v2-card-subtitle">{members.length} Members • {inviteCode || 'No Code'}</p>
            </div>
          </div>
        </div>

        <div className="league-v2-body">
          <p className="league-v2-body-label">Participating Users</p>
          {loading ? (
            <p className="league-v2-empty">Loading users...</p>
          ) : members.length === 0 ? (
            <p className="league-v2-empty">No users yet. Share your invite code so players can join.</p>
          ) : (
            <ul className="league-v2-member-list">
              {members.map((m) => (
                <li key={m.uid} className="league-v2-member-row">
                  <div className="league-v2-member-main">
                    <div className="league-v2-avatar">{(m.displayName || m.email || m.uid || 'U').split(' ').slice(0, 2).map(part => part[0]?.toUpperCase()).join('')}</div>
                    <div>
                      <p className="league-v2-member-name">{m.displayName || m.email || m.uid}</p>
                      <p className="league-v2-member-team">{m.teamName || 'No team assigned'}</p>
                    </div>
                  </div>

                  <div className="league-v2-member-actions">
                    <button
                      onClick={() => handleRemove(m.uid, m.displayName)}
                      disabled={removing === m.uid}
                      className="league-v2-icon-btn"
                      aria-label="Remove user"
                    >
                      <span className="material-symbols-outlined">{removing === m.uid ? 'hourglass_top' : 'person_remove'}</span>
                    </button>
                    <span className="material-symbols-outlined league-v2-muted" aria-hidden="true">mail</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
