// src/components/TeamManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';
import '../App.css'; // Importing the CSS file

const TeamManagement = ({ tournamentId, onTournamentCreated, onTeamsSaved, tournamentOddsId, isDraftStarted, hasManualDraftOdds, onDraftStarted, onManualOddsUpdated }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [teams, setTeams] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingManualOdds, setIsClearingManualOdds] = useState(false);

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

  // Load existing teams for the selected tournament
  const loadTeams = useCallback(async () => {
    if (!tournamentId) {
      setTeams([]);
      return;
    }
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const tournamentData = await response.json();
      setTeams(tournamentData.teams || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      setTeams([]);
    }
  }, [tournamentId]);

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
              Using Live SportsData.io Odds.
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
            .map((team) => (
              <div key={team.ownerUid || team.name} className="team-card">
                <div className="team-card-header">
                  <h3 style={{ margin: '0', color: 'white' }}>
                    {draftStatus.IsDraftStarted ? `${team.draftOrder}. ` : ''}{team.name}
                  </h3>
                  <span style={{ fontSize: '0.8em', color: '#aaa' }}>
                    {(team.golferNames || []).length} / 4 picks
                  </span>
                </div>

                <ul className="team-golfer-list">
                  {(team.golferNames || []).length === 0 && (
                    <li style={{ padding: '8px 15px', fontStyle: 'italic', color: '#ccc', backgroundColor: '#4A4A4A' }}>
                      No golfers picked yet.
                    </li>
                  )}
                  {(team.golferNames || []).map((golfer) => (
                    <li key={golfer}>{golfer}</li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}

    </div>
  );
};

export default TeamManagement;