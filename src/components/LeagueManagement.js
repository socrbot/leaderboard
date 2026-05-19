// src/components/LeagueManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LEAGUES_API_ENDPOINT } from '../apiConfig';

export default function LeagueManagement({ activeLeagueId, onLeagueChange }) {
  const { getIdToken } = useAuth();

  const [myLeagues, setMyLeagues] = useState([]);       // list from /api/leagues/mine
  const [selectedId, setSelectedId] = useState(activeLeagueId || null);
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');

  const authHeaders = useCallback(async () => {
    const token = await getIdToken();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }, [getIdToken]);

  const fetchMyLeagues = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${LEAGUES_API_ENDPOINT}/mine`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setMyLeagues(data);
      return data;
    } catch {
      return [];
    }
  }, [authHeaders]);

  const fetchLeague = useCallback(async (leagueId) => {
    if (!leagueId) return;
    try {
      const res = await fetch(`${LEAGUES_API_ENDPOINT}/${leagueId}`);
      if (!res.ok) return;
      setLeague(await res.json());
    } catch {
      setError('Failed to load league info.');
    }
  }, []);

  // On mount: load admin's leagues, then select the active one (or first available)
  useEffect(() => {
    (async () => {
      setLoading(true);
      const leagues = await fetchMyLeagues();
      const initialId = activeLeagueId || leagues?.[0]?.leagueId || null;
      if (initialId) {
        setSelectedId(initialId);
        await fetchLeague(initialId);
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectLeague = async (leagueId) => {
    setSelectedId(leagueId);
    setLeague(null);
    setError('');
    setEditingName(false);
    await fetchLeague(leagueId);
    if (onLeagueChange) onLeagueChange(leagueId);
  };

  const handleCreateLeague = async () => {
    if (!newLeagueName.trim()) return;
    setSaving(true);
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
      setShowCreateForm(false);
      await handleSelectLeague(data.leagueId);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim() || !selectedId) return;
    setSaving(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${LEAGUES_API_ENDPOINT}/${selectedId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update name');
      setLeague(prev => ({ ...prev, name: data.name }));
      setMyLeagues(prev => prev.map(l => l.leagueId === selectedId ? { ...l, name: data.name } : l));
      setEditingName(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!selectedId) return;
    if (!window.confirm('Generate a new invite code? The old code will stop working immediately.')) return;
    setSaving(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${LEAGUES_API_ENDPOINT}/${selectedId}/regenerate_code`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate code');
      setLeague(prev => ({ ...prev, inviteCode: data.inviteCode }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (!league?.inviteCode) return;
    navigator.clipboard.writeText(league.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <div className="league-loading">Loading leagues…</div>;

  return (
    <div className="league-management">
      {/* League switcher header */}
      <div className="league-section">
        <div className="league-section-header">
          <h3 className="league-section-title">My Leagues</h3>
          <button className="league-btn-ghost" onClick={() => { setShowCreateForm(v => !v); setError(''); }}>
            {showCreateForm ? 'Cancel' : '+ New League'}
          </button>
        </div>

        {showCreateForm && (
          <div className="league-init-row" style={{ marginBottom: '12px' }}>
            <input
              className="league-name-input"
              type="text"
              value={newLeagueName}
              onChange={e => setNewLeagueName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateLeague(); }}
              placeholder="League name"
              maxLength={80}
              autoFocus
            />
            <button className="league-btn-primary" onClick={handleCreateLeague} disabled={saving || !newLeagueName.trim()}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        )}

        {myLeagues.length === 0 && !showCreateForm ? (
          <p className="league-hint">No leagues yet. Create your first league above.</p>
        ) : (
          <ul className="league-member-list">
            {myLeagues.map(l => (
              <li
                key={l.leagueId}
                className={`league-member-row${l.leagueId === selectedId ? ' league-row-active' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelectLeague(l.leagueId)}
              >
                <span className="league-member-name">{l.name}</span>
                <span className="league-member-email">{l.memberCount ?? 0} member{l.memberCount !== 1 ? 's' : ''}</span>
                {l.leagueId === selectedId && <span style={{ marginLeft: 'auto', color: '#4caf50', fontSize: '12px' }}>Active</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected league detail */}
      {league && (
        <>
          {/* League name */}
          <div className="league-section">
            <div className="league-section-header">
              <h3 className="league-section-title">League</h3>
            </div>
            {editingName ? (
              <div className="league-name-row">
                <input
                  className="league-name-input"
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                  maxLength={80}
                />
                <button className="league-btn-primary" onClick={handleSaveName} disabled={saving || !nameInput.trim()}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="league-btn-ghost" onClick={() => setEditingName(false)}>Cancel</button>
              </div>
            ) : (
              <div className="league-name-row">
                <span className="league-name-value">{league.name}</span>
                <button className="league-btn-ghost" onClick={() => { setNameInput(league.name); setEditingName(true); }}>
                  Edit
                </button>
              </div>
            )}
            <p className="league-meta">{league.memberCount ?? 0} member{league.memberCount !== 1 ? 's' : ''}</p>
          </div>

          {/* Invite code */}
          <div className="league-section">
            <h3 className="league-section-title">Invite Code</h3>
            <p className="league-hint">Share this code with players to let them join the league.</p>
            <div className="league-code-row">
              <span className="league-invite-code">{league.inviteCode}</span>
              <button className="league-btn-primary" onClick={handleCopyCode}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button className="league-btn-ghost" onClick={handleRegenerateCode} disabled={saving}>
                New Code
              </button>
            </div>
          </div>
        </>
      )}

      {error && <p className="league-error">{error}</p>}
    </div>
  );
}
