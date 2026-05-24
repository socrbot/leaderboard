// src/components/UserSettings.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_BASE_URL, LEAGUES_API_ENDPOINT } from '../apiConfig';
import '../App.css';
import './UserSettings.css';

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
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(false);

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

  if (loading) {
    return (
      <div className="user-settings-shell">
        <div className="user-settings-panel">
          <p className="user-settings-loading">Loading your settings...</p>
        </div>
      </div>
    );
  }

  const activeLeagueEntry = userProfile?.leagues?.find(l => l.leagueId === activeLeagueId);
  const displayName = userProfile?.displayName || user?.displayName || 'Member';
  const profileEmail = userProfile?.email || user?.email || '—';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'M';

  return (
    <div className="user-settings-shell">
      <div className="user-settings-stack">
        <header className="user-settings-header-block">
          <h2 className="user-settings-title">My Profile{leagueName ? ` - ${leagueName}` : ''}</h2>
          <p className="user-settings-subtitle">Manage your profile, leagues, and season preferences.</p>
        </header>

        <section className="user-settings-panel user-settings-profile-panel">
          <div className="user-settings-glow" aria-hidden="true" />
          <div className="user-settings-profile-row">
            <div className="user-settings-avatar" aria-hidden="true">{initials}</div>
            <div className="user-settings-profile-copy">
              <h3 className="user-settings-name">{displayName}</h3>
              <p className="user-settings-email">{profileEmail}</p>
              <p className="user-settings-team-pill">
                {activeLeagueEntry?.teamName || 'No team name set'}
              </p>
            </div>
          </div>
        </section>

        <section className="user-settings-panel">
          <h3 className="user-settings-section-label">League Participation</h3>

          <div className="user-settings-league-grid">
            {userProfile?.leagues?.length > 0 ? userProfile.leagues.map(l => (
              <article key={l.leagueId} className="user-settings-league-card">
                <div className="user-settings-league-head">
                  <h4 className="user-settings-league-name">{l.name || l.leagueId}</h4>
                  {l.leagueId === activeLeagueId && <span className="user-settings-active-badge">Active</span>}
                </div>
                <p className="user-settings-league-meta">{l.teamName ? `Team: ${l.teamName}` : 'No team name selected'}</p>
              </article>
            )) : (
              <p className="user-settings-hint">No leagues yet. Join with an invite code below.</p>
            )}
          </div>

          <label className="user-settings-toggle-row" htmlFor="annual-opt-in">
            <span>Include me in annual championship standings</span>
            <span className="user-settings-toggle-wrap">
              <input
                id="annual-opt-in"
                className="user-settings-toggle-input"
                type="checkbox"
                checked={participatesInAnnual}
                onChange={e => { setParticipatesInAnnual(e.target.checked); setSaved(false); }}
              />
              <span className="user-settings-toggle-track" />
            </span>
          </label>

          {joinSuccess && <p className="user-settings-success-text">{joinSuccess}</p>}

          <div className="user-settings-join-block">
            {showJoinForm ? (
              <form onSubmit={handleJoin} className="user-settings-join-form">
                <input
                  type="text"
                  placeholder="Team name (optional)"
                  value={joinTeamName}
                  onChange={e => setJoinTeamName(e.target.value)}
                  maxLength={40}
                  disabled={joining}
                  className="user-settings-input"
                />
                <input
                  type="text"
                  placeholder="Enter league code"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  disabled={joining}
                  className="user-settings-input"
                  autoCapitalize="characters"
                  autoComplete="off"
                />
                {joinError && <p className="user-settings-error-text">{joinError}</p>}
                <div className="user-settings-join-actions">
                  <button type="submit" disabled={joining} className="user-settings-btn user-settings-btn-primary">
                    {joining ? 'Joining...' : 'Join League'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowJoinForm(false); setJoinError(''); }}
                    className="user-settings-btn user-settings-btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => { setShowJoinForm(true); setJoinSuccess(''); }}
                className="user-settings-btn user-settings-btn-secondary"
              >
                + Join a New League
              </button>
            )}
          </div>
        </section>

        <section className="user-settings-panel">
          <h3 className="user-settings-section-label">Notification Settings</h3>
          <label className="user-settings-toggle-row" htmlFor="push-toggle">
            <span>Push notifications</span>
            <span className="user-settings-toggle-wrap">
              <input
                id="push-toggle"
                className="user-settings-toggle-input"
                type="checkbox"
                checked={pushNotificationsEnabled}
                onChange={e => setPushNotificationsEnabled(e.target.checked)}
              />
              <span className="user-settings-toggle-track" />
            </span>
          </label>
          <label className="user-settings-toggle-row" htmlFor="email-toggle">
            <span>Email updates</span>
            <span className="user-settings-toggle-wrap">
              <input
                id="email-toggle"
                className="user-settings-toggle-input"
                type="checkbox"
                checked={emailUpdatesEnabled}
                onChange={e => setEmailUpdatesEnabled(e.target.checked)}
              />
              <span className="user-settings-toggle-track" />
            </span>
          </label>
        </section>

        <section className="user-settings-panel user-settings-actions-panel">
          <h3 className="user-settings-section-label">Security and Account</h3>
          {onSignOut && (
            <button onClick={onSignOut} className="user-settings-btn user-settings-btn-danger">
              Sign Out
            </button>
          )}
        </section>

        {error && <p className="user-settings-error-text">{error}</p>}

        <div className="user-settings-save-row">
          <button onClick={handleSave} disabled={saving} className="user-settings-btn user-settings-btn-primary">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="user-settings-saved">Saved</span>}
        </div>
      </div>
    </div>
  );
}
