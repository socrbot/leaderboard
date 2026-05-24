// src/components/TournamentManagement.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LEAGUES_API_ENDPOINT } from '../apiConfig';
import { useAuth } from '../contexts/AuthContext';
import TournamentCreation from './TournamentCreation';
import TeamManagement from './TeamManagement';
import './TournamentManagement.css';

const TournamentManagement = ({
  tournamentId,
  activeLeagueId,
  onLeagueChange,
  onTournamentCreated,
  onTeamsSaved,
  tournamentOddsId,
  isDraftStarted,
  hasManualDraftOdds,
  onDraftStarted,
  onManualOddsUpdated,
}) => {
  const { getIdToken } = useAuth();
  const [managedLeagues, setManagedLeagues] = useState([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [showLeagueMenu, setShowLeagueMenu] = useState(false);
  const leagueMenuRef = useRef(null);

  useEffect(() => {
    const loadLeagues = async () => {
      setLeaguesLoading(true);
      try {
        const token = await getIdToken();
        const res = await fetch(`${LEAGUES_API_ENDPOINT}/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setManagedLeagues([]);
          return;
        }
        const leagues = await res.json();
        setManagedLeagues(Array.isArray(leagues) ? leagues : []);
        if (!activeLeagueId && Array.isArray(leagues) && leagues.length > 0 && onLeagueChange) {
          onLeagueChange(leagues[0].leagueId);
        }
      } catch {
        setManagedLeagues([]);
      } finally {
        setLeaguesLoading(false);
      }
    };

    loadLeagues();
  }, [activeLeagueId, getIdToken, onLeagueChange]);

  useEffect(() => {
    if (!showLeagueMenu) return;
    const handleClickOutside = (event) => {
      if (leagueMenuRef.current && !leagueMenuRef.current.contains(event.target)) {
        setShowLeagueMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLeagueMenu]);

  const selectedLeague = useMemo(
    () => managedLeagues.find((league) => league.leagueId === activeLeagueId) || managedLeagues[0] || null,
    [activeLeagueId, managedLeagues]
  );

  return (
    <div className="tournament-management-shell">
      <section className="tournament-management-panel">
        <label className="tournament-management-label">Current League Context</label>
        <div className="tournament-management-context-card" ref={leagueMenuRef}>
          <button
            type="button"
            className="tournament-management-context-trigger"
            onClick={() => setShowLeagueMenu((prev) => !prev)}
            aria-expanded={showLeagueMenu}
          >
            <div>
              <p className="tournament-management-context-title">{selectedLeague?.name || 'Select a league'}</p>
              <p className="tournament-management-context-meta">
                {leaguesLoading ? 'Loading managed leagues...' : `${managedLeagues.length || 0} leagues available`}
              </p>
            </div>
            <span className="tournament-management-context-arrow" aria-hidden="true">▾</span>
          </button>

          {showLeagueMenu && (
            <div className="tournament-management-context-menu">
              {managedLeagues.length > 0 ? managedLeagues.map((league) => (
                <button
                  key={league.leagueId}
                  type="button"
                  className={`tournament-management-context-item${league.leagueId === activeLeagueId ? ' active' : ''}`}
                  onClick={() => {
                    onLeagueChange?.(league.leagueId);
                    setShowLeagueMenu(false);
                  }}
                >
                  <span>{league.name}</span>
                  {league.leagueId === activeLeagueId ? <strong>Active</strong> : null}
                </button>
              )) : (
                <p className="tournament-management-context-empty">No managed leagues found.</p>
              )}
            </div>
          )}
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
        <h3 className="tournament-management-section-title">Tournament Draft Status</h3>
        <div className="tournament-management-stack">
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