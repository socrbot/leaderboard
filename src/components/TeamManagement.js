// src/components/TeamManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_BASE_URL, PLAYER_ODDS_API_ENDPOINT } from '../apiConfig';
import '../App.css'; // Importing the CSS file

// TeamManagement now receives tournamentOddsId, isDraftStarted, and hasManualDraftOdds as props,
// and onDraftStarted and onManualOddsUpdated callbacks
const TeamManagement = ({ tournamentId, onTournamentCreated, onTeamsSaved, tournamentOddsId, isDraftStarted, hasManualDraftOdds, onDraftStarted, onManualOddsUpdated }) => { // ADDED hasManualDraftOdds, onManualOddsUpdated
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);
  
  const [teams, setTeams] = useState([]);
  const [allPlayersWithOdds, setAllPlayersWithOdds] = useState([]);
  
  //const [availablePlayers, setAvailablePlayers] = useState([]);

  // States for player search within teams
  const [searchTerms, setSearchTerms] = useState({});

  // Loading/error states for available players (for player search functionality)
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState(null);

  // State for saving teams process
  const [isSaving, setIsSaving] = useState(false);
  // State for clearing manual odds
  const [isClearingManualOdds, setIsClearingManualOdds] = useState(false); // NEW: State for clearing manual odds

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

  // 1. Load existing teams for the selected tournament
  const loadTeams = useCallback(async () => {
    if (!tournamentId) {
      setTeams([]);
      return;
    }
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tournamentData = await response.json();
      setTeams(tournamentData.teams || []);
      setSearchTerms({});
    } catch (error) {
      console.error("Error loading teams or tournament details:", error);
      alert('Failed to load teams or tournament details for the selected tournament.');
      setTeams([]);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);


  // Fetch all players for the search functionality (depends on prop `tournamentOddsId`)
  // This list will correctly fetch from ManualDraftOdds if available and draft not started
  useEffect(() => {
    const fetchAllPlayersForSearch = async () => {
      if (!tournamentOddsId) {
        setPlayerLoading(false);
        setAllPlayersWithOdds([]);
        return;
      }

      setPlayerLoading(true);
      setPlayerError(null);
      try {
        // This endpoint will now correctly prioritize manual odds if they exist
        const response = await fetch(`${PLAYER_ODDS_API_ENDPOINT}?oddsId=${tournamentOddsId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawOddsData = await response.json();

        setAllPlayersWithOdds(rawOddsData);

      } catch (error) {
        console.error("Error fetching ALL player odds for search functionality:", error);
        setPlayerError(`Failed to load players for search. Please check tournament Odds ID (${tournamentOddsId}).`);
        setAllPlayersWithOdds([]);
      } finally {
        setPlayerLoading(false);
      }
    };
    fetchAllPlayersForSearch();
  }, [tournamentOddsId, hasManualDraftOdds]); // ADDED hasManualDraftOdds so player list refreshes if manual odds status changes


  // --- Event Handlers for Team/Player Management (mostly unchanged) ---

  const handleRemoveTeam = (teamIndex) => {
    const updatedTeams = teams.filter((_, index) => index !== teamIndex);
    setTeams(updatedTeams);
  };

  const handleSearchTermChange = (teamIndex, value) => {
    setSearchTerms(prev => ({
      ...prev,
      [teamIndex]: value
    }));
  };

  const handleAddPlayerToTeam = (teamIndex, playerToAdd) => {
    const updatedTeams = [...teams];
    const team = updatedTeams[teamIndex];

    // Check if player is already in this team
    if (team.golferNames.includes(playerToAdd)) {
        alert(`${playerToAdd} is already in ${team.name}!`);
        return;
    }

    // Check if player is already in any other team
    const existingTeam = updatedTeams.find((otherTeam, otherIndex) => 
      otherIndex !== teamIndex && otherTeam.golferNames.includes(playerToAdd)
    );
    if (existingTeam) {
        alert(`${playerToAdd} is already assigned to ${existingTeam.name}! Please remove them from that team first.`);
        return;
    }

    // Optional: Limit players per team
    // if (team.golferNames.length >= 4) {
    //     alert(`${team.name} already has 4 golfers.`);
    //     return;
    // }

    team.golferNames.push(playerToAdd);
    setTeams(updatedTeams);
    handleSearchTermChange(teamIndex, '');
  };

  const handleRemovePlayerFromTeam = (teamIndex, playerToRemove) => {
    const updatedTeams = [...teams];
    updatedTeams[teamIndex].golferNames = updatedTeams[teamIndex].golferNames.filter(
      (player) => player !== playerToRemove
    );
    setTeams(updatedTeams);
  };

  const handleDraftOrderChange = (teamIndex, newDraftOrder) => {
    const updatedTeams = [...teams];
    
    // Allow empty string or store the raw value while typing
    if (newDraftOrder === '') {
      updatedTeams[teamIndex].draftOrder = null;
      setTeams(updatedTeams);
      return;
    }
    
    const orderNum = parseInt(newDraftOrder);
    
    // Only validate if it's a complete valid number
    if (isNaN(orderNum) || orderNum < 1) {
      // For invalid input, just store null but don't alert during typing
      updatedTeams[teamIndex].draftOrder = null;
      setTeams(updatedTeams);
      return;
    }
    
    // Check if this draft order is already taken by another team
    const existingTeam = updatedTeams.find((team, index) => 
      index !== teamIndex && team.draftOrder === orderNum
    );
    if (existingTeam) {
      alert(`Draft order ${orderNum} is already assigned to ${existingTeam.name}!`);
      return;
    }
    
    updatedTeams[teamIndex].draftOrder = orderNum;
    setTeams(updatedTeams);
  };

  const handleAnnualParticipationChange = (teamIndex, participates) => {
    const updatedTeams = [...teams];
    updatedTeams[teamIndex].participatesInAnnual = participates;
    setTeams(updatedTeams);
  };

  const handleSaveTeams = async () => {
    if (!tournamentId) {
      alert("No tournament selected. Please select or create one to save teams.");
      return;
    }
    if (isSaving) return;
    setIsSaving(true);

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/teams`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teams: teams }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`HTTP error! status: ${response.status}. ${errorData.error || errorData.message}`);
      }

      alert('Teams saved successfully!');
      if (onTeamsSaved) {
        onTeamsSaved();
      }
    } catch (error) {
      console.error('Error saving teams:', error);
      alert(`Failed to save teams: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

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
              Draft is in progress. Assign golfers to teams.
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


      {/* Current Teams Section - Applying Flexbox Card Layout */}
      <h2 style={{ fontSize: isMobile ? '1.3em' : '1.5em', textAlign: 'center' }}>Current Teams</h2>
      {teams.length === 0 && (
        <p style={{ 
          textAlign: 'center', 
          fontSize: isMobile ? '1em' : '1.1em',
          padding: isMobile ? '10px' : '0'
        }}>
          No teams assigned to this tournament yet. Add one below!
        </p>
      )}

      {/* --- FLEXBOX CONTAINER FOR TEAM CARDS --- */}
      <div className="teams-flex-container">
        {[...teams]
          .sort((a, b) => {
            // Teams with draft order come first, sorted by draft order
            const orderA = a.draftOrder ?? 999;
            const orderB = b.draftOrder ?? 999;
            return orderA - orderB;
          })
          .map((team, sortedIndex) => {
          // Find the original index for searchTerms
          const teamIndex = teams.findIndex(t => t.name === team.name);
          const currentSearchTerm = searchTerms[teamIndex] || '';
          const filteredPlayersForThisTeam = allPlayersWithOdds.filter(player =>
            player.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) &&
            !team.golferNames.includes(player.name)
          ).map(p => p.name);

          return (
            <div
              key={team.name || `team-${teamIndex}`}
              className="team-card"
            >
              <div className="team-card-header">
                <h3 style={{ margin: '0', color: 'white' }}>
                  {team.name}
                </h3>
                <button
                  onClick={() => handleRemoveTeam(teamIndex)}
                  className="team-remove-btn"
                >
                  Remove Team
                </button>
              </div>

              <div className="team-card-options">
                <div className="team-card-option">
                  <label>Draft Order:</label>
                  <input
                    type="number"
                    min="1"
                    max={teams.length}
                    value={team.draftOrder || ''}
                    onChange={(e) => handleDraftOrderChange(teamIndex, e.target.value)}
                    placeholder="Order"
                    className="draft-order-input"
                  />
                </div>
                <div className="team-card-option">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={team.participatesInAnnual !== false}
                      onChange={(e) => handleAnnualParticipationChange(teamIndex, e.target.checked)}
                    />
                    Annual Championship Participant
                  </label>
                </div>
              </div>

              <div className="team-card-golfers">
                Golfers:
              </div>

              <ul className="team-golfer-list">
                {team.golferNames.length === 0 && <li style={{ padding: '8px 15px', fontStyle: 'italic', color: '#ccc', backgroundColor: '#4A4A4A' }}>No golfers assigned yet.</li>}
                {team.golferNames.map((golfer, playerIndex) => (
                  <li
                    key={golfer}
                  >
                    {golfer}
                    <button onClick={() => handleRemovePlayerFromTeam(teamIndex, golfer)} className="team-golfer-remove-btn">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>

              <div className="team-card-search">
                {draftStatus.IsDraftStarted ? (
                  <>
                    <input
                      type="text"
                      placeholder="Search players to add"
                      value={currentSearchTerm}
                      onChange={(e) => handleSearchTermChange(teamIndex, e.target.value)}
                      className="team-search-input"
                    />
                    {playerLoading ? (
                      <p style={{ margin: '10px 0 0 0', color: '#ccc' }}>Loading potential players...</p>
                    ) : playerError ? (
                      <p style={{ color: '#ff9800', margin: '10px 0 0 0', fontSize: '0.85em' }}>Player search unavailable — odds data not loaded.</p>
                    ) : (
                      currentSearchTerm && filteredPlayersForThisTeam.length > 0 && (
                        <ul className="team-search-list">
                          {filteredPlayersForThisTeam.map((player) => (
                            <li
                              key={player}
                              onClick={() => handleAddPlayerToTeam(teamIndex, player)}
                            >
                              {player}
                            </li>
                          ))}
                        </ul>
                      )
                    )}
                    {currentSearchTerm && filteredPlayersForThisTeam.length === 0 && !playerLoading && !playerError && (
                      <p style={{ marginTop: '10px', color: '#ccc' }}>No players found matching "{currentSearchTerm}"</p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.85em' }}>Player search available after draft starts</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={handleSaveTeams} disabled={isSaving} className="save-teams-btn">
        {isSaving ? 'Saving...' : 'Save All Teams'}
      </button>

    </div>
  );
};

export default TeamManagement;