import React, { useState, useEffect, useCallback } from 'react';
// Make sure this path is correct if you moved playerOddsUtils.js
import { calculateAverageOdds } from '../utils/playerOddsUtils';

// Define your backend endpoints
const BACKEND_BASE_URL = "http://127.0.0.1:8080/api"; // Ensure this matches your Flask backend URL
const PLAYER_ODDS_API_ENDPOINT = `${BACKEND_BASE_URL}/player_odds`;

const TeamManagement = ({ tournamentId, onTournamentCreated, onTeamsSaved }) => {
  const [teams, setTeams] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]); // Players from your API (processed)

  // States for creating a new tournament
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newOrgId, setNewOrgId] = useState('');
  const [newTournId, setNewTournId] = useState('');
  const [newYear, setNewYear] = useState('');

  // States for adding a new team
  const [newTeamName, setNewTeamName] = useState('');

  // States for player search within teams
  const [searchTerms, setSearchTerms] = useState({}); // { teamIndex: 'searchTerm' }

  // Loading/error states for available players
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState(null);

  // State for saving teams process
  const [isSaving, setIsSaving] = useState(false); // To prevent double clicks and show saving status

  // 1. Fetch available players with average odds from backend
  useEffect(() => {
    const fetchPlayerOdds = async () => {
      setPlayerLoading(true);
      setPlayerError(null);
      try {
        const response = await fetch(PLAYER_ODDS_API_ENDPOINT);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawOddsData = await response.json();

        // Assuming your backend directly returns the averaged_odds_list from calculateAverageOdds:
        setAvailablePlayers(rawOddsData.map(p => p.name));

      } catch (error) {
        console.error("Error fetching player odds for team management:", error);
        setPlayerError("Failed to load player list. Please try again.");
        setAvailablePlayers([]);
      } finally {
        setPlayerLoading(false);
      }
    };
    fetchPlayerOdds();
  }, []);

  // 2. Load existing teams for the selected tournament from backend
  // useCallback is used to memoize the function, preventing unnecessary re-creations
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
      setTeams(tournamentData.teams || []); // Ensure teams is an array, even if empty
      setSearchTerms({}); // Clear search terms when loading new teams
    } catch (error) {
      console.error("Error loading teams:", error);
      alert('Failed to load teams for the selected tournament.');
      setTeams([]); // Clear teams on error
    }
  }, [tournamentId]); // Dependency on tournamentId

  // useEffect to call loadTeams when tournamentId or loadTeams itself changes
  useEffect(() => {
    loadTeams();
  }, [loadTeams]);


  // --- Event Handlers for Team/Player Management ---

  const handleAddTeam = () => {
    if (newTeamName.trim() === '') return;
    // Check if team name already exists to prevent duplicates
    if (teams.some(team => team.name.toLowerCase() === newTeamName.trim().toLowerCase())) {
        alert("A team with this name already exists!");
        return;
    }
    setTeams([...teams, { name: newTeamName.trim(), golferNames: [] }]);
    setNewTeamName(''); // Clear the input field
  };

  const handleRemoveTeam = (teamIndex) => {
    const updatedTeams = teams.filter((_, index) => index !== teamIndex);
    setTeams(updatedTeams);
  };

  // Handle search term change for a specific team input
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

    // Optional: Prevent player from being on multiple teams (uncomment if desired)
    // const isPlayerAlreadyAssigned = updatedTeams.some(t => t.golferNames.includes(playerToAdd));
    // if (isPlayerAlreadyAssigned) {
    //     alert(`${playerToAdd} is already assigned to another team.`);
    //     return;
    // }

    team.golferNames.push(playerToAdd);
    setTeams(updatedTeams);

    // Clear the search term for this specific team after adding a player
    handleSearchTermChange(teamIndex, '');
  };

  const handleRemovePlayerFromTeam = (teamIndex, playerToRemove) => {
    const updatedTeams = [...teams];
    updatedTeams[teamIndex].golferNames = updatedTeams[teamIndex].golferNames.filter(
      (player) => player !== playerToRemove
    );
    setTeams(updatedTeams);
  };

  // --- Save Teams to Backend ---
  const handleSaveTeams = async () => {
    if (!tournamentId) {
      alert("No tournament selected. Please select or create one to save teams.");
      return;
    }
    if (isSaving) return; // Prevent multiple saves
    setIsSaving(true);

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/teams`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teams: teams }), // Send the 'teams' array
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`HTTP error! status: ${response.status}. ${errorData.error || errorData.message}`);
      }

      alert('Teams saved successfully!');
      if (onTeamsSaved) { // Call the callback on successful save to notify parent
        onTeamsSaved();
      }
    } catch (error) {
      console.error('Error saving teams:', error);
      alert(`Failed to save teams: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Create New Tournament ---
  const handleCreateTournament = async () => {
    if (newTournamentName.trim() === '') {
      alert("Please enter a name for the new tournament.");
      return;
    }
    // Basic validation for API parameters
    if (newOrgId.trim() === '' || newTournId.trim() === '' || newYear.trim() === '') {
        alert("Please enter values for Org ID, Tourn ID, and Year.");
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
          year: newYear.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`HTTP error! status: ${response.status}. ${errorData.error || errorData.message}`);
      }

      const newTourn = await response.json();
      alert(`New tournament "${newTourn.name}" created with ID: ${newTourn.id}`);
      // Clear all new tournament input fields
      setNewTournamentName('');
      setNewOrgId('');
      setNewTournId('');
      setNewYear('');

      if (onTournamentCreated) { // Call the callback on successful creation to notify parent
        onTournamentCreated();
      }

    } catch (error) {
      console.error("Error creating new tournament:", error);
      alert(`Failed to create new tournament: ${error.message}`);
    }
  };


  return (
    <div style={{ padding: '20px' }}>
      <h1>Manage Teams for Tournament: {tournamentId || 'None Selected'}</h1>

      {/* Create New Tournament UI */}
      <div style={{ marginBottom: '30px', border: '1px solid #555', padding: '15px', borderRadius: '8px', backgroundColor: '#333' }}>
        <h2>Create New Tournament</h2>
        <div style={{ marginBottom: '10px' }}>
            <input
                type="text"
                placeholder="Tournament Name"
                value={newTournamentName}
                onChange={(e) => setNewTournamentName(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #666', backgroundColor: '#444', color: 'white' }}
            />
        </div>
        <div style={{ marginBottom: '10px' }}>
            <input
                type="text"
                placeholder="Leaderboard Org ID (e.g., 1)"
                value={newOrgId}
                onChange={(e) => setNewOrgId(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #666', backgroundColor: '#444', color: 'white' }}
            />
        </div>
        <div style={{ marginBottom: '10px' }}>
            <input
                type="text"
                placeholder="Leaderboard Tourn ID (e.g., 033)"
                value={newTournId}
                onChange={(e) => setNewTournId(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #666', backgroundColor: '#444', color: 'white' }}
            />
        </div>
        <div style={{ marginBottom: '10px' }}>
            <input
                type="text"
                placeholder="Leaderboard Year (e.g., 2025)"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #666', backgroundColor: '#444', color: 'white' }}
            />
        </div>
        <button onClick={handleCreateTournament} style={{ backgroundColor: '#2196F3', color: 'white' }}>
          Create Tournament
        </button>
      </div>


      {/* Current Teams Section */}
      <h2>Current Teams</h2>
      {teams.length === 0 && <p>No teams assigned to this tournament yet. Add one below!</p>}
      {teams.map((team, teamIndex) => {
        // Get the specific search term for this team
        const currentSearchTerm = searchTerms[teamIndex] || '';
        // Filter players for this specific team's search
        const filteredPlayersForThisTeam = availablePlayers.filter(player =>
          player.toLowerCase().includes(currentSearchTerm.toLowerCase()) &&
          // Don't show players already in THIS team's roster
          !team.golferNames.includes(player)
        );

        return (
          <div key={team.name || `team-${teamIndex}`} style={{ border: '1px solid gray', margin: '10px', padding: '10px', borderRadius: '8px', backgroundColor: '#444' }}>
            <h3>{team.name} <button onClick={() => handleRemoveTeam(teamIndex)} style={{ backgroundColor: '#f44336', color: 'white', marginLeft: '10px' }}>Remove Team</button></h3>
            <h4>Golfers:</h4>
            <ul>
              {team.golferNames.length === 0 && <li>No golfers assigned yet.</li>}
              {team.golferNames.map((golfer, playerIndex) => (
                <li key={golfer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                  {golfer} <button onClick={() => handleRemovePlayerFromTeam(teamIndex, golfer)} style={{ backgroundColor: '#f44336', color: 'white', fontSize: '0.8em' }}>Remove</button>
                </li>
              ))}
            </ul>
            {/* Player Search and Add within each team */}
            <div style={{ marginTop: '10px', backgroundColor: '#555', padding: '10px', borderRadius: '5px' }}>
              <input
                type="text"
                placeholder="Search players to add"
                value={currentSearchTerm} // Use team-specific search term
                onChange={(e) => handleSearchTermChange(teamIndex, e.target.value)} // Update specific search term
                style={{ width: 'calc(100% - 20px)', padding: '8px', borderRadius: '4px', border: '1px solid #777', backgroundColor: '#666', color: 'white' }}
              />
              {playerLoading ? (
                <p>Loading potential players...</p>
              ) : playerError ? (
                <p style={{ color: 'red' }}>{playerError}</p>
              ) : (
                // Only show search results if there's a search term and results exist
                currentSearchTerm && filteredPlayersForThisTeam.length > 0 && (
                  <ul style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #777', listStyle: 'none', padding: '5px', backgroundColor: '#666', margin: '10px 0 0 0' }}>
                    {filteredPlayersForThisTeam.map((player) => ( // Use team-specific filtered players
                      <li
                        key={player}
                        onClick={() => handleAddPlayerToTeam(teamIndex, player)}
                        style={{ cursor: 'pointer', padding: '5px', borderBottom: '1px solid #777', '&:last-child': { borderBottom: 'none' } }}
                      >
                        {player}
                      </li>
                    ))}
                  </ul>
                )
              )}
              {/* Message if no players found for the search term */}
              {currentSearchTerm && filteredPlayersForThisTeam.length === 0 && !playerLoading && !playerError && (
                <p style={{ marginTop: '10px' }}>No players found matching "{currentSearchTerm}"</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Save All Teams Button */}
      <button onClick={handleSaveTeams} disabled={isSaving} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.2em', backgroundColor: '#4CAF50', color: 'white' }}>
        {isSaving ? 'Saving...' : 'Save All Teams'}
      </button>

      {/* Add New Team Section */}
      <div style={{ marginTop: '20px', border: '1px solid #555', padding: '15px', borderRadius: '8px', backgroundColor: '#333' }}>
        <h2>Add New Team</h2>
        <input
          type="text"
          placeholder="New Team Name"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #666', backgroundColor: '#444', color: 'white' }}
        />
        <button onClick={handleAddTeam} style={{ backgroundColor: '#2196F3', color: 'white' }}>
          Add Team
        </button>
      </div>

    </div>
  );
};

export default TeamManagement;