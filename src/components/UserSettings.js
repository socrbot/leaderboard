// src/components/UserSettings.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_BASE_URL, LEAGUES_API_ENDPOINT } from '../apiConfig';
import '../App.css';
import './UserSettings.css';

export default function UserSettings({ activeLeagueId, onSignOut }) {
  const { user, getIdToken } = useAuth();

  const [leagueName, setLeagueName] = useState('');
  const [leagueAnnualSettings, setLeagueAnnualSettings] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(false);
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const authHeaders = { Authorization: `Bearer ${token}` };

      const [settingsRes, profileRes] = await Promise.all([
        fetch(`${BACKEND_BASE_URL}/user/settings`, { headers: authHeaders }),
        fetch(`${BACKEND_BASE_URL}/user/profile`, { headers: authHeaders }),
      ]);

      let settingsData = null;
      if (settingsRes.ok) {
        settingsData = await settingsRes.json();
      }

      let profileData = null;
      if (profileRes && profileRes.ok) {
        profileData = await profileRes.json();
        setUserProfile(profileData);
      }

      const settingsMap = (settingsData && settingsData.leagueAnnualPreferences && typeof settingsData.leagueAnnualPreferences === 'object')
        ? settingsData.leagueAnnualPreferences
        : {};

      const leagues = profileData?.leagues || [];
      const fallbackAnnual = settingsData?.participatesInAnnual !== false;
      const normalizedMap = {};
      leagues.forEach((league) => {
        const lid = league?.leagueId;
        if (!lid) return;
        if (Object.prototype.hasOwnProperty.call(settingsMap, lid)) {
          normalizedMap[lid] = settingsMap[lid] !== false;
        } else if (typeof league?.participatesInAnnual !== 'undefined') {
          normalizedMap[lid] = league.participatesInAnnual !== false;
        } else {
          normalizedMap[lid] = fallbackAnnual;
        }
      });
      setLeagueAnnualSettings(normalizedMap);

      const incomingTeamName = (profileData?.teamName || settingsData?.teamName || '').trim();
      if (incomingTeamName) {
        setTeamNameInput(incomingTeamName);
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
        body: JSON.stringify({ inviteCode: code, teamName: (user?.displayName || '') }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || 'Invalid invite code.');
      } else {
        setJoinSuccess(data.alreadyMember ? 'Already a member of that league.' : 'Joined successfully!');
        setJoinCode('');
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
      const payload = { leagueAnnualPreferences: leagueAnnualSettings };
      const normalizedTeamName = teamNameInput.trim();
      if (normalizedTeamName) {
        payload.teamName = normalizedTeamName;
      }

      const res = await fetch(`${BACKEND_BASE_URL}/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to save.');
      } else {
        if (normalizedTeamName) {
          setUserProfile(prev => prev ? ({ ...prev, teamName: normalizedTeamName }) : prev);
        }
        setIsEditingTeamName(false);
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
  const globalTeamName = userProfile?.teamName || activeLeagueEntry?.teamName || 'No team name set';
  const shownTeamName = teamNameInput.trim() || globalTeamName;
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
              {isEditingTeamName ? (
                <div className="user-settings-team-edit-wrap">
                  <input
                    type="text"
                    className="user-settings-team-input"
                    value={teamNameInput}
                    onChange={(e) => { setTeamNameInput(e.target.value); setSaved(false); }}
                    maxLength={40}
                    placeholder="Team name"
                  />
                  <button
                    type="button"
                    className="user-settings-team-edit-btn"
                    onClick={handleSave}
                    disabled={saving || !teamNameInput.trim()}
                    aria-label="Save team name"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="user-settings-team-edit-btn"
                    onClick={() => { setIsEditingTeamName(false); setTeamNameInput(userProfile?.teamName || ''); }}
                    aria-label="Cancel team name edit"
                  >
                    x
                  </button>
                </div>
              ) : (
                <div className="user-settings-team-pill-row">
                  <p className="user-settings-team-pill">{shownTeamName}</p>
                  <button
                    type="button"
                    className="user-settings-team-edit-btn"
                    onClick={() => setIsEditingTeamName(true)}
                    aria-label="Edit team name"
                  >
                    ✎
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="user-settings-panel">
          <h3 className="user-settings-section-label">League Participation</h3>

          <div className="user-settings-league-grid">
            {userProfile?.leagues?.length > 0 ? userProfile.leagues.map(l => (
              <article key={l.leagueId} className="user-settings-league-card">
                <div className="user-settings-league-head">
                  <div>
                    <h4 className="user-settings-league-name">{l.name || l.leagueId}</h4>
                    <p className="user-settings-league-sub">Annual Championship Participant</p>
                  </div>
                  <span className="user-settings-toggle-wrap user-settings-toggle-wrap-compact">
                    <input
                      id={`annual-opt-in-${l.leagueId}`}
                      className="user-settings-toggle-input"
                      type="checkbox"
                      checked={leagueAnnualSettings[l.leagueId] !== false}
                      onChange={e => {
                        const checked = e.target.checked;
                        setLeagueAnnualSettings(prev => ({ ...prev, [l.leagueId]: checked }));
                        setSaved(false);
                      }}
                    />
                    <span className="user-settings-toggle-track" />
                  </span>
                </div>
                <div className="user-settings-league-meta-row">
                  <p className="user-settings-league-meta">{l.teamName ? `Team: ${l.teamName}` : 'No team name selected'}</p>
                  {l.leagueId === activeLeagueId && <span className="user-settings-active-badge">Active</span>}
                </div>
              </article>
            )) : (
              <p className="user-settings-hint">No leagues yet. Join with an invite code below.</p>
            )}
          </div>

          {joinSuccess && <p className="user-settings-success-text">{joinSuccess}</p>}

          <div className="user-settings-join-block">
            <form onSubmit={handleJoin} className="user-settings-join-form user-settings-join-form-inline">
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
              <button
                type="submit"
                disabled={joining}
                className="user-settings-btn user-settings-btn-primary user-settings-join-submit"
              >
                {joining ? 'Joining...' : 'Join'}
              </button>
            </form>
            {joinError && <p className="user-settings-error-text">{joinError}</p>}
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
