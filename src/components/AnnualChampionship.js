import React, { useState, useEffect } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';

const AnnualChampionship = ({ selectedYear }) => {
  const [annualData, setAnnualData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch annual championship data from backend
  useEffect(() => {
    const fetchAnnualChampionship = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`🏆 Annual Championship: Fetching data for year ${selectedYear}...`);
        const queryParams = new URLSearchParams({
          year: selectedYear,
          includeCurrent: 'true'
        });
        const response = await fetch(`${BACKEND_BASE_URL}/annual_championship?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch annual championship data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🏆 Annual Championship data received:', data);
        setAnnualData(data);
        
      } catch (error) {
        console.error('💥 Error fetching annual championship:', error);
        setError('Failed to load annual championship data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnualChampionship();
  }, [selectedYear]);

  const formatScore = (score) => {
    if (score === null || score === undefined) return '-';
    if (score === 0) return 'E';
    return score > 0 ? `+${score}` : score.toString();
  };

  const isLiveTournament = (tournament = {}) => {
    return tournament.isLive ||
      tournament.isInProgress ||
      tournament.status === 'live' ||
      tournament.scoreStatus === 'live' ||
      tournament.state === 'live';
  };

  const isLiveTeamScore = (teamTournament = {}, tournament = {}) => {
    return teamTournament.isLive ||
      teamTournament.isInProgress ||
      teamTournament.scoreStatus === 'live' ||
      isLiveTournament(tournament);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
        <p>Loading annual championship data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  const standings = annualData?.standings || [];
  const tournaments = annualData?.tournaments || [];
  const metadata = annualData?.metadata || {};
  const hasLiveTournament = tournaments.some(isLiveTournament);

  return (
    <div className="annual-championship">
      <div className="annual-header">
        <h2 className="annual-title">🏆 {selectedYear} Annual Golf Championship</h2>
      </div>

      {hasLiveTournament && (
        <div style={{
          marginBottom: '15px',
          padding: '10px 14px',
          backgroundColor: 'rgba(255, 152, 0, 0.12)',
          border: '1px solid rgba(255, 152, 0, 0.35)',
          borderRadius: '6px',
          color: '#ffd180',
          fontSize: '0.9rem'
        }}>
          Includes current live tournament scores. Live annual totals are provisional until the tournament is final.
        </div>
      )}

      {tournaments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
          <p>No completed tournaments found for {selectedYear}</p>
          {metadata.totalTournamentsFound > 0 ? (
            <div style={{ marginTop: '15px', fontSize: '0.9rem' }}>
              <p style={{ color: '#ff9800' }}>
                {metadata.totalTournamentsFound} tournament(s) found in database but none qualified yet.
              </p>
              {metadata.skippedTournaments?.length > 0 && (
                <div style={{ marginTop: '10px', textAlign: 'left', display: 'inline-block' }}>
                  <p style={{ color: '#888', marginBottom: '5px' }}>Skip reasons:</p>
                  {metadata.skippedTournaments.map((t, i) => (
                    <div key={i} style={{ 
                      padding: '6px 10px',
                      margin: '4px 0',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      color: '#bbb'
                    }}>
                      <strong>{t.name || t.id}</strong>: {t.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
              Create tournaments with completed drafts to see annual championship standings.
            </p>
          )}
        </div>
      ) : standings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
          <h3>Tournaments Found ({tournaments.length})</h3>
          <div style={{ marginBottom: '20px' }}>
            {tournaments.map((tournament, index) => (
              <div key={tournament.tournamentId} style={{ 
                padding: '10px', 
                margin: '5px 0',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '5px',
                border: tournament.teamResults?.length > 0 ? '1px solid #4caf50' : '1px solid #ff9800'
              }}>
                <strong>{tournament.name}</strong>
                <br />
                <span style={{ 
                  fontSize: '0.8rem', 
                  color: tournament.teamResults?.length > 0 ? '#4caf50' : '#ff9800' 
                }}>
                  {tournament.teamResults?.length > 0 ? 
                    `✅ ${tournament.teamResults.length} teams completed` : 
                    '⏳ Waiting for Tournament Results'
                  }
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.9rem' }}>
            Annual championship will show team standings once tournaments are officially complete.
          </p>
        </div>
      ) : (
        <>
          {/* Score-based standings table */}
          <div className="annual-table-container">
            <table className="annual-table">
              <thead>
                <tr>
                  <th>POS</th>
                  <th>TEAM</th>
                  {tournaments.map(tournament => (
                    <th key={tournament.tournamentId} className="tournament-column">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span>{tournament.name}</span>
                        {isLiveTournament(tournament) && (
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(248,113,113,0.15)',
                            border: '1px solid rgba(248,113,113,0.3)',
                            color: '#fca5a5',
                            letterSpacing: '0.04em'
                          }}>
                            LIVE
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="total-column">TOTAL SCORE</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, index) => (
                  <tr key={team.teamName} className="annual-team-row">
                    <td className="position-cell">{index + 1}</td>
                    <td className="team-name-cell">{team.teamName}</td>
                    {tournaments.map(tournament => {
                      const teamTournament = team.tournaments?.find(t => t.tournamentId === tournament.tournamentId);
                      return (
                        <td key={tournament.tournamentId} className="score-cell">
                          {teamTournament ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <span title={`Position: ${teamTournament.position}`}>
                                {formatScore(teamTournament.score)}
                              </span>
                              {isLiveTeamScore(teamTournament, tournament) && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  color: '#fca5a5',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em'
                                }}>
                                  Live
                                </span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                      );
                    })}
                    <td className="total-cell">
                      <strong>{formatScore(team.totalScore)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="annual-stats">
            <p>
              <strong>{metadata.tournamentCount || tournaments.length}</strong> tournaments completed • 
              <strong> {metadata.teamCount || standings.length}</strong> teams participating •
              <strong> {standings.reduce((total, team) => total + (team.tournaments?.length || 0), 0)}</strong> total team entries
            </p>
            <p style={{ fontSize: '0.9rem', color: '#888', marginTop: '10px' }}>
              Total score is the cumulative sum of tournament scores. Lower total scores are better.
              {hasLiveTournament && (
                <span> Live tournament scores are marked and remain provisional until the event is complete.</span>
              )}
              {metadata.calculatedAt && (
                <span> • Last updated: {new Date(metadata.calculatedAt).toLocaleString()}</span>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default AnnualChampionship;
