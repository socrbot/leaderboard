import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import { useGolfLeaderboard } from './useGolfLeaderboard';
import TeamManagement from './components/TeamManagement';
import DraftBoard from './components/DraftBoard';
import { TOURNAMENTS_API_ENDPOINT, PLAYER_ODDS_API_ENDPOINT } from './apiConfig';

// Helper function to format scores for display
const formatScoreForDisplay = (scoreObj) => {
  // Show "-" for not started rounds (null, undefined, empty, or explicit notStarted)
  if (scoreObj && scoreObj.notStarted) return '-';

  if (scoreObj && typeof scoreObj === 'object' && scoreObj.hasOwnProperty('score')) {
    if (
      scoreObj.score === null ||
      scoreObj.score === undefined ||
      scoreObj.score === '' ||
      Number.isNaN(scoreObj.score)
    ) {
      return '-';
    }
    // Show "E" for 0
    if (scoreObj.isLive) {
      if (scoreObj.score === 0) {
        return <span style={{ fontWeight: 'bold', color: '#1565c0', fontVariantNumeric: 'tabular-nums' }}>E</span>;
      }
      return (
        <span style={{ fontWeight: 'bold', color: '#1565c0', fontVariantNumeric: 'tabular-nums' }}>
          {scoreObj.score > 0 ? `+${scoreObj.score}` : scoreObj.score}
        </span>
      );
    } else {
      if (scoreObj.score === 0) return 'E';
      return scoreObj.score > 0 ? `+${scoreObj.score}` : scoreObj.score.toString();
    }
  }
  // Fallback for numbers (totals etc)
  if (scoreObj === null || scoreObj === undefined || scoreObj === '') {
    return '-';
  }
  if (scoreObj === 0) return 'E';
  if (scoreObj > 0) {
    return `+${scoreObj}`;
  }
  return scoreObj.toString();
};

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

  // State for Draft Board data
  const [draftBoardPlayers, setDraftBoardPlayers] = useState([]);
  const [draftBoardLoading, setDraftBoardLoading] = useState(true);
  const [draftBoardError, setDraftBoardError] = useState(null);

  // --- Draft Status State ---
  const [draftStatus, setDraftStatus] = useState({
    IsDraftStarted: false,
    IsDraftLocked: false,
    IsDraftComplete: false
  });
  const [draftStatusLoading, setDraftStatusLoading] = useState(true);

  // Helper function to find a tournament ready for draft board display
  const findDraftReadyTournament = async (tournaments) => {
    for (const tournament of tournaments) {
      try {
        const statusResponse = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${tournament.id}/draft_status`);
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          // Look for tournament with draft started, locked odds, but not complete
          if (status.IsDraftStarted && status.IsDraftLocked && !status.IsDraftComplete) {
            return tournament.id;
          }
        }
      } catch (error) {
        console.log(`Could not check draft status for tournament ${tournament.id}`);
      }
    }
    return null;
  };

  // Fetch available tournaments from your Flask Backend
  useEffect(() => {
    const fetchTournaments = async () => {
      setLoadingTournaments(true);
      setTournamentError(null);
      try {
        const response = await fetch(TOURNAMENTS_API_ENDPOINT);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTournaments(data);
        
        // Fixed default selection logic
        let defaultTournament = '';
        if (data.length > 0) {
          // First priority: Find tournament with draft started and has locked odds but not complete
          const draftReadyTournament = await findDraftReadyTournament(data);
          
          if (draftReadyTournament) {
            defaultTournament = draftReadyTournament;
          } else {
            // Fallback to most recent tournament
            defaultTournament = data[data.length - 1].id;
          }
        }
        setSelectedTournamentId(defaultTournament);
      } catch (error) {
        console.error("Error fetching tournaments from backend:", error);
        setTournamentError("Failed to load tournaments.");
      } finally {
        setLoadingTournaments(false);
      }
    };
    fetchTournaments();
  }, [refreshTrigger]); // Remove selectedTournamentId to avoid infinite loop

  // Callback to trigger a refresh when teams are updated, a new tournament is created, or manual odds are updated
  const handleDataUpdated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setLeaderboardRefreshKey(prev => prev + 1);
  }, []);

  // Modify onClick for Show Leaderboard to update leaderboardRefreshKey
  const handleShowLeaderboardClick = () => {
    setShowTeamManagement(false);
    setLeaderboardRefreshKey(prev => prev + 1);
  };

  // Pass leaderboardRefreshKey as the refreshDependency to useGolfLeaderboard
  const {
    rawData,
    loading,
    error,
    isTournamentInProgress,
    tournamentOddsId,
    selectedTeamGolfersMap,
    teamColors,
    isDraftStarted,
    hasManualDraftOdds
  } = useGolfLeaderboard(selectedTournamentId, leaderboardRefreshKey);

  // Effect to fetch Draft Board players directly in App.js
  useEffect(() => {
    const fetchPlayerOddsForDraftBoard = async () => {
      if (!selectedTournamentId || (!tournamentOddsId && !hasManualDraftOdds) || isTournamentInProgress) {
        setDraftBoardLoading(false);
        setDraftBoardPlayers([]);
        setDraftBoardError(null);
        return;
      }

      setDraftBoardLoading(true);
      setDraftBoardError(null);
      try {
        const response = await fetch(`${PLAYER_ODDS_API_ENDPOINT}?oddsId=${tournamentOddsId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawOddsData = await response.json();
        const top40Players = rawOddsData.slice(0, 44);
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
  }, [selectedTournamentId, tournamentOddsId, isTournamentInProgress, leaderboardRefreshKey, isDraftStarted, hasManualDraftOdds]);

  // --- Fetch Draft Status ---
  const fetchDraftStatus = useCallback(async () => {
    if (!selectedTournamentId) {
      setDraftStatus({ IsDraftStarted: false, IsDraftLocked: false, IsDraftComplete: false });
      setDraftStatusLoading(false);
      return;
    }
    setDraftStatusLoading(true);
    try {
      // Fetch draft status
      const draftRes = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${selectedTournamentId}/draft_status`);
      if (!draftRes.ok) throw new Error('Failed to fetch draft status');
      const status = await draftRes.json();
      setDraftStatus(status);
    } catch (error) {
      setDraftStatus({ IsDraftStarted: false, IsDraftLocked: false, IsDraftComplete: false });
    } finally {
      setDraftStatusLoading(false);
    }
  }, [selectedTournamentId]);

  useEffect(() => {
    fetchDraftStatus();
  }, [fetchDraftStatus]);

  // Sorting Logic
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

  // Memoize the sorted leaderboard data
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

  // Memoize the augmented draft board players
  const augmentedDraftBoardPlayers = useMemo(() => {
    if (!draftBoardPlayers || draftBoardPlayers.length === 0) {
      return [];
    }

    return draftBoardPlayers.map(player => {
      const teamName = selectedTeamGolfersMap[player.name];
      return {
        ...player,
        teamAssigned: teamName,
        teamColor: teamName ? teamColors[teamName] || '#FFCDD2' : null
      };
    });
  }, [draftBoardPlayers, selectedTeamGolfersMap, teamColors]);

  // --- Determine what to show based on draft and tournament status ---
  const shouldShowDraftBoard = useMemo(() => {
    // Show draft board if:
    // 1. Draft has started and is locked (has odds available)
    // 2. Draft is not complete
    // 3. Tournament is not in progress yet
    return draftStatus.IsDraftStarted && 
           draftStatus.IsDraftLocked && 
           !draftStatus.IsDraftComplete &&
           !isTournamentInProgress;
  }, [draftStatus, isTournamentInProgress]);

  const shouldShowLeaderboard = useMemo(() => {
    // Show leaderboard if:
    // 1. Draft is complete, OR
    // 2. Tournament is in progress/over (has live scores)
    return draftStatus.IsDraftComplete || isTournamentInProgress;
  }, [draftStatus.IsDraftComplete, isTournamentInProgress]);

  // --- Main Render Logic ---
  if (loadingTournaments) return <div>Loading tournaments...</div>;
  if (tournamentError) return <div style={{ color: 'red' }}>Error: {tournamentError}</div>;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Alumni Golf Tournament</h1>
        {/* Tournament Selector */}
        <div>
          
          <select
            id="tournament-select"
            value={selectedTournamentId}
            onChange={(e) => {
              setSelectedTournamentId(e.target.value);
              setLeaderboardRefreshKey(prev => prev + 1);
              // Force refresh of all data when tournament changes
              setRefreshTrigger(prev => prev + 1);
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

      {selectedTournamentId ? (
        showTeamManagement ? (
          <TeamManagement
            tournamentId={selectedTournamentId}
            onTournamentCreated={handleDataUpdated}
            onTeamsSaved={handleDataUpdated}
            tournamentOddsId={tournamentOddsId}
            isDraftStarted={draftStatus.IsDraftStarted}
            hasManualDraftOdds={hasManualDraftOdds}
            onDraftStarted={handleDataUpdated}
            onManualOddsUpdated={handleDataUpdated}
          />
        ) : (
          <main>
            {draftStatusLoading ? (
              <div>Loading draft status...</div>
            ) : shouldShowDraftBoard ? (
              <DraftBoard
                topPlayers={augmentedDraftBoardPlayers}
                loading={draftBoardLoading}
                error={draftBoardError}
                oddsId={tournamentOddsId}
                hasManualDraftOdds={hasManualDraftOdds}
              />
            ) : shouldShowLeaderboard ? (
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
                    {sortedLeaderboardData.map((team) => (
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
                            <td className="golfer-name-cell">
                              {golfer.name}
                              {golfer.status && golfer.status.toUpperCase() === 'CUT' && (
                                <span style={{ color: 'red', marginLeft: 6 }}>(CUT)</span>
                              )}
                            </td>
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
                <div>No leaderboard data available.</div>
              )
            ) : draftStatus.IsDraftStarted && !draftStatus.IsDraftLocked ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h3>Draft Started - Waiting for Odds to be Locked</h3>
                <p>The draft has been started but odds are not yet locked. Please lock the odds to view the draft board.</p>
              </div>
            ) : (
              <div>No tournament data available. Tournament may not have started yet.</div>
            )}
          </main>
        )
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Please create or select a tournament to get started.
          <br /><br />
        </div>
      )}
    </div>
  );
}

export default App;