// src/App.js
import React, { useState, useCallback, useMemo } from "react"; // Add useMemo
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

// Helper to parse numeric scores for sorting (needed here too)
const parseNumericScore = (scoreStr) => {
    if (scoreStr === "E" || scoreStr === "e" || scoreStr === null || scoreStr === undefined || scoreStr === "") {
      return 0;
    }
    const num = parseFloat(scoreStr);
    return isNaN(num) ? null : num;
};


function App() {
  // Fetch raw data (now it's called 'rawData') from the hook
  const { rawData, loading, error } = useGolfLeaderboard();

  // State for sorting (managed locally in App.js)
  const [sortColumn, setSortColumn] = useState('total'); // Default sort by total
  const [sortDirection, setSortDirection] = useState('asc'); // Default ascending

  // Memoize the sorting logic so it only re-runs when rawData, sortColumn, or sortDirection change
  const leaderboardData = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    // Create a mutable copy to sort
    const sortableData = [...rawData];

    sortableData.sort((a, b) => {
      const valA = parseNumericScore(a[sortColumn]);
      const valB = parseNumericScore(b[sortColumn]);

      // Handle nulls: nulls go to the end
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      // For golf, lower score is better (ascending).
      // If sorting 'asc', A-B. If sorting 'desc', B-A.
      const comparison = valA - valB;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Assign positions after sorting
    sortableData.forEach((team, idx) => {
      team.position = idx + 1; // Assign new position after sorting
    });

    return sortableData;
  }, [rawData, sortColumn, sortDirection]); // Dependencies for useMemo


  const handleHeaderClick = useCallback((columnName) => {
    setSortDirection(prevDir => {
      if (columnName === sortColumn) {
        return prevDir === 'asc' ? 'desc' : 'asc';
      }
      return 'asc';
    });
    setSortColumn(columnName);
  }, [sortColumn]);

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
            {leaderboardData.map((team, index) => ( // Use leaderboardData (the sorted version)
              <React.Fragment key={`team-${team.team}`}> {/* Use team name for key if unique */}
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
                  <tr key={`golfer-${team.team}-${golferIndex}`} className="golfer-row"> {/* Unique key for golfer */}
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