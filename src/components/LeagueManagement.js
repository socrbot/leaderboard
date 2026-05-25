// src/components/LeagueManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LEAGUES_API_ENDPOINT } from '../apiConfig';
import './LeagueManagement.css';

export default function LeagueManagement({ activeLeagueId, onLeagueChange }) {
  const { getIdToken } = useAuth();

  const [myLeagues, setMyLeagues] = useState([]);
  const [selectedId, setSelectedId] = useState(activeLeagueId || null);
  const [membersByLeague, setMembersByLeague] = useState({});
  const [expandedByLeague, setExpandedByLeague] = useState({});
  const [loadingMembersByLeague, setLoadingMembersByLeague] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copiedLeagueId, setCopiedLeagueId] = useState('');
  const [newLeagueName, setNewLeagueName] = useState('');

  const authHeaders = useCallback(async () => {
    const token = await getIdToken();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }, [getIdToken]);

  const fetchMyLeagues = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${LEAGUES_API_ENDPOINT}/mine`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      setMyLeagues(data);
      return data || [];
    } catch {
      return [];
    }
  }, [authHeaders]);

  const fetchLeagueMembers = useCallback(async (leagueId) => {
    if (!leagueId) return;
    setLoadingMembersByLeague(prev => ({ ...prev, [leagueId]: true }));
    try {
      const headers = await authHeaders();
      const res = await fetch(`${LEAGUES_API_ENDPOINT}/${leagueId}/members`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setMembersByLeague(prev => ({ ...prev, [leagueId]: data || [] }));
    } catch {
      setError('Failed to load league members.');
    } finally {
      setLoadingMembersByLeague(prev => ({ ...prev, [leagueId]: false }));
    }
  }, [authHeaders]);

  const fetchAllLeagueMembers = useCallback(async (leagues) => {
    await Promise.all((leagues || []).map((league) => fetchLeagueMembers(league.leagueId)));
  }, [fetchLeagueMembers]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const leagues = await fetchMyLeagues();
      const initialId = activeLeagueId || leagues?.[0]?.leagueId || null;

      if (initialId) {
        setSelectedId(initialId);
        if (onLeagueChange) onLeagueChange(initialId);
      }

      const defaultExpanded = {};
      (leagues || []).forEach((league) => {
        defaultExpanded[league.leagueId] = league.leagueId === initialId;
      });
      setExpandedByLeague(defaultExpanded);

      await fetchAllLeagueMembers(leagues || []);
      setLoading(false);
    })();
  }, [activeLeagueId, fetchAllLeagueMembers, fetchMyLeagues, onLeagueChange]);

  const handleSelectLeague = (leagueId) => {
    setSelectedId(leagueId);
    setError('');
    if (!expandedByLeague[leagueId]) {
      setExpandedByLeague(prev => ({ ...prev, [leagueId]: true }));
    }
    if (onLeagueChange) onLeagueChange(leagueId);
  };

  const toggleExpanded = async (leagueId) => {
    const next = !expandedByLeague[leagueId];
    setExpandedByLeague(prev => ({ ...prev, [leagueId]: next }));
    if (next && !membersByLeague[leagueId]) {
      await fetchLeagueMembers(leagueId);
    }
  };

  const handleCreateLeague = async () => {
    if (!newLeagueName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(LEAGUES_API_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newLeagueName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create league');
      const newLeague = { leagueId: data.leagueId, name: data.name, inviteCode: data.inviteCode, memberCount: 0 };
      setMyLeagues(prev => [...prev, newLeague]);
      setNewLeagueName('');
      setExpandedByLeague(prev => ({ ...prev, [data.leagueId]: true }));
      setMembersByLeague(prev => ({ ...prev, [data.leagueId]: [] }));
      handleSelectLeague(data.leagueId);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = (leagueId, inviteCode) => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopiedLeagueId(leagueId);
      setTimeout(() => setCopiedLeagueId(''), 2000);
    });
  };

  const handleRemoveMember = async (leagueId, uid, displayName) => {
    if (!window.confirm(`Remove "${displayName || uid}" from this league?`)) return;
    setSaving(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${LEAGUES_API_ENDPOINT}/${leagueId}/members/${uid}`, {
        method: 'DELETE',
        headers: { Authorization: headers.Authorization },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member.');
      }
      setMembersByLeague(prev => ({
        ...prev,
        [leagueId]: (prev[leagueId] || []).filter(m => m.uid !== uid),
      }));
      setMyLeagues(prev => prev.map(l => (
        l.leagueId === leagueId
          ? { ...l, memberCount: Math.max(0, (l.memberCount || 0) - 1) }
          : l
      )));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (value) => {
    const source = (value || '').trim();
    if (!source) return 'U';
    const chunks = source.split(' ').filter(Boolean).slice(0, 2);
    if (chunks.length === 0) return source[0].toUpperCase();
    return chunks.map(chunk => chunk[0]?.toUpperCase()).join('');
  };

  if (loading) return <div className="league-v2-loading">Loading leagues...</div>;

  return (
    <div className="league-v2-shell">
      <div className="league-v2-header">
        <h2 className="league-v2-title">League Management</h2>
      </div>

      <section className="league-v2-grid">
        {myLeagues.map((league) => {
          const isActive = selectedId === league.leagueId;
          const members = membersByLeague[league.leagueId] || [];
          const isExpanded = expandedByLeague[league.leagueId];

          return (
            <article key={league.leagueId} className={`league-v2-card${isActive ? ' active' : ''}`}>
              <button className="league-v2-summary" onClick={() => toggleExpanded(league.leagueId)}>
                <div className="league-v2-summary-left">
                  <div>
                    <h3 className="league-v2-card-title">{league.name}</h3>
                    <p className="league-v2-card-subtitle">{league.memberCount ?? 0} Members • {isActive ? 'Active' : 'Open'}</p>
                    <p className="league-v2-invite-row">
                      <span>{league.inviteCode || 'NO-CODE'}</span>
                      <button
                        type="button"
                        className="league-v2-copy-btn"
                        aria-label={copiedLeagueId === league.leagueId ? 'Copied invite code' : 'Copy invite code'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCode(league.leagueId, league.inviteCode);
                        }}
                      >
                        <span aria-hidden="true">{copiedLeagueId === league.leagueId ? '✓' : '⧉'}</span>
                        <span>{copiedLeagueId === league.leagueId ? 'Copied' : 'Copy'}</span>
                      </button>
                    </p>
                  </div>
                </div>
                <span className={`league-v2-chevron${isExpanded ? ' expanded' : ''}`} aria-hidden="true">▾</span>
              </button>

              {isExpanded && (
                <div className="league-v2-body">
                  <p className="league-v2-body-label">Participating Users</p>
                  {loadingMembersByLeague[league.leagueId] ? (
                    <p className="league-v2-empty">Loading users...</p>
                  ) : members.length === 0 ? (
                    <p className="league-v2-empty">No users yet. Share the invite code to add members.</p>
                  ) : (
                    <ul className="league-v2-member-list">
                      {members.map((member) => (
                        <li key={`${league.leagueId}-${member.uid}`} className="league-v2-member-row">
                          <div className="league-v2-member-main">
                            <div className="league-v2-avatar">{getInitials(member.displayName || member.email || member.uid)}</div>
                            <div>
                              <p className="league-v2-member-name">{member.displayName || member.email || member.uid}</p>
                              <p className="league-v2-member-team">{member.teamName || 'No team assigned'}</p>
                            </div>
                          </div>

                          <div className="league-v2-member-actions">
                            <button
                              className="league-v2-remove-text-btn"
                              onClick={() => handleRemoveMember(league.leagueId, member.uid, member.displayName)}
                              disabled={saving}
                              aria-label="Remove user"
                            >
                              x
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                </div>
              )}
            </article>
          );
        })}

        <section className="league-v2-create-panel">
          <h3 className="league-v2-create-title">Start a New League</h3>
          <div className="league-v2-create-row">
            <input
              className="league-v2-input"
              type="text"
              value={newLeagueName}
              onChange={(e) => setNewLeagueName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateLeague();
              }}
              placeholder="League name"
              maxLength={80}
            />
            <button className="league-v2-btn league-v2-btn-primary" onClick={handleCreateLeague} disabled={creating || !newLeagueName.trim()}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </section>
      </section>

      {error && <p className="league-v2-error">{error}</p>}
    </div>
  );
}
