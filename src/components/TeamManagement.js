import React, { useState, useEffect, useCallback } from 'react';

// Define your backend endpoints
const BACKEND_BASE_URL = "https://leaderboard-backend-628169335141.us-east1.run.app/api";
const PLAYER_ODDS_API_ENDPOINT = `${BACKEND_BASE_URL}/player_odds`;

// TeamManagement now receives tournamentOddsId and isDraftStarted as props, and onDraftStarted callback
const TeamManagement = ({ tournamentId, onTournamentCreated, onTeamsSaved, tournamentOddsId, isDraftStarted, onDraftStarted }) => { // ADDED isDraftStarted, onDraftStarted
  const [teams, setTeams] = useState([]);
  const [allPlayersWithOdds, setAllPlayersWithOdds] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);

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
  const [isStartingDraft, setIsStartingDraft] = useState(false); // NEW: State for draft starting process


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
  useEffect(() => {
    const fetchAllPlayersForSearch = async () => {
      if (!tournamentOddsId) {
        setPlayerLoading(false);
        setAllPlayersWithOdds([]);
        setAvailablePlayers([]);
        return;
      }

      setPlayerLoading(true);
      setPlayerError(null);
      try {
        const response = await fetch(`${PLAYER_ODDS_API_ENDPOINT}?oddsId=${tournamentOddsId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawOddsData = await response.json();

        setAllPlayersWithOdds(rawOddsData);
        setAvailablePlayers(rawOddsData.map(p => p.name));

      } catch (error) {
        console.error("Error fetching ALL player odds for search functionality:", error);
        setPlayerError(`Failed to load players for search. Please check tournament Odds ID (${tournamentOddsId}).`);
        setAllPlayersWithOdds([]);
        setAvailablePlayers([]);
      } finally {
        setPlayerLoading(false);
      }
    };
    fetchAllPlayersForSearch();
  }, [tournamentOddsId]);


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
        alert("Please enter values for Tournament Name, Org ID, Tourn ID, Year, and Odds ID.");
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

  // NEW: handleStartDraft function
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


  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h1>Manage Teams</h1>

      {/* Create New Tournament UI - Applying Card and Grid Layout */}
      <div style={{
          marginBottom: '30px',
          border: '1px solid #555',
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: '#333',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          maxWidth: '500px',
          margin: '30px auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
      }}>
        <h2 style={{marginTop: '0', marginBottom: '20px'}}>Create New Tournament</h2>
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            width: '100%',
            marginBottom: '20px'
        }}>
            <div style={{width: '100%'}}>
                <input
                    type="text"
                    placeholder="Tournament Name"
                    value={newTournamentName}
                    onChange={(e) => setNewTournamentName(e.target.value)}
                    style={{ width: 'calc(100% - 16px)', padding: '8px', borderRadius: '4px', border: '1px solid #666', backgroundColor: '#444', color: 'white' }}
                />
            </div>
            <div style={{width: '100%'}}>
                <input
                    type="text"
                    placeholder="Leaderboard Org ID"
                    value={newOrgId}
                    onChange={(e) => setNewOrgId(e.target.value)}
                    style={{ width: 'calc(100% - 16px)', padding: '8px', borderRadius: '4px', border: '1px solid #666', backgroundColor: '#444', color: 'white' }}
                />
            </div>
            <div style={{width: '100%'}}>
                <input
                    type="text"
                    placeholder="Leaderboard Tourn ID"
                    value={newTournId}
                    onChange={(e) => setNewTournId(e.target.value)}
                    style={{ width: 'calc(100% - 16px)', padding: '8px', borderRadius: '4px', border: '1px solid #666', backgroundColor: '#444', color: 'white' }}
                />
            </div>
            <div style={{width: '100%'}}>
                <input
                    type="text"
                    placeholder="Leaderboard Year"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    style={{ width: 'calc(100% - 16px)', padding: '8px', borderRadius: '4px', border: '1px solid #666', backgroundColor: '#444', color: 'white' }}
                />
            </div>
            <div style={{width: '100%'}}>
                <input
                    type="text"
                    placeholder="Odds API Tournament ID"
                    value={newOddsId}
                    onChange={(e) => setNewOddsId(e.target.value)}
                    style={{ width: 'calc(100% - 16px)', padding: '8px', borderRadius: '4px', border: '1px solid #666', backgroundColor: '#444', color: 'white' }}
                />
            </div>
        </div>
        <button onClick={handleCreateTournament} style={{ backgroundColor: '#2196F3', color: 'white', padding: '10px 20px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
          Create Tournament
        </button>
      </div>

      {/* NEW: Start Draft Button */}
      <div style={{ textAlign: 'center', margin: '20px auto', maxWidth: '500px', padding: '15px', border: '1px solid #555', borderRadius: '8px', backgroundColor: '#333', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
        <h2 style={{marginTop: '0', marginBottom: '20px'}}>Draft Actions</h2>
        {isDraftStarted ? (
          <p style={{ color: '#90EE90' }}>Draft has started. Odds are locked in!</p>
        ) : (
          <button
            onClick={handleStartDraft}
            disabled={isStartingDraft || !tournamentId}
            style={{
              backgroundColor: '#FF5722', // Orange for action
              color: 'white',
              padding: '10px 20px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.1em',
              transition: 'background-color 0.3s ease',
            }}
          >
            {isStartingDraft ? 'Starting Draft...' : 'Start Draft & Lock Odds'}
          </button>
        )}
      </div>


      {/* Current Teams Section - Applying Flexbox Card Layout */}
      <h2>Current Teams</h2>
      {teams.length === 0 && <p>No teams assigned to this tournament yet. Add one below!</p>}

      {/* --- FLEXBOX CONTAINER FOR TEAM CARDS --- */}
      <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'center',
          padding: '10px 0'
      }}>
        {teams.map((team, teamIndex) => {
          const currentSearchTerm = searchTerms[teamIndex] || '';
          const filteredPlayersForThisTeam = allPlayersWithOdds.filter(player =>
            player.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) &&
            !team.golferNames.includes(player.name)
          ).map(p => p.name);

          return (
            <div
              key={team.name || `team-${teamIndex}`}
              style={{
                border: '1px solid #555',
                borderRadius: '8px',
                backgroundColor: '#444',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                flex: '1 1 calc(33% - 20px)',
                minWidth: '280px',
                maxWidth: '400px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                overflow: 'hidden'
              }}
            >
              <div style={{
                backgroundColor: '#383838',
                padding: '10px 15px',
                borderRadius: '8px 8px 0 0',
                width: '100%',
                boxSizing: 'border-box',
                textAlign: 'center'
              }}>
                <h3 style={{ marginTop: '0', marginBottom: '5px', color: 'white' }}>
                  {team.name}
                </h3>
                <button
                  onClick={() => handleRemoveTeam(teamIndex)}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '3px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75em',
                    maxWidth: '120px'
                  }}
                >
                  Remove Team
                </button>
              </div>

              <div style={{
                backgroundColor: '#404040',
                padding: '8px 15px',
                width: '100%',
                boxSizing: 'border-box',
                textAlign: 'center',
                color: '#ccc',
                fontWeight: 'bold'
              }}>
                Golfers:
              </div>

              <ul style={{ listStyle: 'none', padding: '0', margin: '0', flexGrow: '1', width: '100%' }}>
                {team.golferNames.length === 0 && <li style={{ padding: '8px 15px', fontStyle: 'italic', color: '#ccc', backgroundColor: '#4A4A4A' }}>No golfers assigned yet.</li>}
                {team.golferNames.map((golfer, playerIndex) => (
                  <li
                    key={golfer}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 15px',
                      backgroundColor: playerIndex % 2 === 0 ? '#4A4A4A' : '#525252',
                      borderBottom: playerIndex === team.golferNames.length - 1 ? 'none' : '1px dotted #555'
                    }}
                  >
                    {golfer}
                    <button onClick={() => handleRemovePlayerFromTeam(teamIndex, golfer)} style={{ backgroundColor: '#f44336', color: 'white', fontSize: '0.8em', padding: '3px 6px', borderRadius: '3px', border: 'none', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>

              <div style={{
                marginTop: '0px',
                backgroundColor: '#555',
                padding: '10px',
                borderRadius: '0 0 8px 8px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <input
                  type="text"
                  placeholder="Search players to add"
                  value={currentSearchTerm}
                  onChange={(e) => handleSearchTermChange(teamIndex, e.target.value)}
                  style={{ width: 'calc(100% - 20px)', padding: '8px', borderRadius: '4px', border: '1px solid #777', backgroundColor: '#666', color: 'white' }}
                />
                {playerLoading ? (
                  <p style={{ margin: '10px 0 0 0', color: '#ccc' }}>Loading potential players...</p>
                ) : playerError ? (
                  <p style={{ color: 'red', margin: '10px 0 0 0' }}>{playerError}</p>
                ) : (
                  currentSearchTerm && filteredPlayersForThisTeam.length > 0 && (
                    <ul style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #777', listStyle: 'none', padding: '5px', backgroundColor: '#666', margin: '10px 0 0 0', borderRadius: '4px' }}>
                      {filteredPlayersForThisTeam.map((player) => (
                        <li
                          key={player}
                          onClick={() => handleAddPlayerToTeam(teamIndex, player)}
                          style={{ cursor: 'pointer', padding: '5px', borderBottom: '1px solid #777', '&:last-child': { borderBottom: 'none' }, transition: 'background-color 0.2s', backgroundColor: '#666' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#777'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#666'}
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

      <button onClick={handleSaveTeams} disabled={isSaving} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.2em', backgroundColor: '#4CAF50', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
        {isSaving ? 'Saving...' : 'Save All Teams'}
      </button>

      <div style={{
          marginTop: '20px',
          border: '1px solid #555',
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: '#333',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          maxWidth: '500px',
          margin: '20px auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
      }}>
        <h2 style={{marginTop: '0', marginBottom: '20px'}}>Add New Team</h2>
        <input
          type="text"
          placeholder="New Team Name"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          style={{
            width: 'calc(100% - 16px)',
            padding: '8px',
            marginRight: '0px',
            marginBottom: '20px',
            borderRadius: '4px',
            border: '1px solid #666',
            backgroundColor: '#444',
            color: 'white'
          }}
        />
        <button onClick={handleAddTeam} style={{ backgroundColor: '#2196F3', color: 'white', padding: '10px 20px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
          Add Team
        </button>
      </div>

    </div>
  );
};

export default TeamManagement;