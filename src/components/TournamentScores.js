import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';

function TournamentScores({ tournamentId, tournamentName }) {
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!tournamentId) {
      setLeaderboardRows([]);
      setLoading(false);
      return;
    }

    const fetchPlayerScores = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/player_scores`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setLeaderboardRows(data.leaderboardRows || []);
        setIsLive(data.isInProgress || false);
        setIsComplete(data.isOfficiallyComplete || false);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerScores();
  }, [tournamentId]);

  const getRoundScore = (player, roundNum) => {
    if (player.rounds && Array.isArray(player.rounds)) {
      const round = player.rounds.find(r => {
        const id = r.roundId?.$numberInt ?? r.roundId;
        return parseInt(id) === roundNum;
      });
      if (round && round.scoreToPar !== undefined && round.scoreToPar !== null) {
        return round.scoreToPar;
      }
    }
    // Fall back to currentRoundScore if it matches this round
    const currentRound = player.currentRound?.$numberInt ?? player.currentRound;
    if (parseInt(currentRound) === roundNum && player.currentRoundScore != null) {
      return player.currentRoundScore;
    }
    return null;
  };

  const formatScore = (score) => {
    if (score === null || score === undefined || score === '') return '-';
    if (score === 'E') return 'E';
    const num = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(num)) return score;
    if (num === 0) return 'E';
    return num > 0 ? `+${num}` : `${num}`;
  };

  const scoreColor = (score) => {
    if (score === null || score === undefined || score === '' || score === '-') return undefined;
    const num = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(num) || num === 0) return undefined;
    return num < 0 ? '#4ade80' : '#f87171';
  };

  const totalColor = (total) => {
    if (!total || total === '-') return undefined;
    const raw = total.toString().replace('+', '');
    const num = parseFloat(raw);
    if (isNaN(num) || num === 0) return undefined;
    return num < 0 ? '#4ade80' : '#f87171';
  };

  // Determine which rounds have any scores at all (including in-progress rounds)
  const roundsWithData = useMemo(() => {
    const rounds = [false, false, false, false];
    leaderboardRows.forEach(p => {
      if (p.rounds) {
        p.rounds.forEach(r => {
          const id = parseInt(r.roundId?.$numberInt ?? r.roundId);
          if (id >= 1 && id <= 4 && r.scoreToPar !== null && r.scoreToPar !== undefined) {
            rounds[id - 1] = true;
          }
        });
      }
      // Also pick up the active in-progress round score
      const currentRoundNum = parseInt(p.currentRound?.$numberInt ?? p.currentRound);
      if (currentRoundNum >= 1 && currentRoundNum <= 4 && p.currentRoundScore != null) {
        rounds[currentRoundNum - 1] = true;
      }
    });
    return rounds;
  }, [leaderboardRows]);

  // Show THRU column only when the tournament is in-progress (not complete)
  // and at least one player hasn't finished
  const showThru = useMemo(() => {
    if (isComplete) return false;
    return leaderboardRows.some(p => p.thru && p.thru !== 'F');
  }, [isComplete, leaderboardRows]);

  const renderRoundCell = (player, roundNum) => {
    const score = getRoundScore(player, roundNum);
    return (
      <td style={{ color: scoreColor(score) }}>
        {formatScore(score)}
      </td>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
        <p>Loading tournament scores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: '#f87171', textAlign: 'center', padding: '50px' }}>
        Error loading tournament scores: {error}
      </div>
    );
  }

  if (leaderboardRows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
        <p>No tournament scores available yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Title + status badge */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '20px 0 10px' }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
          {tournamentName || 'Tournament'} — Leaderboard
        </h2>
        {isLive && (
          <span
            className="status-value live"
            style={{ fontSize: '0.8rem', padding: '3px 10px', background: 'rgba(248,113,113,0.15)', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.3)' }}
          >
            ● Live
          </span>
        )}
        {isComplete && (
          <span
            className="status-value complete"
            style={{ fontSize: '0.8rem', padding: '3px 10px', background: 'rgba(74,222,128,0.15)', borderRadius: '6px', border: '1px solid rgba(74,222,128,0.3)' }}
          >
            ✓ Final
          </span>
        )}
      </div>

      <div className="leaderboard-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>POS</th>
              <th className="team-golfer-header">PLAYER</th>
              {roundsWithData[0] && <th>R1</th>}
              {roundsWithData[1] && <th>R2</th>}
              {roundsWithData[2] && <th>R3</th>}
              {roundsWithData[3] && <th>R4</th>}
              {showThru && <th>THRU</th>}
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardRows.map((player, index) => {
              const name = `${player.firstName || ''} ${player.lastName || ''}`.trim();
              const isCut = player.status?.toLowerCase() === 'cut';
              return (
                <tr
                  key={player.playerId || index}
                  style={{ opacity: isCut ? 0.6 : 1 }}
                >
                  <td>{player.position || '-'}</td>
                  <td className="golfer-name-cell" style={{ textAlign: 'left', paddingLeft: '12px' }}>
                    {name}
                    {isCut && (
                      <span style={{ color: '#f87171', marginLeft: 6, fontSize: '0.8em' }}>(CUT)</span>
                    )}
                  </td>
                  {roundsWithData[0] && renderRoundCell(player, 1)}
                  {roundsWithData[1] && renderRoundCell(player, 2)}
                  {roundsWithData[2] && renderRoundCell(player, 3)}
                  {roundsWithData[3] && renderRoundCell(player, 4)}
                  {showThru && <td>{player.thru || '-'}</td>}
                  <td style={{ fontWeight: 'bold', color: totalColor(player.total) }}>
                    {player.total === 'E' || player.total === '0' || player.total === 0
                      ? 'E'
                      : player.total || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TournamentScores;
