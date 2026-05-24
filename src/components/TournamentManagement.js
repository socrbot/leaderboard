// src/components/TournamentManagement.js
import React, { useCallback, useEffect, useState } from 'react';
import { BACKEND_BASE_URL, LEAGUES_API_ENDPOINT } from '../apiConfig';
import TournamentCreation from './TournamentCreation';
import TeamManagement from './TeamManagement';
import './TournamentManagement.css';

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
  const [leagueName, setLeagueName] = useState('');
  const [currentTournament, setCurrentTournament] = useState(null);

  const loadContext = useCallback(async () => {
    if (activeLeagueId) {
      try {
        const res = await fetch(`${LEAGUES_API_ENDPOINT}/${activeLeagueId}`);
        if (res.ok) {
          const data = await res.json();
          setLeagueName(data?.name || '');
        }
      } catch {
        setLeagueName('');
      }
    } else {
      setLeagueName('');
    }

    if (tournamentId) {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}`);
        if (res.ok) {
          setCurrentTournament(await res.json());
        }
      } catch {
        setCurrentTournament(null);
      }
    } else {
      setCurrentTournament(null);
    }
  }, [activeLeagueId, tournamentId]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const tournamentTitle = currentTournament?.name || currentTournament?.Name || 'No tournament selected';
  const draftChip = !tournamentId
    ? 'No active tournament'
    : hasManualDraftOdds && !isDraftStarted
      ? 'Manual odds active'
      : isDraftStarted
        ? 'Draft in progress'
        : 'Draft ready';

  return (
    <div className="tournament-management-shell">
      <header className="tournament-management-hero">
        <div className="tournament-management-hero-copy">
          <p className="tournament-management-kicker">Setup</p>
          <h2 className="tournament-management-title">Manage League</h2>
          <p className="tournament-management-subtitle">
            Create tournaments, review draft readiness, and manage team picks from one focused workspace.
          </p>
        </div>
        <div className="tournament-management-hero-chip">
          <span className="tournament-management-hero-chip-label">Admin workflow</span>
          <strong>{draftChip}</strong>
        </div>
      </header>

      <section className="tournament-management-panel">
        <label className="tournament-management-label">Current league context</label>
        <div className="tournament-management-context-card">
          <div>
            <p className="tournament-management-context-title">{leagueName || activeLeagueId || 'No league selected'}</p>
            <p className="tournament-management-context-meta">{tournamentTitle}</p>
          </div>
          <div className="tournament-management-context-status">{draftChip}</div>
        </div>
      </section>

      <section className="tournament-management-panel">
        <h3 className="tournament-management-section-title">Create Tournament</h3>
        <div className="tournament-management-card">
          <TournamentCreation
            onTournamentCreated={onTournamentCreated}
            activeLeagueId={activeLeagueId}
          />
        </div>
      </section>

      <section className="tournament-management-panel">
        <div className="tournament-management-section-head">
          <h3 className="tournament-management-section-title">Tournament Draft Status</h3>
          <span className="tournament-management-section-chip">{draftChip}</span>
        </div>

        <div className="tournament-management-card tournament-management-draft-card">
          <div className="tournament-management-draft-summary">
            <div>
              <p className="tournament-management-draft-label">Current tournament</p>
              <h4 className="tournament-management-draft-title">{tournamentTitle}</h4>
              <p className="tournament-management-draft-meta">
                {tournamentId ? `Tournament ID: ${tournamentId}` : 'Select or create a tournament to manage draft status.'}
              </p>
            </div>
            <div className="tournament-management-draft-badge">{draftChip}</div>
          </div>

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
            hideHeader
          />
        </div>
      </section>
    </div>
  );
};

export default TournamentManagement;