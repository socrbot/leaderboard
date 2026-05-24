// src/components/TournamentManagement.js
import React from 'react';
import TournamentCreation from './TournamentCreation';
import TeamManagement from './TeamManagement';

const TournamentManagement = ({
  tournamentId,
  activeLeagueId,
  onTournamentCreated,
  onTeamsSaved,
  tournamentOddsId,
  isDraftStarted,
  hasManualDraftOdds,
  onDraftStarted,
  onManualOddsUpdated,
}) => {
  return (
    <div className="tournament-management-shell">
      <TournamentCreation
        onTournamentCreated={onTournamentCreated}
        activeLeagueId={activeLeagueId}
      />

      <div style={{ height: '16px' }} />

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
    </div>
  );
};

export default TournamentManagement;