// src/components/Setup.js
import React from 'react';
import TournamentCreation from './TournamentCreation';
import GlobalTeamsManagement from './GlobalTeamsManagement';
import LeagueMembersTeams from './LeagueMembersTeams';
import TeamManagement from './TeamManagement';
import LeagueManagement from './LeagueManagement';
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
  const tab = activeTab || 'global-teams';

  const tabs = {
    'league': <LeagueManagement activeLeagueId={activeLeagueId} onLeagueChange={onLeagueChange} />,
    'global-teams': activeLeagueId
      ? <LeagueMembersTeams activeLeagueId={activeLeagueId} />
      : <GlobalTeamsManagement selectedYear={selectedYear} />,
    'tournament-creation': <TournamentCreation onTournamentCreated={onTournamentCreated} activeLeagueId={activeLeagueId} />,
    'draft-management': (
      <TeamManagement
        tournamentId={tournamentId}
        leagueId={activeLeagueId}
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
        {tabs[tab] || tabs['global-teams']}
      </div>
    </div>
  );
};

export default Setup;
