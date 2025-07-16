// src/components/GlobalTeamsManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_BASE_URL, PLAYER_ODDS_API_ENDPOINT } from '../apiConfig';
import '../App.css';

const GlobalTeamsManagement = () => {
  const [globalTeams, setGlobalTeams] = useState([]);
  const [allPlayersWithOdds, setAllPlayersWithOdds] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [searchTerms, setSearchTerms] = useState({});
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState(null);

  // Load global teams
  const loadGlobalTeams = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/global_teams`);
      if (!response.ok) {
        throw new Error(`Failed to fetch global teams: ${response.status}`);
      }
      const teams = await response.json();
      setGlobalTeams(teams);
    } catch (error) {
      console.error('Error loading global teams:', error);
    }
  }, []);

  // Load players with odds (for demo purposes, using a sample tournament)
  const loadPlayersWithOdds = useCallback(async () => {
    setPlayerLoading(true);
    setPlayerError(null);
    try {
      // Use a default tournament for player odds (you may want to make this configurable)
      const response = await fetch(`${PLAYER_ODDS_API_ENDPOINT}?oddsId=497`);
      if (!response.ok) {
        throw new Error(`Failed to fetch player odds: ${response.status}`);
      }
      const playersData = await response.json();
      setAllPlayersWithOdds(playersData || []);
    } catch (error) {
      console.error('Error loading players:', error);
      setPlayerError(error.message);
    } finally {
      setPlayerLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadGlobalTeams();
    loadPlayersWithOdds();
  }, [loadGlobalTeams, loadPlayersWithOdds]);

  // Add new team
  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/global_teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          golferNames: [],
          participatesInAnnual: true,
          draftOrder: globalTeams.length + 1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create team');
      }

      setNewTeamName('');
      await loadGlobalTeams();
    } catch (error) {
      console.error('Error creating team:', error);
      alert(`Error creating team: ${error.message}`);
    }
  };

  // Update team
  const updateTeam = async (teamId, updateData) => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/global_teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update team');
      }

      await loadGlobalTeams();
    } catch (error) {
      console.error('Error updating team:', error);
      alert(`Error updating team: ${error.message}`);
    }
  };

  // Delete team
  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/global_teams/${teamId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete team');
      }

      await loadGlobalTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert(`Error deleting team: ${error.message}`);
    }
  };

  // Handle team name change
  const handleTeamNameChange = (teamId, newName) => {
    setGlobalTeams(prev => prev.map(team => 
      team.id === teamId ? { ...team, name: newName } : team
    ));
  };

  // Handle team name save
  const handleTeamNameSave = async (teamId, newName) => {
    if (!newName.trim()) return;
    await updateTeam(teamId, { name: newName.trim() });
  };

  // Handle annual participation change
  const handleAnnualParticipationChange = async (teamId, participates) => {
    await updateTeam(teamId, { participatesInAnnual: participates });
  };

  // Handle draft order change
  const handleDraftOrderChange = async (teamId, newOrder) => {
    await updateTeam(teamId, { draftOrder: parseInt(newOrder) || 0 });
  };

  // Handle golfer assignment
  const handleAddGolferToTeam = async (teamId, golferName) => {
    const team = globalTeams.find(t => t.id === teamId);
    if (!team) return;

    const updatedGolfers = [...(team.golferNames || []), golferName];
    await updateTeam(teamId, { golferNames: updatedGolfers });
  };

  // Handle golfer removal
  const handleRemoveGolferFromTeam = async (teamId, golferIndex) => {
    const team = globalTeams.find(t => t.id === teamId);
    if (!team) return;

    const updatedGolfers = [...(team.golferNames || [])];
    updatedGolfers.splice(golferIndex, 1);
    await updateTeam(teamId, { golferNames: updatedGolfers });
  };

  // Filter players for search
  const getFilteredPlayers = (teamId) => {
    const searchTerm = searchTerms[teamId] || '';
    return allPlayersWithOdds.filter(player => 
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="team-management">
      <h2>Global Teams Management</h2>
      <p className="subtitle">Manage teams globally - settings apply across all tournaments</p>

      {/* Add New Team Section */}
      <div className="add-team-section">
        <h3>Add New Team</h3>
        <div className="form-group">
          <input
            type="text"
            placeholder="Team Name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTeam()}
          />
          <button onClick={handleAddTeam} disabled={!newTeamName.trim()}>
            Add Team
          </button>
        </div>
      </div>

      {/* Teams List */}
      <div className="teams-section">
        <h3>Teams ({globalTeams.length})</h3>
        
        {globalTeams.length === 0 ? (
          <p>No teams created yet. Add your first team above!</p>
        ) : (
          <div className="teams-grid">
            {globalTeams.map((team) => (
              <div key={team.id} className="team-card">
                {/* Team Header */}
                <div className="team-header">
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => handleTeamNameChange(team.id, e.target.value)}
                    onBlur={(e) => handleTeamNameSave(team.id, e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTeamNameSave(team.id, e.target.value)}
                    className="team-name-input"
                  />
                  
                  {/* Annual Championship Participation */}
                  <label className="annual-participation-label">
                    <input
                      type="checkbox"
                      checked={team.participatesInAnnual !== false}
                      onChange={(e) => handleAnnualParticipationChange(team.id, e.target.checked)}
                    />
                    <span className="annual-participation-text">Annual Championship</span>
                  </label>
                  
                  <button 
                    onClick={() => handleDeleteTeam(team.id)}
                    className="delete-team-btn"
                    title="Delete Team"
                  >
                    ✕
                  </button>
                </div>

                {/* Draft Order */}
                <div className="draft-order-section">
                  <label>
                    Draft Order:
                    <input
                      type="number"
                      value={team.draftOrder || 0}
                      onChange={(e) => handleDraftOrderChange(team.id, e.target.value)}
                      min="0"
                      className="draft-order-input"
                    />
                  </label>
                </div>

                {/* Golfers Section */}
                <div className="golfers-section">
                  <h4>Golfers ({(team.golferNames || []).length}/4)</h4>
                  
                  {/* Current Golfers */}
                  <div className="current-golfers">
                    {(team.golferNames || []).map((golferName, index) => (
                      <div key={index} className="golfer-item">
                        <span>{golferName}</span>
                        <button
                          onClick={() => handleRemoveGolferFromTeam(team.id, index)}
                          className="remove-golfer-btn"
                          title="Remove golfer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Golfer Section */}
                  {(team.golferNames || []).length < 4 && (
                    <div className="add-golfer-section">
                      <input
                        type="text"
                        placeholder="Search golfers..."
                        value={searchTerms[team.id] || ''}
                        onChange={(e) => setSearchTerms(prev => ({
                          ...prev,
                          [team.id]: e.target.value
                        }))}
                        className="golfer-search-input"
                      />
                      
                      {searchTerms[team.id] && (
                        <div className="golfer-dropdown">
                          {playerLoading ? (
                            <div className="dropdown-item">Loading players...</div>
                          ) : playerError ? (
                            <div className="dropdown-item error">Error: {playerError}</div>
                          ) : (
                            getFilteredPlayers(team.id)
                              .filter(player => !(team.golferNames || []).includes(player.name))
                              .slice(0, 5)
                              .map((player, index) => (
                                <div
                                  key={index}
                                  className="dropdown-item"
                                  onClick={() => {
                                    handleAddGolferToTeam(team.id, player.name);
                                    setSearchTerms(prev => ({ ...prev, [team.id]: '' }));
                                  }}
                                >
                                  {player.name}
                                  {player.averageOdds && (
                                    <span className="odds"> ({player.averageOdds > 0 ? '+' : ''}{player.averageOdds})</span>
                                  )}
                                </div>
                              ))
                          )}
                          {!playerLoading && !playerError && getFilteredPlayers(team.id).length === 0 && (
                            <div className="dropdown-item">No players found</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalTeamsManagement;
