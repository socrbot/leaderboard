// src/components/DraftPicker.js
// Non-admin user view during an active draft.
// Shows whose turn it is, tier player cards, and the live board.
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TOURNAMENTS_API_ENDPOINT } from '../apiConfig';

const TIER_LABELS = ['Tier 1 — Favourites', 'Tier 2 — Contenders', 'Tier 3 — Dark Horses', 'Tier 4 — Longshots'];

const DraftPicker = ({ tournamentId, onDraftComplete, draftStatus, onStatusRefresh }) => {
  const { user, getIdToken } = useAuth();
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState(null);

  const {
    IsDraftStarted,
    IsDraftComplete,
    numTeams = 0,
    draftPicks = [],
    teams = [],
    currentPickTeam,
    currentRound,
    currentTier,
  } = draftStatus || {};

  // Locked odds come from the tournament doc; derive from teams' golferNames + currentTier
  // The parent passes full draftStatus so we can compute available players
  const lockedOdds = draftStatus?.DraftLockedOdds || [];

  const isMyTurn = currentPickTeam && user && currentPickTeam.ownerUid === user.uid;
  const sortedTeams = [...teams].sort((a, b) => (a.draftOrder || 999) - (b.draftOrder || 999));

  // Tier players for current round (0-indexed round_idx = currentTier-1)
  const tierIdx = (currentTier || 1) - 1;
  const tierStart = tierIdx * numTeams;
  const tierEnd = (tierIdx + 1) * numTeams;
  const tierPlayers = lockedOdds.slice(tierStart, tierEnd);
  const allPickedNames = new Set(draftPicks.map(p => p.playerName));
  const availablePlayers = tierPlayers.filter(p => !allPickedNames.has(p.name));

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
        onDraftComplete && onDraftComplete();
      } else {
        onStatusRefresh && onStatusRefresh();
      }
    } catch (err) {
      setPickError(err.message);
    } finally {
      setPicking(false);
    }
  }, [tournamentId, getIdToken, onDraftComplete, onStatusRefresh]);

  if (!IsDraftStarted || IsDraftComplete) return null;

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '900px', margin: '0 auto' }}>
      {/* Status banner */}
      <div style={{
        textAlign: 'center',
        padding: '16px',
        marginBottom: '20px',
        borderRadius: '8px',
        backgroundColor: isMyTurn ? '#2d6a2d' : '#1a1a1a',
        border: `2px solid ${isMyTurn ? '#4CAF50' : '#555'}`,
        fontSize: '1.1em',
      }}>
        {isMyTurn ? (
          <span style={{ color: '#a5d6a7', fontWeight: 'bold' }}>
            🏌️ It&apos;s your turn! Pick a Tier {currentTier} player.
          </span>
        ) : (
          <span style={{ color: '#ccc' }}>
            Waiting for <strong style={{ color: '#FFD700' }}>{currentPickTeam?.name || '...'}</strong> to pick
            &nbsp;(Round {currentRound}, Tier {currentTier})
          </span>
        )}
      </div>

      {/* Pick error */}
      {pickError && (
        <div style={{ color: '#ff6b6b', backgroundColor: '#3a1a1a', border: '1px solid #ff6b6b',
          borderRadius: '6px', padding: '10px 16px', marginBottom: '16px' }}>
          {pickError}
        </div>
      )}

      {/* Available players for current tier (shown to everyone, clickable only on your turn) */}
      {isMyTurn && availablePlayers.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#FFD700', marginBottom: '12px' }}>
            {TIER_LABELS[tierIdx] || `Tier ${currentTier}`}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {availablePlayers.map(player => (
              <button
                key={player.name}
                disabled={picking}
                onClick={() => submitPick(player.name)}
                style={{
                  padding: '12px 18px',
                  backgroundColor: picking ? '#444' : '#2a5c2a',
                  color: '#fff',
                  border: '1px solid #4CAF50',
                  borderRadius: '6px',
                  cursor: picking ? 'not-allowed' : 'pointer',
                  fontSize: '0.95em',
                  transition: 'background 0.15s',
                  minWidth: '160px',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (!picking) e.currentTarget.style.backgroundColor = '#3a7c3a'; }}
                onMouseLeave={e => { if (!picking) e.currentTarget.style.backgroundColor = '#2a5c2a'; }}
              >
                <div style={{ fontWeight: 'bold' }}>{player.name}</div>
                {player.averageOdds != null && (
                  <div style={{ fontSize: '0.8em', color: '#a5d6a7', marginTop: '2px' }}>
                    Avg odds: {player.averageOdds > 0 ? `+${player.averageOdds}` : player.averageOdds}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Snake draft order panel */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#ccc', marginBottom: '10px', fontSize: '1em' }}>Draft Order</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '320px' }}>
          {sortedTeams.map(team => {
            const isCurrent = currentPickTeam?.ownerUid === team.ownerUid;
            const isMe = user && team.ownerUid === user.uid;
            return (
              <div key={team.ownerUid || team.name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: isCurrent ? '#2d4a1a' : '#2a2a2a',
                border: `1px solid ${isCurrent ? '#4CAF50' : '#444'}`,
                fontWeight: isCurrent ? 'bold' : 'normal',
              }}>
                <span>
                  {team.draftOrder}. {team.name}{isMe ? ' (you)' : ''}
                </span>
                <span style={{ fontSize: '0.85em', color: '#aaa' }}>
                  {(team.golferNames || []).length} / 4
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent picks list */}
      {draftPicks.length > 0 && (
        <div>
          <h3 style={{ color: '#ccc', marginBottom: '10px', fontSize: '1em' }}>Recent Picks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[...draftPicks].reverse().slice(0, 8).map(pick => (
              <div key={pick.pickNumber} style={{
                display: 'flex', gap: '12px',
                padding: '6px 10px', borderRadius: '4px',
                backgroundColor: '#232323', fontSize: '0.9em',
              }}>
                <span style={{ color: '#888', minWidth: '28px' }}>#{pick.pickNumber}</span>
                <span style={{ color: '#FFD700', minWidth: '120px' }}>{pick.teamName}</span>
                <span>{pick.playerName}</span>
                {pick.isAutoPick && <span style={{ color: '#888', fontSize: '0.8em' }}>(auto)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftPicker;
