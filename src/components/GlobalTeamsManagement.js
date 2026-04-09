// src/components/GlobalTeamsManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';
import '../App.css';

const GlobalTeamsManagement = ({ selectedYear }) => {
  const [globalTeams, setGlobalTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  // Load global teams for the selected year
  const loadGlobalTeams = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/global_teams?year=${selectedYear}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch global teams: ${response.status}`);
      }
      const teams = await response.json();
      setGlobalTeams(teams);
    } catch (error) {
      console.error('Error loading global teams:', error);
    }
  }, [selectedYear]);

  // Initial load and reload when year changes
  useEffect(() => {
    loadGlobalTeams();
  }, [loadGlobalTeams]);

  // Add new team
  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/global_teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          year: selectedYear,
          participatesInAnnual: true
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
      const response = await fetch(`${BACKEND_BASE_URL}/global_teams/${teamId}`, {
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
      const response = await fetch(`${BACKEND_BASE_URL}/global_teams/${teamId}`, {
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

  // Copy teams from previous year
  const handleCopyFromPreviousYear = async () => {
    const previousYear = (parseInt(selectedYear) - 1).toString();
    const confirmed = window.confirm(
      `Copy all teams from ${previousYear} to ${selectedYear}?\n\n` +
      `Golfer assignments will be cleared and need to be set during the draft.`
    );

    if (!confirmed) return;

    setIsCopying(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/global_teams/copy_year`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromYear: previousYear,
          toYear: selectedYear
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to copy teams');
      }

      const result = await response.json();
      alert(result.message);
      await loadGlobalTeams();
    } catch (error) {
      console.error('Error copying teams:', error);
      alert(`Error copying teams: ${error.message}`);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="team-management">
      <h2>Global Teams Management - {selectedYear} Season</h2>
      <p className="subtitle">Manage teams globally - settings apply across all {selectedYear} tournaments</p>

      {/* Copy from Previous Year */}
      {globalTeams.length === 0 && (
        <div className="copy-teams-section">
          <button 
            onClick={handleCopyFromPreviousYear}
            disabled={isCopying}
            className="copy-teams-btn"
          >
            {isCopying ? 'Copying...' : `📋 Copy Teams from ${parseInt(selectedYear) - 1}`}
          </button>
        </div>
      )}

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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalTeamsManagement;
