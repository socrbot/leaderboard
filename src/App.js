// src/App.js
import React, { useState, useCallback } from "react"; // Add useCallback
import { useGolfLeaderboard } from "./useGolfLeaderboard";
import "./App.css";

// Helper to format scores for display (+X, -X, E for Even)
const formatScoreForDisplay = (score) => {
    if (score === null || score === undefined || isNaN(score)) {
        return "-";
    }
    if (score === 0) {
        return "E";
    }
    return score > 0 ? `+${score}` : `${score}`;
};

function App() {
  // Add state for sorting
  const [sortColumn, setSortColumn] = useState('total'); // Default sort by total
  const [sortDirection, setSortDirection] = useState('asc'); // Default ascending

  // Pass sorting parameters to the custom hook
  const { leaderboardData, loading, error } = useGolfLeaderboard(sortColumn, sortDirection);

  // Function to handle column header clicks
  const handleHeaderClick = useCallback((columnName) => {
    setSortDirection(prevDir => {
      // If clicking the same column, toggle direction
      if (columnName === sortColumn) {
        return prevDir === 'asc' ? 'desc' : 'asc';
      }
      // If clicking a new column, default to ascending
      return 'asc';
    });
    setSortColumn(columnName);
  }, [sortColumn]); // Dependency on sortColumn to re-create if it changes

  // Helper to display sort indicator
  const renderSortArrow = (columnName) => {
    if (sortColumn === columnName) {
      return sortDirection === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };


  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>WVU Alumni Leaderboard</h1>
        </header>
        <main>
          <p>Loading leaderboard data...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>WVU Alumni Leaderboard</h1>
		  <h1>PGA Championship</h1>
        </header>
        <main>
          <p style={{ color: 'red' }}>Error: {error}</p>
          <p>There was an issue fetching golf data. Please check your network or API key.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>WVU Alumni Leaderboard</h1>
		<h2>PGA Championship</h2>
      </header>
      <main>
        <table>
          <thead>
            <tr>
              <th>POS</th>
              <th>TEAM / GOLFER</th>
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
            {leaderboardData.map((team, index) => (
              <React.Fragment key={`team-${index}`}>
                {/* Team Row */}
                <tr className={`team-row team-${team.team.replace(/[^a-zA-Z0-9]/g, '')}`}>
                  <td>{team.position}</td>
                  <td>{team.team}</td>
                  <td className="total">{formatScoreForDisplay(team.total)}</td>
                  <td>{formatScoreForDisplay(team.r1)}</td>
                  <td>{formatScoreForDisplay(team.r2)}</td>
                  <td>{formatScoreForDisplay(team.r3)}</td>
                  <td>{formatScoreForDisplay(team.r4)}</td>
                </tr>
                {/* Golfer Sub-rows */}
                {team.golfers && team.golfers.map((golfer, golferIndex) => (
                  <tr key={`golfer-${index}-${golferIndex}`} className="golfer-row">
                    <td></td>
                    <td>{golfer.name}</td>
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
      </main>
    </div>
  );
}

export default App;