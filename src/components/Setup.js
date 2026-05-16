// src/components/Setup.js
import React from 'react';
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
  onManualOddsUpdated,
  onSignOut,
  userEmail,
  activeTab,
  setActiveTab
}) => {
  // fallback if activeTab not provided
  const tab = activeTab || 'global-teams';

  const tabs = {
    'global-teams': <GlobalTeamsManagement selectedYear={selectedYear} />,
    'tournament-creation': <TournamentCreation onTournamentCreated={onTournamentCreated} />,
    'draft-management': (
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
  };

  return (
    <div className="setup-container">
      <div className="setup-content">
        {tabs[tab] || tabs['global-teams']}
      </div>
    </div>
  );
};

export default Setup;
