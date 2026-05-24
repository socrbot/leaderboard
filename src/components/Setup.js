// src/components/Setup.js
import React from 'react';
import LeagueManagement from './LeagueManagement';
import TournamentManagement from './TournamentManagement';
import UserSettings from './UserSettings';
import '../App.css';

const Setup = ({ 
  tournamentId, 
  selectedYear,
  activeLeagueId,
  onLeagueChange,
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
  const tab = activeTab || 'league-management';

  const tabs = {
    'league-management': <LeagueManagement activeLeagueId={activeLeagueId} onLeagueChange={onLeagueChange} />,
    'tournament-management': (
      <TournamentManagement
        tournamentId={tournamentId}
        selectedYear={selectedYear}
        activeLeagueId={activeLeagueId}
        onLeagueChange={onLeagueChange}
        onTournamentCreated={onTournamentCreated}
        onTeamsSaved={onTeamsSaved}
        tournamentOddsId={tournamentOddsId}
        isDraftStarted={isDraftStarted}
        hasManualDraftOdds={hasManualDraftOdds}
        onDraftStarted={onDraftStarted}
        onManualOddsUpdated={onManualOddsUpdated}
      />
    ),
    'my-profile': <UserSettings activeLeagueId={activeLeagueId} />,
  };

  return (
    <div className="setup-container">
      <div className="setup-content">
        {tabs[tab] || tabs['league-management']}
      </div>
    </div>
  );
};

export default Setup;
