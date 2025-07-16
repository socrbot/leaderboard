// src/components/TournamentCreation.js
import React, { useState } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';
import '../App.css';

const TournamentCreation = ({ onTournamentCreated }) => {
  // States for creating a new tournament
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newOrgId, setNewOrgId] = useState('');
  const [newTournId, setNewTournId] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newOddsId, setNewOddsId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTournament = async () => {
    if (!newTournamentName.trim() || !newOrgId.trim() || !newTournId.trim() || !newYear.trim() || !newOddsId.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTournamentName.trim(),
          orgId: newOrgId.trim(),
          tournId: newTournId.trim(),
          year: newYear.trim(),
          oddsId: newOddsId.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tournament');
      }

      const result = await response.json();
      
      // Clear form
      setNewTournamentName('');
      setNewOrgId('');
      setNewTournId('');
      setNewYear('');
      setNewOddsId('');

      alert(`Tournament "${result.name}" created successfully!`);
      
      if (onTournamentCreated) {
        onTournamentCreated();
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert(`Error creating tournament: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="tournament-creation">
      <h3>Create New Tournament</h3>
      <p className="subtitle">Set up a new tournament with API connection details</p>

      <div className="tournament-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="tournament-name">Tournament Name</label>
            <input
              id="tournament-name"
              type="text"
              placeholder="e.g., Masters Tournament 2025"
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              className="form-input"
            />
            <small className="form-help">Display name for the tournament</small>
          </div>

          <div className="form-group">
            <label htmlFor="org-id">Organization ID</label>
            <input
              id="org-id"
              type="text"
              placeholder="e.g., 1"
              value={newOrgId}
              onChange={(e) => setNewOrgId(e.target.value)}
              className="form-input"
            />
            <small className="form-help">API Organization identifier</small>
          </div>

          <div className="form-group">
            <label htmlFor="tourn-id">Tournament ID</label>
            <input
              id="tourn-id"
              type="text"
              placeholder="e.g., 033"
              value={newTournId}
              onChange={(e) => setNewTournId(e.target.value)}
              className="form-input"
            />
            <small className="form-help">API Tournament identifier</small>
          </div>

          <div className="form-group">
            <label htmlFor="year">Year</label>
            <input
              id="year"
              type="text"
              placeholder="e.g., 2025"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="form-input"
            />
            <small className="form-help">Tournament year</small>
          </div>

          <div className="form-group">
            <label htmlFor="odds-id">Odds ID</label>
            <input
              id="odds-id"
              type="text"
              placeholder="e.g., 497"
              value={newOddsId}
              onChange={(e) => setNewOddsId(e.target.value)}
              className="form-input"
            />
            <small className="form-help">SportsData.io Tournament Odds ID</small>
          </div>
        </div>

        <div className="form-actions">
          <button
            onClick={handleCreateTournament}
            disabled={isCreating || !newTournamentName.trim() || !newOrgId.trim() || !newTournId.trim() || !newYear.trim() || !newOddsId.trim()}
            className="create-tournament-btn"
          >
            {isCreating ? 'Creating Tournament...' : 'Create Tournament'}
          </button>
        </div>
      </div>

      <div className="api-help">
        <h4>API Information</h4>
        <div className="help-grid">
          <div className="help-item">
            <strong>Organization ID & Tournament ID:</strong>
            <p>Found in the RapidAPI Live Golf Data leaderboard endpoint parameters</p>
          </div>
          <div className="help-item">
            <strong>Odds ID:</strong>
            <p>Found in SportsData.io Golf API tournament odds endpoints</p>
          </div>
          <div className="help-item">
            <strong>Year:</strong>
            <p>The year the tournament takes place</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentCreation;
