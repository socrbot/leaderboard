// src/components/TeamManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';
import { useAuth } from '../contexts/AuthContext';
import '../App.css'; // Importing the CSS file

const TeamManagement = ({ tournamentId, leagueId, onTournamentCreated, onTeamsSaved, tournamentOddsId, isDraftStarted, hasManualDraftOdds, onDraftStarted, onManualOddsUpdated }) => {
  const { getIdToken } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [teams, setTeams] = useState([]);
  const [isClearingManualOdds, setIsClearingManualOdds] = useState(false);
  const [lockedOdds, setLockedOdds] = useState([]);
  // Per-team "add golfer" state: { [ownerUid]: searchText }
  const [addSearch, setAddSearch] = useState({});
  const [editLoading, setEditLoading] = useState({});

  // --- Draft Status State ---
  const [draftStatus, setDraftStatus] = useState({
    IsDraftStarted: false,
    IsDraftLocked: false,
    IsDraftComplete: false
  });
  const [isDraftActionLoading, setIsDraftActionLoading] = useState(false);

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load enrolled teams: use league members when draft is not yet locked,
  // fall back to tournament's stored teams (with draft order + picks) once locked.
  const loadTeams = useCallback(async () => {
    if (!tournamentId) {
      setTeams([]);
      return;
    }
    try {
      // Fetch tournament doc to check lock status and grab post-lock teams
      const tRes = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}`);
      if (!tRes.ok) throw new Error(`HTTP error! status: ${tRes.status}`);
      const tournamentData = await tRes.json();
      const isLocked = !!(tournamentData.DraftLockedOdds && tournamentData.DraftLockedOdds.length > 0);
      setLockedOdds(tournamentData.DraftLockedOdds || []);

      if (!isLocked && leagueId) {
        // Pre-lock: show current league members
        const token = await getIdToken();
        const mRes = await fetch(`${BACKEND_BASE_URL}/leagues/${leagueId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mRes.ok) throw new Error(`Failed to fetch league members: ${mRes.status}`);
        const members = await mRes.json();
        setTeams(members.map(m => ({
          name: m.displayName || m.email,
          ownerUid: m.uid,
          ownerEmail: m.email,
          golferNames: [],
          draftOrder: null,
        })));
      } else {
        // Post-lock: use tournament teams which have draft order + picks
        setTeams(tournamentData.teams || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      setTeams([]);
    }
  }, [tournamentId, leagueId, getIdToken]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // --- Fetch Draft Status ---
  const fetchDraftStatus = useCallback(async () => {
    if (!tournamentId) {
      setDraftStatus({ IsDraftStarted: false, IsDraftLocked: false, IsDraftComplete: false });
      return;
    }
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/draft_status`);
      if (!response.ok) throw new Error('Failed to fetch draft status');
      const status = await response.json();
      setDraftStatus(status);
    } catch (error) {
      setDraftStatus({ IsDraftStarted: false, IsDraftLocked: false, IsDraftComplete: false });
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchDraftStatus();
  }, [fetchDraftStatus, tournamentId]);

  // --- Unified Draft Action Handler ---
  const handleDraftAction = async () => {
    if (!tournamentId) return;
    setIsDraftActionLoading(true);
    let endpoint = '';
    let confirmMsg = '';
    let successMsg = '';
    if (!draftStatus.IsDraftLocked) {
      endpoint = `/tournaments/${tournamentId}/lock_draft_odds`;
      confirmMsg = 'Are you sure you want to lock the draft odds? This will snapshot the current odds for the draft tiers.';
      successMsg = 'Draft odds locked! Tiers are now visible on the leaderboard.';
    } else if (!draftStatus.IsDraftStarted) {
      endpoint = `/tournaments/${tournamentId}/start_draft_flag`;
      confirmMsg = 'Are you sure you want to start the draft? Make sure draft order is set for all teams.';
      successMsg = 'Draft started! Draft order is now visible.';
    } else if (!draftStatus.IsDraftComplete) {
      endpoint = `/tournaments/${tournamentId}/complete_draft`;
      confirmMsg = 'Are you sure you want to complete the draft?';
      successMsg = 'Draft marked complete!';
    } else {
      setIsDraftActionLoading(false);
      return;
    }
    if (!window.confirm(confirmMsg)) {
      setIsDraftActionLoading(false);
      return;
    }
    try {
      const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Draft action failed');
      alert(successMsg);
      fetchDraftStatus();
      if (onDraftStarted) onDraftStarted();
    } catch (error) {
      alert(`Draft action failed: ${error.message}`);
    } finally {
      setIsDraftActionLoading(false);
    }
  };

  // --- Clear Manual Odds Handler ---
  const handleClearManualOdds = async () => {
    if (!tournamentId) return;
    setIsClearingManualOdds(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/clear_manual_odds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to clear manual odds');
      alert('Manual odds cleared! Now using live odds.');
      if (onManualOddsUpdated) onManualOddsUpdated();
    } catch (error) {
      alert(`Failed to clear manual odds: ${error.message}`);
    } finally {
      setIsClearingManualOdds(false);
    }
  };

  // --- Admin: remove a golfer from a team ---
  const handleAdminRemove = async (ownerUid, playerName) => {
    if (!window.confirm(`Remove ${playerName} from this team?`)) return;
    const key = `${ownerUid}-remove-${playerName}`;
    setEditLoading(prev => ({ ...prev, [key]: true }));
    try {
      const token = await getIdToken();
      const res = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/admin_edit_pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'remove', ownerUid, playerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove golfer');
      await loadTeams();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setEditLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // --- Admin: add a golfer to a team ---
  const handleAdminAdd = async (ownerUid) => {
    const playerName = (addSearch[ownerUid] || '').trim();
    if (!playerName) return;
    const key = `${ownerUid}-add`;
    setEditLoading(prev => ({ ...prev, [key]: true }));
    try {
      const token = await getIdToken();
      const res = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/admin_edit_pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'add', ownerUid, playerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add golfer');
      setAddSearch(prev => ({ ...prev, [ownerUid]: '' }));
      await loadTeams();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setEditLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="team-management-container">
      <h1 style={{ fontSize: isMobile ? '1.5em' : '2em', textAlign: 'center' }}>Draft Management</h1>

      {/* Draft Actions Section */}
      <div className="draft-actions-card">
        <h2 style={{marginTop: '0', marginBottom: '20px'}}>Draft Actions</h2>

        {/* Manual Odds Status and Clear Button */}
        <div style={{marginBottom: '15px'}}>
          {hasManualDraftOdds ? (
            <p style={{ color: '#FFD700', marginBottom: '10px' }}>
              Manual Draft Odds are currently ACTIVE.
            </p>
          ) : (
            <p style={{ color: '#ADD8E6', marginBottom: '10px' }}>
              Using live odds feed.
            </p>
          )}
          {hasManualDraftOdds && !draftStatus.IsDraftLocked && (
            <button
              onClick={handleClearManualOdds}
              disabled={isClearingManualOdds || !tournamentId}
              className="draft-clear-btn"
            >
              {isClearingManualOdds ? 'Clearing...' : 'Clear Manual Odds'}
            </button>
          )}
          {draftStatus.IsDraftLocked && !draftStatus.IsDraftStarted && (
            <p style={{ color: '#90EE90', marginTop: '10px' }}>
              Odds locked! Set draft order for all teams below, then start the draft.
            </p>
          )}
          {draftStatus.IsDraftStarted && (
            <p style={{ color: '#90EE90', marginTop: '10px' }}>
              Draft is in progress. Members are making their picks.
            </p>
          )}
        </div>

        {/* Unified Draft Action Button */}
        {!draftStatus.IsDraftComplete && (
          <button
            onClick={handleDraftAction}
            disabled={isDraftActionLoading || !tournamentId}
            className="draft-action-btn"
          >
            {isDraftActionLoading
              ? 'Processing...'
              : !draftStatus.IsDraftLocked
                ? 'Lock Draft Odds'
                : !draftStatus.IsDraftStarted
                  ? 'Start Draft'
                  : 'Complete Draft'}
          </button>
        )}
        {draftStatus.IsDraftComplete && (
          <p style={{ color: '#32CD32', marginTop: '10px' }}>
            Draft is complete!
          </p>
        )}
      </div>


      {/* Enrolled Teams — read-only during/after draft lock */}
      <h2 style={{ fontSize: isMobile ? '1.3em' : '1.5em', textAlign: 'center' }}>Enrolled Teams</h2>
      {teams.length === 0 ? (
        <p style={{
          textAlign: 'center',
          fontSize: isMobile ? '1em' : '1.1em',
          padding: isMobile ? '10px' : '0',
          color: '#aaa'
        }}>
          No teams yet. Teams are created from enrolled league members when you lock draft odds.
        </p>
      ) : (
        <div className="teams-flex-container">
          {[...teams]
            .sort((a, b) => (a.draftOrder ?? 999) - (b.draftOrder ?? 999))
            .map((team) => {
              const filledPicks = (team.golferNames || []).filter(Boolean);
              const canAdd = draftStatus.IsDraftLocked && filledPicks.length < 4 && lockedOdds.length > 0;
              const searchText = addSearch[team.ownerUid] || '';
              const suggestions = searchText.length >= 2
                ? lockedOdds
                    .map(p => p.name)
                    .filter(n => n && n.toLowerCase().includes(searchText.toLowerCase()) && !filledPicks.includes(n))
                    .slice(0, 8)
                : [];
              return (
                <div key={team.ownerUid || team.name} className="team-card">
                  <div className="team-card-header">
                    <h3 style={{ margin: '0', color: 'white' }}>
                      {draftStatus.IsDraftStarted ? `${team.draftOrder}. ` : ''}{team.name}
                    </h3>
                    <span style={{ fontSize: '0.8em', color: '#aaa' }}>
                      {filledPicks.length} / 4 picks
                    </span>
                  </div>

                  <ul className="team-golfer-list">
                    {filledPicks.length === 0 && (
                      <li style={{ padding: '8px 15px', fontStyle: 'italic', color: '#ccc', backgroundColor: '#4A4A4A' }}>
                        No golfers picked yet.
                      </li>
                    )}
                    {(team.golferNames || []).filter(Boolean).map((golfer) => (
                      <li key={golfer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{golfer}</span>
                        {draftStatus.IsDraftLocked && (
                          <button
                            onClick={() => handleAdminRemove(team.ownerUid, golfer)}
                            disabled={!!editLoading[`${team.ownerUid}-remove-${golfer}`]}
                            style={{
                              background: 'none', border: 'none', color: '#e57373',
                              cursor: 'pointer', fontSize: '1rem', padding: '0 4px', lineHeight: 1,
                            }}
                            title="Remove golfer"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Admin add golfer */}
                  {canAdd && (
                    <div style={{ padding: '8px 12px', borderTop: '1px solid #555', position: 'relative' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Search golfer…"
                          value={searchText}
                          onChange={e => setAddSearch(prev => ({ ...prev, [team.ownerUid]: e.target.value }))}
                          style={{
                            flex: 1, padding: '5px 8px', borderRadius: '4px',
                            border: '1px solid #555', background: '#2a2a2a', color: '#fff', fontSize: '0.85rem'
                          }}
                        />
                        <button
                          onClick={() => handleAdminAdd(team.ownerUid)}
                          disabled={!searchText.trim() || !!editLoading[`${team.ownerUid}-add`]}
                          style={{
                            padding: '5px 12px', borderRadius: '4px', border: 'none',
                            background: '#2d6a2d', color: '#fff', cursor: 'pointer', fontSize: '0.85rem'
                          }}
                        >
                          {editLoading[`${team.ownerUid}-add`] ? '…' : 'Add'}
                        </button>
                      </div>
                      {suggestions.length > 0 && (
                        <ul style={{
                          position: 'absolute', left: '12px', right: '12px', top: '100%',
                          background: '#333', border: '1px solid #555', borderRadius: '4px',
                          margin: 0, padding: 0, listStyle: 'none', zIndex: 100, maxHeight: '180px', overflowY: 'auto'
                        }}>
                          {suggestions.map(name => (
                            <li
                              key={name}
                              onClick={() => {
                                setAddSearch(prev => ({ ...prev, [team.ownerUid]: name }));
                              }}
                              style={{
                                padding: '7px 12px', cursor: 'pointer', fontSize: '0.85rem',
                                color: '#eee', borderBottom: '1px solid #444'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#444'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}
                            >
                              {name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

    </div>
  );
};

export default TeamManagement;