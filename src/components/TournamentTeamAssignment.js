// src/components/TournamentTeamAssignment.js
import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';
import '../App.css';

const TournamentTeamAssignment = ({ tournamentId, onTeamsSaved }) => {
  const [globalTeams, setGlobalTeams] = useState([]);
  const [assignedTeamIds, setAssignedTeamIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load global teams
  const loadGlobalTeams = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/global_teams`);
      if (!response.ok) {
        throw new Error(`Failed to fetch global teams: ${response.status}`);
      }
      const teams = await response.json();
      setGlobalTeams(teams);
    } catch (error) {
      console.error('Error loading global teams:', error);
    }
  }, []);

  // Load current team assignments
  const loadTeamAssignments = useCallback(async () => {
    if (!tournamentId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/team_assignments`);
      if (!response.ok) {
        throw new Error(`Failed to fetch team assignments: ${response.status}`);
      }
      const assignments = await response.json();
      const teamIds = assignments.map(assignment => assignment.globalTeamId).filter(Boolean);
      setAssignedTeamIds(teamIds);
    } catch (error) {
      console.error('Error loading team assignments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  // Initial load
  useEffect(() => {
    loadGlobalTeams();
    loadTeamAssignments();
  }, [loadGlobalTeams, loadTeamAssignments]);

  // Handle team selection change
  const handleTeamToggle = (teamId) => {
    setAssignedTeamIds(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      } else {
        return [...prev, teamId];
      }
    });
  };

  // Save team assignments
  const handleSaveAssignments = async () => {
    if (!tournamentId) return;
    
    setIsSaving(true);
    try {
      const teamAssignments = assignedTeamIds.map(teamId => ({
        globalTeamId: teamId
      }));

      const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/team_assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamAssignments })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save team assignments');
      }

      // Also update the legacy teams field for backward compatibility
      const legacyTeams = globalTeams
        .filter(team => assignedTeamIds.includes(team.id))
        .map(team => ({
          name: team.name,
          golferNames: team.golferNames || [],
          participatesInAnnual: team.participatesInAnnual !== false,
          draftOrder: team.draftOrder || 0
        }));

      const legacyResponse = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/teams`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: legacyTeams })
      });

      if (!legacyResponse.ok) {
        console.warn('Failed to update legacy teams field');
      }

      if (onTeamsSaved) {
        onTeamsSaved();
      }

      alert('Team assignments saved successfully!');
    } catch (error) {
      console.error('Error saving team assignments:', error);
      alert(`Error saving team assignments: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!tournamentId) {
    return (
      <div className="tournament-team-assignment">
        <p>Please select a tournament first to assign teams.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="tournament-team-assignment">
        <p>Loading team assignments...</p>
      </div>
    );
  }

  return (
    <div className="tournament-team-assignment">
      <h3>Tournament Team Assignment</h3>
      <p className="subtitle">Select which teams will participate in this tournament</p>

      {globalTeams.length === 0 ? (
        <div className="no-teams-message">
          <p>No global teams found. Please create teams in the Global Teams Management first.</p>
        </div>
      ) : (
        <>
          <div className="team-selection-grid">
            {globalTeams.map((team) => (
              <div 
                key={team.id} 
                className={`team-selection-card ${assignedTeamIds.includes(team.id) ? 'selected' : ''}`}
              >
                <label className="team-selection-label">
                  <input
                    type="checkbox"
                    checked={assignedTeamIds.includes(team.id)}
                    onChange={() => handleTeamToggle(team.id)}
                  />
                  <div className="team-info">
                    <h4>{team.name}</h4>
                    <div className="team-details">
                      <span className="golfer-count">
                        {(team.golferNames || []).length}/4 golfers
                      </span>
                      {team.participatesInAnnual !== false && (
                        <span className="annual-badge">Annual Championship</span>
                      )}
                    </div>
                    {(team.golferNames || []).length > 0 && (
                      <div className="golfer-list">
                        {(team.golferNames || []).map((golfer, index) => (
                          <span key={index} className="golfer-name">{golfer}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            ))}
          </div>

          <div className="assignment-summary">
            <p>
              <strong>{assignedTeamIds.length}</strong> teams selected for this tournament
            </p>
            
            <button 
              onClick={handleSaveAssignments}
              disabled={isSaving || assignedTeamIds.length === 0}
              className="save-assignments-btn"
            >
              {isSaving ? 'Saving...' : 'Save Team Assignments'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TournamentTeamAssignment;
