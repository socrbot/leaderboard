// src/components/TeamManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_BASE_URL, PLAYER_ODDS_API_ENDPOINT } from '../apiConfig';
import '../App.css'; // Importing the CSS file

// TeamManagement now receives tournamentOddsId, isDraftStarted, and hasManualDraftOdds as props,
// and onDraftStarted and onManualOddsUpdated callbacks
const TeamManagement = ({ tournamentId, onTournamentCreated, onTeamsSaved, tournamentOddsId, isDraftStarted, hasManualDraftOdds, onDraftStarted, onManualOddsUpdated }) => { // ADDED hasManualDraftOdds, onManualOddsUpdated
  const [teams, setTeams] = useState([]);
  const [allPlayersWithOdds, setAllPlayersWithOdds] = useState([]);
  
  //const [availablePlayers, setAvailablePlayers] = useState([]);

  // States for creating a new tournament
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newOrgId, setNewOrgId] = useState('');
  const [newTournId, setNewTournId] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newOddsId, setNewOddsId] = useState('');

  // States for adding a new team
  const [newTeamName, setNewTeamName] = useState('');

  // States for player search within teams
  const [searchTerms, setSearchTerms] = useState({});

  // Loading/error states for available players (for player search functionality)
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState(null);

  // State for saving teams process
  const [isSaving, setIsSaving] = useState(false);
  // State for starting draft process
  const [isStartingDraft, setIsStartingDraft] = useState(false);

  // State for clearing manual odds
  const [isClearingManualOdds, setIsClearingManualOdds] = useState(false); // NEW: State for clearing manual odds

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

  const handleAddTeam = () => {
    if (newTeamName.trim() === '') return;
    if (teams.some(team => team.name.toLowerCase() === newTeamName.trim().toLowerCase())) {
        alert("A team with this name already exists!");
        return;
    }
    setTeams([...teams, { name: newTeamName.trim(), golferNames: [] }]);
    setNewTeamName('');
  };

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

    if (team.golferNames.includes(playerToAdd)) {
        alert(`${playerToAdd} is already in ${team.name}!`);
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

  const handleCreateTournament = async () => {
    if (newTournamentName.trim() === '') {
      alert("Please enter a name for the new tournament.");
      return;
    }
    if (newOrgId.trim() === '' || newTournId.trim() === '' || newYear.trim() === '' || newOddsId.trim() === '') {
        alert("Please enter values for Tournament Name, Org ID, Tourn ID, Year, or Odds ID.");
        return;
    }

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTournamentName.trim(),
          orgId: newOrgId.trim(),
          tournId: newTournId.trim(),
          year: newYear.trim(),
          oddsId: newOddsId.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`HTTP error! status: ${response.status}. ${errorData.error || errorData.message}`);
      }

      const newTourn = await response.json();
      alert(`New tournament "${newTourn.name}" created with ID: ${newTourn.id}`);
      setNewTournamentName('');
      setNewOrgId('');
      setNewTournId('');
      setNewYear('');
      setNewOddsId('');

      if (onTournamentCreated) {
        onTournamentCreated();
      }

    } catch (error) {
      console.error("Error creating new tournament:", error);
      alert(`Failed to create new tournament: ${error.message}`);
    }
  };

  // handleStartDraft function (unchanged)
  const handleStartDraft = async () => {
    if (!tournamentId) {
      alert("No tournament selected. Please select one to start the draft.");
      return;
    }
    if (isStartingDraft) return; // Prevent double click
    if (isDraftStarted) {
      alert("Draft has already been started for this tournament.");
      return;
    }

    if (!window.confirm("Are you sure you want to start the draft? This will lock in the current odds and cannot be undone.")) {
      return; // User cancelled
    }

    setIsStartingDraft(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/start_draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`HTTP error! status: ${response.status}. ${errorData.error || errorData.message}`);
      }

      alert('Draft started successfully! Odds are now locked in.');
      if (onDraftStarted) { // Trigger App.js to re-fetch tournament data
        onDraftStarted();
      }
    } catch (error) {
      console.error('Error starting draft:', error);
      alert(`Failed to start draft: ${error.message}`);
    } finally {
      setIsStartingDraft(false);
    }
  };

  // NEW: handleClearManualOdds function
  const handleClearManualOdds = async () => {
    if (!tournamentId) {
      alert("No tournament selected.");
      return;
    }
    if (isClearingManualOdds) return;
    if (isDraftStarted) {
      alert("Cannot clear manual odds: Draft has already started.");
      return;
    }

    if (!window.confirm("Are you sure you want to clear manual odds? This will revert to using live SportsData.io odds.")) {
      return; // User cancelled
    }

    setIsClearingManualOdds(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/clear_manual_odds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`HTTP error! status: ${response.status}. ${errorData.error || errorData.message}`);
      }

      alert('Manual odds cleared successfully! The Draft Board will now use live SportsData.io odds.');
      if (onManualOddsUpdated) { // Trigger App.js to re-fetch tournament data and player odds for DraftBoard
        onManualOddsUpdated();
      }
    } catch (error) {
      console.error('Error clearing manual odds:', error);
      alert(`Failed to clear manual odds: ${error.message}`);
    } finally {
      setIsClearingManualOdds(false);
    }
  };


  return (
    <div className="team-management-container">
      <h1>Manage Teams</h1>

      {/* Create New Tournament UI - Applying Card and Grid Layout */}
      <div className="tournament-form-card">
        <h2 style={{marginTop: '0', marginBottom: '20px'}}>Create New Tournament</h2>
        <div className="tournament-form-grid">
            <div style={{width: '100%'}}>
                <input
                    type="text"
                    placeholder="Tournament Name"
                    value={newTournamentName}
                    onChange={(e) => setNewTournamentName(e.target.value)}
                    className="tournament-input"
                />
            </div>
            <div style={{width: '100%'}}>
                <input
                    type="text"
                    placeholder="Leaderboard Org ID"
                    value={newOrgId}
                    onChange={(e) => setNewOrgId(e.target.value)}
                    className="tournament-input"
                />
            </div>
            <div style={{width: '100%'}}>
                <input
                    type="text"
                    placeholder="Leaderboard Tourn ID"
                    value={newTournId}
                    onChange={(e) => setNewTournId(e.target.value)}
                    className="tournament-input"
                />
            </div>
            <div style={{width: '100%'}}>
                <input
                    type="text"
                    placeholder="Leaderboard Year"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="tournament-input"
                />
            </div>
            <div style={{width: '100%'}}>
                <input
                    type="text"
                    placeholder="Odds API Tournament ID"
                    value={newOddsId}
                    onChange={(e) => setNewOddsId(e.target.value)}
                    className="tournament-input"
                />
            </div>
        </div>
        <button onClick={handleCreateTournament} className="tournament-form-btn">
          Create Tournament
        </button>
      </div>

      {/* NEW: Draft Actions Section */}
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
          {hasManualDraftOdds && !isDraftStarted && (
            <button
              onClick={handleClearManualOdds}
              disabled={isClearingManualOdds || !tournamentId}
              className="draft-clear-btn"
            >
              {isClearingManualOdds ? 'Clearing...' : 'Clear Manual Odds'}
            </button>
          )}
          {isDraftStarted && (
            <p style={{ color: '#90EE90', marginTop: '10px' }}>
              Draft has started. Odds are locked in!
            </p>
          )}
        </div>

        {/* Start Draft Button */}
        {!isDraftStarted && (
          <button
            onClick={handleStartDraft}
            disabled={isStartingDraft || !tournamentId}
            className="draft-start-btn"
          >
            {isStartingDraft ? 'Starting Draft...' : 'Start Draft & Lock Odds'}
          </button>
        )}
      </div>


      {/* Current Teams Section - Applying Flexbox Card Layout */}
      <h2>Current Teams</h2>
      {teams.length === 0 && <p>No teams assigned to this tournament yet. Add one below!</p>}

      {/* --- FLEXBOX CONTAINER FOR TEAM CARDS --- */}
      <div className="teams-flex-container">
        {teams.map((team, teamIndex) => {
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
                <h3 style={{ marginTop: '0', marginBottom: '5px', color: 'white' }}>
                  {team.name}
                </h3>
                <button
                  onClick={() => handleRemoveTeam(teamIndex)}
                  className="team-remove-btn"
                >
                  Remove Team
                </button>
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
                  <p style={{ color: 'red', margin: '10px 0 0 0' }}>{playerError}</p>
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
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={handleSaveTeams} disabled={isSaving} className="save-teams-btn">
        {isSaving ? 'Saving...' : 'Save All Teams'}
      </button>

      <div className="team-add-card">
        <h2 style={{marginTop: '0', marginBottom: '20px'}}>Add New Team</h2>
        <input
          type="text"
          placeholder="New Team Name"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          className="team-add-input"
        />
        <button onClick={handleAddTeam} className="team-add-btn">
          Add Team
        </button>
      </div>

    </div>
  );
};

export default TeamManagement;