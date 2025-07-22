import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';

const AnnualChampionship = () => {
  const [annualData, setAnnualData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch annual championship data from backend
  useEffect(() => {
    const fetchAnnualChampionship = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`🏆 Annual Championship: Fetching data for year ${selectedYear}...`);
        const response = await fetch(`${BACKEND_BASE_URL}/annual_championship?year=${selectedYear}`);
        
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

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    // Only show 2025 and later years
    const startYear = Math.max(2025, currentYear);
    return [startYear];
  }, []);

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

  return (
    <div className="annual-championship">
      <div className="annual-header">
        <h2 className="annual-title">🏆 Annual Golf Championship</h2>
        <div className="year-selector">
          <label htmlFor="year-select">Year:</label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="modern-select"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
          <p>No tournaments found for {selectedYear}</p>
          <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
            Create tournaments with completed drafts to see annual championship standings.
          </p>
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
          {/* Points-based standings table */}
          <div className="annual-table-container">
            <table className="annual-table">
              <thead>
                <tr>
                  <th>POS</th>
                  <th>TEAM</th>
                  <th className="stats-column">WINS</th>
                  <th className="stats-column">TOP 3</th>
                  {tournaments.map(tournament => (
                    <th key={tournament.tournamentId} className="tournament-column">
                      {tournament.name}
                    </th>
                  ))}
                  <th className="total-column">TOTAL POINTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, index) => (
                  <tr key={team.teamName} className="annual-team-row">
                    <td className="position-cell">{index + 1}</td>
                    <td className="team-name-cell">{team.teamName}</td>
                    <td className="stats-cell">{team.wins || 0}</td>
                    <td className="stats-cell">{team.top3 || 0}</td>
                    {tournaments.map(tournament => {
                      const teamTournament = team.tournaments?.find(t => t.tournamentId === tournament.tournamentId);
                      return (
                        <td key={tournament.tournamentId} className="score-cell">
                          {teamTournament ? (
                            <span title={`Position: ${teamTournament.position}, Score: ${formatScore(teamTournament.score)}`}>
                              {teamTournament.points}pts
                              <br />
                              <small style={{ color: '#888' }}>({formatScore(teamTournament.score)})</small>
                            </span>
                          ) : '-'}
                        </td>
                      );
                    })}
                    <td className="total-cell">
                      <strong>{team.totalPoints}</strong>
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
              Points are awarded based on tournament position. Higher positions earn more points.
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
