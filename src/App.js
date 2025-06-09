// src/App.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import { useGolfLeaderboard } from './useGolfLeaderboard';
import TeamManagement from './components/TeamManagement';
import DraftBoard from './components/DraftBoard';

// Helper function to format scores for display
const formatScoreForDisplay = (score) => {
  if (score === null || score === undefined || score === '') {
    return '-';
  }
  if (score > 0) {
    return `+${score}`;
  }
  return score.toString();
};

const BACKEND_BASE_URL = "https://leaderboard-backend-628169335141.us-east1.run.app/api";
const PLAYER_ODDS_API_ENDPOINT = `${BACKEND_BASE_URL}/player_odds`;

function App() {
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [tournamentError, setTournamentError] = useState(null);

  // Sorting state
  const [sortColumn, setSortColumn] = useState('total');
  const [sortDirection, setSortDirection] = useState('asc');

  // State to trigger re-fetch of tournaments/leaderboard data
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // State specifically for refreshing the leaderboard data when navigating back
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);

  // State for Draft Board data (now fetched directly in App.js)
  const [draftBoardPlayers, setDraftBoardPlayers] = useState([]);
  const [draftBoardLoading, setDraftBoardLoading] = useState(true);
  const [draftBoardError, setDraftBoardError] = useState(null);


  // Fetch available tournaments from your Flask Backend
  useEffect(() => {
    const fetchTournaments = async () => {
      setLoadingTournaments(true);
      setTournamentError(null);
      try {
        const response = await fetch("https://leaderboard-backend-628169335141.us-east1.run.app/api/tournaments");
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

  // Callback to trigger a refresh when teams are updated, a new tournament is created, or manual odds are updated
  const handleDataUpdated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1); // Increment to trigger App.js tournament list re-fetch
    setLeaderboardRefreshKey(prev => prev + 1); // Also trigger leaderboard/draftboard refresh when data changes
  }, []);

  // Modify onClick for Show Leaderboard to update leaderboardRefreshKey
  const handleShowLeaderboardClick = () => {
    setShowTeamManagement(false); // Make sure we're not on TeamManagement
    setLeaderboardRefreshKey(prev => prev + 1); // Increment to force useGolfLeaderboard to re-fetch
  };


  // Pass leaderboardRefreshKey as the refreshDependency to useGolfLeaderboard
  // Remove teamAssignments from destructuring if it's not directly used in App.js beyond what the hook itself does.
  const { rawData, loading, error, isTournamentInProgress, tournamentOddsId, selectedTeamGolfersMap, teamColors, isDraftStarted, hasManualDraftOdds } = useGolfLeaderboard(selectedTournamentId, leaderboardRefreshKey); // NEW: Get hasManualDraftOdds

  // Effect to fetch Draft Board players directly in App.js
  useEffect(() => {
    const fetchPlayerOddsForDraftBoard = async () => {
      // Fetch player odds for draft board if:
      // 1. A tournament is selected AND
      // 2. Either tournamentOddsId is present (for live odds) OR hasManualDraftOdds is true (for manual odds)
      // 3. AND the tournament is NOT in progress (i.e., we are showing the draft board)
      if (!selectedTournamentId || (!tournamentOddsId && !hasManualDraftOdds) || isTournamentInProgress) {
        setDraftBoardLoading(false);
        setDraftBoardPlayers([]);
        setDraftBoardError(null);
        return;
      }

      setDraftBoardLoading(true);
      setDraftBoardError(null);
      try {
        // This endpoint's logic now handles manual vs. live odds automatically based on backend state
        const response = await fetch(`${PLAYER_ODDS_API_ENDPOINT}?oddsId=${tournamentOddsId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawOddsData = await response.json();
        // Assuming rawOddsData is already sorted by averageOdds from the backend
        const top40Players = rawOddsData.slice(0, 44); // Take top 44 based on provided data
        setDraftBoardPlayers(top40Players);
      } catch (error) {
        console.error("Error fetching player odds for draft board:", error);
        setDraftBoardError(`Failed to load player odds for draft board. Please check tournament Odds ID (${tournamentOddsId}) or manual odds.`);
        setDraftBoardPlayers([]);
      } finally {
        setDraftBoardLoading(false);
      }
    };

    fetchPlayerOddsForDraftBoard();
  }, [selectedTournamentId, tournamentOddsId, isTournamentInProgress, leaderboardRefreshKey, isDraftStarted, hasManualDraftOdds]); // ADDED hasManualDraftOdds as dependency


  // Sorting Logic (unchanged)
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

  // Memoize the sorted leaderboard data (unchanged)
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

  // Memoize the augmented draft board players (not filtered, but enhanced with team info) (unchanged)
  const augmentedDraftBoardPlayers = useMemo(() => {
    if (!draftBoardPlayers || draftBoardPlayers.length === 0) {
      return [];
    }

    return draftBoardPlayers.map(player => {
      const teamName = selectedTeamGolfersMap[player.name]; // Use map from useGolfLeaderboard
      return {
        ...player,
        teamAssigned: teamName, // Add this new property
        teamColor: teamName ? teamColors[teamName] || '#FFCDD2' : null // Use teamColors from useGolfLeaderboard
      };
    });
  }, [draftBoardPlayers, selectedTeamGolfersMap, teamColors]);


  if (loadingTournaments) return <div>Loading tournaments...</div>;
  if (tournamentError) return <div style={{ color: 'red' }}>Error: {tournamentError}</div>;
  // NOTE: Loading/error for leaderboard are handled below in conditional rendering


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
            onChange={(e) => {
                setSelectedTournamentId(e.target.value);
                setLeaderboardRefreshKey(prev => prev + 1); // Force refresh of data for the new tournament
            }}
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
          <button onClick={handleShowLeaderboardClick} disabled={!selectedTournamentId}>
            Leaderboard
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
            tournamentOddsId={tournamentOddsId}
            isDraftStarted={isDraftStarted}
            hasManualDraftOdds={hasManualDraftOdds} // NEW: Pass this prop
            onDraftStarted={handleDataUpdated}
            onManualOddsUpdated={handleDataUpdated} // NEW: Pass this callback
          />
        ) : ( // This block handles Leaderboard vs. Draft Board
          <main>
            {isTournamentInProgress ? (
              // Display Leaderboard
              loading ? (
                <div>Loading leaderboard data...</div>
              ) : error ? (
                <div style={{ color: 'red' }}>Error: {error}</div>
              ) : sortedLeaderboardData.length > 0 ? (
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
                        <tr className={`team-row team-${team.team.replace(/[^a-zA-Z0-9]/g, '')}`}>
                          <td>{team.position}</td>
                          <td className="team-name-cell">{team.team}</td>
                          <td className="total-cell">{formatScoreForDisplay(team.total)}</td>
                          <td>{formatScoreForDisplay(team.r1)}</td>
                          <td>{formatScoreForDisplay(team.r2)}</td>
                          <td>{formatScoreForDisplay(team.r3)}</td>
                          <td>{formatScoreForDisplay(team.r4)}</td>
                        </tr>
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
              )
            ) : ( // Display Draft Board if tournament is NOT in progress
              <DraftBoard
                topPlayers={augmentedDraftBoardPlayers}
                loading={draftBoardLoading}
                error={draftBoardError}
                oddsId={tournamentOddsId} // This will now fetch from manual odds if active
                hasManualDraftOdds={hasManualDraftOdds} // NEW: Pass this to DraftBoard to indicate source
              />
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