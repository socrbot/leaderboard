// src/components/DraftPicker.js
// Non-admin user view during an active draft.
// Top: DraftBoard tier grid. Bottom: team cards where the user's own card
// has clickable available players and all other cards are read-only.
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TOURNAMENTS_API_ENDPOINT } from '../apiConfig';
import DraftBoard from './DraftBoard';

const TIER_LABELS = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];

const DraftPicker = ({
  tournamentId, onDraftComplete, draftStatus, onStatusRefresh,
  topPlayers, draftBoardLoading, draftBoardError, oddsId, hasManualDraftOdds, tournamentInfo,
  isAdmin,
}) => {
  const { user, getIdToken } = useAuth();
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    IsDraftStarted,
    IsDraftComplete,
    numTeams = 0,
    draftPoolSize,
    draftPicks = [],
    teams = [],
    currentPickTeam,
    currentRound,
  } = draftStatus || {};

  // draftPoolSize = 4 × numTeams (the tiered board size); full lockedOdds may be larger for search
  const tierGroupSize = draftPoolSize ? Math.floor(draftPoolSize / (numTeams || 1)) : 4;

  const lockedOdds = draftStatus?.DraftLockedOdds || [];
  const isMyTurn = currentPickTeam && user && currentPickTeam.ownerUid === user.uid;
  const sortedTeams = [...teams].sort((a, b) => (a.draftOrder || 999) - (b.draftOrder || 999));

  // All available players — full locked list for search; tier labels based on draftPoolSize position
  const allPickedNames = new Set(draftPicks.map(p => p.playerName));
  const allAvailablePlayers = lockedOdds
    .map((p, idx) => ({
      ...p,
      tierLabel: TIER_LABELS[Math.floor(idx / tierGroupSize)] || `Tier ${Math.floor(idx / tierGroupSize) + 1}`,
    }))
    .filter(p => !allPickedNames.has(p.name));

  const trimmedSearch = searchTerm.trim().toLowerCase();
  const filteredPlayers = trimmedSearch
    ? allAvailablePlayers.filter(p => p.name.toLowerCase().includes(trimmedSearch))
    : [];

  const submitPick = useCallback(async (playerName) => {
    if (!tournamentId || !playerName) return;
    setPicking(true);
    setPickError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${tournamentId}/picks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ playerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit pick');
      if (data.draftComplete) {
        await (onDraftComplete && onDraftComplete());
      } else {
        await (onStatusRefresh && onStatusRefresh());
      }
    } catch (err) {
      setPickError(err.message);
    } finally {
      setPicking(false);
    }
  }, [tournamentId, getIdToken, onDraftComplete, onStatusRefresh]);

  // Reset search when it's a new team's turn
  useEffect(() => { setSearchTerm(''); }, [currentPickTeam]);

  if (!IsDraftStarted || IsDraftComplete) return null;

  return (
    <div style={{ color: 'white' }}>

      {/* ── SECTION 1: Draft Board (tier grid) — identical to admin view ── */}
      <DraftBoard
        topPlayers={topPlayers || []}
        loading={draftBoardLoading}
        error={draftBoardError}
        oddsId={oddsId}
        hasManualDraftOdds={hasManualDraftOdds}
        teams={teams}
        draftPicks={draftPicks}
        isDraftStarted={true}
        tournamentInfo={tournamentInfo}
        onPlayerClick={isMyTurn && !picking ? submitPick : null}
      />

      {/* ── SECTION 2: Turn banner ── */}
      <div style={{
        textAlign: 'center',
        padding: '14px 20px',
        margin: '0 20px 24px',
        borderRadius: '8px',
        backgroundColor: isMyTurn ? '#1a3a1a' : '#1a1a1a',
        border: `2px solid ${isMyTurn ? '#4CAF50' : '#555'}`,
        fontSize: '1.1em',
      }}>
        {isMyTurn ? (
          <strong style={{ color: '#a5d6a7' }}>
            It&apos;s your turn! Click any available player in the board above, or search below.
          </strong>
        ) : (
          <span style={{ color: '#ccc' }}>
            Waiting for{' '}
            <strong style={{ color: '#FFD700' }}>{currentPickTeam?.name || '...'}</strong>
            {' '}to pick — Round {currentRound}
          </span>
        )}
      </div>

      {/* ── SECTION 3: Pick error ── */}
      {pickError && (
        <div style={{
          color: '#ff6b6b', backgroundColor: '#3a1a1a', border: '1px solid #ff6b6b',
          borderRadius: '6px', padding: '10px 16px', margin: '0 20px 16px',
        }}>
          {pickError}
        </div>
      )}

      {/* ── SECTION 4: Team cards ── */}
      <div style={{ padding: '0 20px 40px' }}>
        <h2 style={{ textAlign: 'center', color: '#fff', marginBottom: '20px', fontSize: '1.5rem' }}>
          Team Draft Cards
        </h2>

        <div className="teams-flex-container">
          {sortedTeams.map(team => {
            const isMyTeam = user && team.ownerUid === user.uid;
            const isCurrent = currentPickTeam?.ownerUid === team.ownerUid;
            const picks = team.golferNames || [];

            return (
              <div
                key={team.ownerUid || team.name}
                className="team-card"
                style={{
                  border: isCurrent
                    ? '2px solid #4CAF50'
                    : isMyTeam
                    ? '2px solid #FFD700'
                    : '1px solid #555',
                  opacity: 1,
                  position: 'relative',
                }}
              >
                {/* Card header */}
                <div className="team-card-header">
                  <h3 style={{ margin: 0, color: isCurrent ? '#a5d6a7' : isMyTeam ? '#FFD700' : 'white' }}>
                    {team.draftOrder}. {team.name}
                    {isMyTeam && <span style={{ fontSize: '0.75em', marginLeft: '8px', color: '#aaa' }}>(you)</span>}
                  </h3>
                  {isCurrent && (
                    <span style={{
                      fontSize: '0.75em', color: '#4CAF50', fontWeight: 'bold',
                      backgroundColor: '#1a3a1a', padding: '2px 8px', borderRadius: '4px',
                    }}>
                      Picking now
                    </span>
                  )}
                </div>

                {/* Already-picked golfers (slots 1–4) */}
                <ul className="team-golfer-list" style={{ marginBottom: isMyTeam && isCurrent ? '12px' : '0' }}>
                  {[0, 1, 2, 3].map(slotIdx => {
                    const golfer = picks[slotIdx];
                    const tierLabel = TIER_LABELS[slotIdx];
                    if (golfer) {
                      return (
                        <li key={slotIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{golfer}</span>
                          <span style={{ fontSize: '0.75em', color: '#888' }}>{tierLabel}</span>
                        </li>
                      );
                    }
                    // Empty slot — show placeholder
                    return (
                      <li key={slotIdx} style={{
                        fontStyle: 'italic', color: '#666',
                        backgroundColor: '#3a3a3a',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span>—</span>
                        <span style={{ fontSize: '0.75em', color: '#555' }}>{tierLabel}</span>
                      </li>
                    );
                  })}
                </ul>

                {/* Player search — shown on user's own card when it's their turn */}
                {isMyTeam && isCurrent && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '0.8em', color: '#a5d6a7', marginBottom: '8px', paddingLeft: '2px' }}>
                      Click a player in the board above, or search:
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search golfer name..."
                      disabled={picking}
                      autoComplete="off"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        backgroundColor: '#2a2a2a',
                        color: '#fff',
                        border: '1px solid #4CAF50',
                        borderRadius: '6px',
                        fontSize: '0.9em',
                        boxSizing: 'border-box',
                        marginBottom: filteredPlayers.length > 0 ? '8px' : '0',
                      }}
                    />
                    {filteredPlayers.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '220px', overflowY: 'auto' }}>
                        {filteredPlayers.map(player => (
                          <button
                            key={player.name}
                            disabled={picking}
                            onClick={() => { submitPick(player.name); setSearchTerm(''); }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              backgroundColor: picking ? '#333' : '#1a3a1a',
                              color: '#fff',
                              border: '1px solid #4CAF50',
                              borderRadius: '6px',
                              cursor: picking ? 'not-allowed' : 'pointer',
                              fontSize: '0.85em',
                              textAlign: 'left',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                            onMouseEnter={e => { if (!picking) e.currentTarget.style.backgroundColor = '#2a5c2a'; }}
                            onMouseLeave={e => { if (!picking) e.currentTarget.style.backgroundColor = '#1a3a1a'; }}
                          >
                            <span style={{ fontWeight: 'bold' }}>{player.name}</span>
                            <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75em', color: '#888' }}>{player.tierLabel}</span>
                              {player.averageOdds != null && (
                                <span style={{ fontSize: '0.8em', color: '#a5d6a7' }}>
                                  {player.averageOdds > 0 ? `+${player.averageOdds}` : player.averageOdds}
                                </span>
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Waiting overlay label for other teams when it's their turn */}
                {isCurrent && !isMyTeam && (
                  <div style={{
                    marginTop: '10px', textAlign: 'center', fontSize: '0.85em',
                    color: '#4CAF50', fontStyle: 'italic',
                  }}>
                    Choosing now...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(DraftPicker);

