import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import { useGolfLeaderboard } from './useGolfLeaderboard';
import TeamManagement from './components/TeamManagement';

// Helper function to format scores for display (already in App.js)
const formatScoreForDisplay = (score) => {
  if (score === null || score === undefined || score === '') {
    return '-';
  }
  if (score > 0) {
    return `+${score}`;
  }
  return score.toString();
};

function App() {
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [tournamentError, setTournamentError] = useState(null);

  // Sorting state (already in App.js)
  const [sortColumn, setSortColumn] = useState('total');
  const [sortDirection, setSortDirection] = useState('asc');

  // New state to trigger re-fetch of tournaments/leaderboard data
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // New state specifically for refreshing the leaderboard data when navigating back
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);


  // Fetch available tournaments from your Flask Backend
  useEffect(() => {
    const fetchTournaments = async () => {
      setLoadingTournaments(true);
      setTournamentError(null);
      try {
        const response = await fetch("http://127.0.0.1:8080/api/tournaments");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTournaments(data);
        if (data.length > 0 && !selectedTournamentId) {
          setSelectedTournamentId(data[0].id);
        } else if (data.length > 0 && selectedTournamentId && !data.find(t => t.id === selectedTournamentId)) {
          setSelectedTournamentId(data[0].id);
        } else if (data.length === 0) {
          setSelectedTournamentId('');
        }
      } catch (error) {
        console.error("Error fetching tournaments from backend:", error);
        setTournamentError("Failed to load tournaments.");
      } finally {
        setLoadingTournaments(false);
      }
    };
    fetchTournaments();
  }, [refreshTrigger, selectedTournamentId]);

  // Callback to trigger a refresh when teams are updated or a new tournament is created
  const handleDataUpdated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1); // Increment to trigger App.js tournament list re-fetch
  }, []);

  // Modify onClick for Show Leaderboard to update leaderboardRefreshKey
  const handleShowLeaderboardClick = () => {
    setShowTeamManagement(false);
    setLeaderboardRefreshKey(prev => prev + 1); // Increment to force useGolfLeaderboard to re-fetch
  };

  // Pass leaderboardRefreshKey as the refreshDependency to useGolfLeaderboard
  const { rawData, loading, error } = useGolfLeaderboard(selectedTournamentId, leaderboardRefreshKey);

  // Sorting Logic (already in App.js)
  const handleHeaderClick = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortArrow = (column) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  // Memoize the sorted leaderboard data (already in App.js)
  const sortedLeaderboardData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    const sortableData = [...rawData];

    sortableData.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return sortableData.map((team, index) => ({
      ...team,
      position: index + 1
    }));

  }, [rawData, sortColumn, sortDirection]);


  if (loadingTournaments) return <div>Loading tournaments...</div>;
  if (tournamentError) return <div style={{ color: 'red' }}>Error: {tournamentError}</div>;
  if (loading) return <div>Loading leaderboard data...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Alumni Golf Tournament Leaderboard</h1>

        {/* Tournament Selector */}
        <div>
          <label htmlFor="tournament-select">Select Tournament: </label>
          <select
            id="tournament-select"
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
          >
            {tournaments.length === 0 ? (
              <option value="">No Tournaments Available</option>
            ) : (
              tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Navigation Buttons */}
        <nav style={{ margin: '10px 0' }}>
          <button onClick={handleShowLeaderboardClick} disabled={!selectedTournamentId}> {/* Modified onClick */}
            Show Leaderboard
          </button>
          <button onClick={() => setShowTeamManagement(true)} disabled={!selectedTournamentId}>
            Manage Teams
          </button>
        </nav>
      </header>

      {/* Conditional Rendering of Components */}
      {selectedTournamentId ? (
        showTeamManagement ? (
          <TeamManagement
            tournamentId={selectedTournamentId}
            onTournamentCreated={handleDataUpdated}
            onTeamsSaved={handleDataUpdated}
          />
        ) : (
          <main>
            {sortedLeaderboardData.length > 0 ? (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>POS</th>
                    <th className="team-golfer-header">TEAM / GOLFER</th>
                    <th onClick={() => handleHeaderClick('total')} className="sortable-header">
                      TOTAL{renderSortArrow('total')}
                    </th>
                    <th onClick={() => handleHeaderClick('r1')} className="sortable-header">
                      R1{renderSortArrow('r1')}
                    </th>
                    <th onClick={() => handleHeaderClick('r2')} className="sortable-header">
                      R2{renderSortArrow('r2')}
                    </th>
                    <th onClick={() => handleHeaderClick('r3')} className="sortable-header">
                      R3{renderSortArrow('r3')}
                    </th>
                    <th onClick={() => handleHeaderClick('r4')} className="sortable-header">
                      R4{renderSortArrow('r4')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaderboardData.map((team, teamIndex) => (
                    <React.Fragment key={`team-${team.team}`}>
                      {/* Team Row */}
                      <tr className={`team-row team-${team.team.replace(/[^a-zA-Z0-9]/g, '')}`}>
                        <td>{team.position}</td>
                        <td className="team-name-cell">{team.team}</td>
                        <td className="total-cell">{formatScoreForDisplay(team.total)}</td>
                        <td>{formatScoreForDisplay(team.r1)}</td>
                        <td>{formatScoreForDisplay(team.r2)}</td>
                        <td>{formatScoreForDisplay(team.r3)}</td>
                        <td>{formatScoreForDisplay(team.r4)}</td>
                      </tr>
                      {/* Golfer Sub-rows */}
                      {team.golfers && team.golfers.map((golfer, golferIndex) => (
                        <tr key={`golfer-${team.team}-${golferIndex}`} className="golfer-row">
                          <td></td>
                          <td className="golfer-name-cell">{golfer.name}</td>
                          <td></td>
                          <td>{formatScoreForDisplay(golfer.r1)}</td>
                          <td>{formatScoreForDisplay(golfer.r2)}</td>
                          <td>{formatScoreForDisplay(golfer.r3)}</td>
                          <td>{formatScoreForDisplay(golfer.r4)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <div>No team data available for this tournament. Select another or go to Manage Teams to assign players.</div>
            )}
          </main>
        )
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Please create or select a tournament to get started.
          <br/><br/>
        </div>
      )}
    </div>
  );
}

export default App;