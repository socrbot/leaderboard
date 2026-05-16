// src/components/LeagueManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LEAGUE_API_ENDPOINT } from '../apiConfig';

export default function LeagueManagement() {
  const { getIdToken } = useAuth();

  const [league, setLeague] = useState(null);       // null = not fetched yet
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [initName, setInitName] = useState('The Sunday Club');

  const authHeaders = useCallback(async () => {
    const token = await getIdToken();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }, [getIdToken]);

  const fetchLeague = useCallback(async () => {
    try {
      const res = await fetch(LEAGUE_API_ENDPOINT);
      const data = await res.json();
      setLeague(data.exists ? data : null);
    } catch (e) {
      setError('Failed to load league info.');
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${LEAGUE_API_ENDPOINT}/members`, { headers });
      if (!res.ok) return;
      setMembers(await res.json());
    } catch {
      // non-fatal
    }
  }, [authHeaders]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchLeague();
      await fetchMembers();
      setLoading(false);
    })();
  }, [fetchLeague, fetchMembers]);

  const handleInit = async () => {
    setSaving(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${LEAGUE_API_ENDPOINT}/init`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: initName.trim() || 'The Sunday Club' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialise league');
      setLeague({ exists: true, ...data });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(LEAGUE_API_ENDPOINT, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update name');
      setLeague(prev => ({ ...prev, name: data.name }));
      setEditingName(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!window.confirm('Generate a new invite code? The old code will stop working immediately.')) return;
    setSaving(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${LEAGUE_API_ENDPOINT}/regenerate_code`, { method: 'POST', headers });
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

  const handleRemoveMember = async (uid, email) => {
    if (!window.confirm(`Remove ${email || uid} from the league?`)) return;
    setSaving(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${LEAGUE_API_ENDPOINT}/members/${uid}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');
      setMembers(prev => prev.filter(m => m.uid !== uid));
      setLeague(prev => ({ ...prev, memberCount: Math.max(0, (prev.memberCount || 1) - 1) }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="league-loading">Loading league info…</div>;
  }

  // League not initialised yet — show setup prompt
  if (!league) {
    return (
      <div className="league-setup-prompt">
        <h3 className="league-section-title">Initialise Your League</h3>
        <p className="league-hint">
          Set up your league to get a shareable invite code. Members can use the
          code to join and see their team's position on the leaderboard.
        </p>
        {error && <p className="league-error">{error}</p>}
        <div className="league-init-row">
          <input
            className="league-name-input"
            type="text"
            value={initName}
            onChange={e => setInitName(e.target.value)}
            placeholder="League name"
            maxLength={80}
          />
          <button className="league-btn-primary" onClick={handleInit} disabled={saving}>
            {saving ? 'Creating…' : 'Create League'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="league-management">
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
            <button
              className="league-btn-ghost"
              onClick={() => { setNameInput(league.name); setEditingName(true); }}
            >
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

      {/* Members */}
      <div className="league-section">
        <h3 className="league-section-title">Members</h3>
        {members.length === 0 ? (
          <p className="league-hint">No members have joined yet. Share the invite code above.</p>
        ) : (
          <ul className="league-member-list">
            {members.map(m => (
              <li key={m.uid} className="league-member-row">
                <span className="league-member-name">{m.displayName || m.email || m.uid}</span>
                {m.email && m.displayName && (
                  <span className="league-member-email">{m.email}</span>
                )}
                <button
                  className="league-btn-danger-sm"
                  onClick={() => handleRemoveMember(m.uid, m.email || m.displayName)}
                  disabled={saving}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="league-error">{error}</p>}
    </div>
  );
}
