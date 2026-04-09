// src/components/Setup.js
import React, { useState } from 'react';
import TournamentCreation from './TournamentCreation';
import GlobalTeamsManagement from './GlobalTeamsManagement';
import TeamManagement from './TeamManagement';
import '../App.css';

const Setup = ({ 
  tournamentId, 
  selectedYear,
  onTournamentCreated, 
  onTeamsSaved, 
  tournamentOddsId, 
  isDraftStarted, 
  hasManualDraftOdds, 
  onDraftStarted, 
  onManualOddsUpdated 
}) => {
  const [activeTab, setActiveTab] = useState('global-teams');

  const tabs = [
    {
      id: 'global-teams',
      label: 'Global Teams',
      icon: '👥',
      component: <GlobalTeamsManagement selectedYear={selectedYear} />,
      requiresTournament: false
    },
    {
      id: 'tournament-creation',
      label: 'Create Tournament',
      icon: '🏆',
      component: <TournamentCreation onTournamentCreated={onTournamentCreated} />,
      requiresTournament: false
    },
    {
      id: 'draft-management',
      label: 'Draft Management',
      icon: '🎯',
      component: (
        <TeamManagement
          tournamentId={tournamentId}
          onTournamentCreated={onTournamentCreated}
          onTeamsSaved={onTeamsSaved}
          tournamentOddsId={tournamentOddsId}
          isDraftStarted={isDraftStarted}
          hasManualDraftOdds={hasManualDraftOdds}
          onDraftStarted={onDraftStarted}
          onManualOddsUpdated={onManualOddsUpdated}
        />
      ),
      requiresTournament: true
    }
  ];

  const handleTabChange = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.requiresTournament && !tournamentId) {
      alert('Please select a tournament first to access this feature.');
      return;
    }
    setActiveTab(tabId);
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="setup-container">
      <div className="setup-header">
        <h2>Tournament Setup</h2>
        <p className="setup-subtitle">Manage teams, assignments, and draft settings</p>
      </div>

      {/* Tab Navigation */}
      <div className="setup-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`setup-tab ${activeTab === tab.id ? 'active' : ''} ${
              tab.requiresTournament && !tournamentId ? 'disabled' : ''
            }`}
            onClick={() => handleTabChange(tab.id)}
            disabled={tab.requiresTournament && !tournamentId}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.requiresTournament && !tournamentId && (
              <span className="tab-requirement">Requires Tournament</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="setup-content">
        {activeTabData && activeTabData.component}
      </div>

      {/* Help Text */}
      <div className="setup-help">
        <div className="help-section">
          <h4>Setup Workflow:</h4>
          <ol>
            <li><strong>Global Teams:</strong> Create teams for the season (select year in header first). Teams automatically apply to all tournaments for that year.</li>
            <li><strong>Create Tournament:</strong> Set up a new tournament with API details. All global teams for the tournament's year are automatically assigned.</li>
            <li><strong>Draft Management:</strong> Teams are ready for draft. Configure settings, lock odds, and manage the draft process.</li>
          </ol>
          <p className="workflow-note">
            💡 <strong>Tip:</strong> Teams are year-specific. Create global teams for your season before creating tournaments.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Setup;
