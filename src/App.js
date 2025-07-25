import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import { useGolfLeaderboard } from './useGolfLeaderboard';
import Setup from './components/Setup';
import DraftBoard from './components/DraftBoard';
import AnnualChampionship from './components/AnnualChampionship';
import { TOURNAMENTS_API_ENDPOINT, PLAYER_ODDS_API_ENDPOINT } from './apiConfig';

function App() {
  // Memoized helper function to format scores for display
  const formatScoreForDisplay = useMemo(() => {
    const cache = new Map();
    
    return (scoreObj) => {
      const cacheKey = JSON.stringify(scoreObj);
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      let result;
      
      // Show "-" for not started rounds (null, undefined, empty, or explicit notStarted)
      if (scoreObj && scoreObj.notStarted) {
        result = '-';
      } else if (scoreObj && typeof scoreObj === 'object' && scoreObj.hasOwnProperty('score')) {
        if (
          scoreObj.score === null ||
          scoreObj.score === undefined ||
          scoreObj.score === '' ||
          Number.isNaN(scoreObj.score)
        ) {
          result = '-';
        } else if (scoreObj.isLive) {
          if (scoreObj.score === 0) {
            result = <span style={{ fontWeight: 'bold', color: '#1565c0', fontVariantNumeric: 'tabular-nums' }}>E</span>;
          } else {
            result = (
              <span style={{ fontWeight: 'bold', color: '#1565c0', fontVariantNumeric: 'tabular-nums' }}>
                {scoreObj.score > 0 ? `+${scoreObj.score}` : scoreObj.score}
              </span>
            );
          }
        } else {
          if (scoreObj.score === 0) {
            result = 'E';
          } else {
            result = scoreObj.score > 0 ? `+${scoreObj.score}` : scoreObj.score.toString();
          }
        }
      } else {
        // Fallback for numbers (totals etc)
        if (scoreObj === null || scoreObj === undefined || scoreObj === '') {
          result = '-';
        } else if (scoreObj === 0) {
          result = 'E';
        } else if (scoreObj > 0) {
          result = `+${scoreObj}`;
        } else {
          result = scoreObj.toString();
        }
      }

      cache.set(cacheKey, result);
      return result;
    };
  }, []);

  const [showSetup, setShowSetup] = useState(false);
  const [showAnnualChampionship, setShowAnnualChampionship] = useState(false);
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

  // State for preloaded tournament data
  const [preloadedTournamentData, setPreloadedTournamentData] = useState({});

  // State for Draft Board data
  const [draftBoardPlayers, setDraftBoardPlayers] = useState([]);
  const [draftBoardLoading, setDraftBoardLoading] = useState(true);
  const [draftBoardError, setDraftBoardError] = useState(null);

  // State for teams and draft picks
  const [teams, setTeams] = useState([]);
  const [draftPicks, setDraftPicks] = useState([]);

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
          // Look for tournament with draft started but not complete (for draft board)
          if (status.IsDraftStarted && !status.IsDraftComplete) {
            return tournament.id;
          }
        }
      } catch (error) {
        console.log(`Could not check draft status for tournament ${tournament.id}`);
      }
    }
    return null;
  };
  
// Function to preload tournament data for faster switching
  const preloadTournamentData = useCallback(async (tournaments) => {
    const preloadedData = {};
    
    for (const tournament of tournaments) {
      try {
        // Check if tournament has completed draft
        const statusResponse = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${tournament.id}/draft_status`);
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          if (status.IsDraftComplete) {
            // Preload leaderboard data for completed tournaments
            const leaderboardResponse = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${tournament.id}/leaderboard`);
            if (leaderboardResponse.ok) {
              const leaderboardData = await leaderboardResponse.json();
              preloadedData[tournament.id] = {
                rawData: leaderboardData,
                loading: false,
                error: null,
                lastUpdated: Date.now()
              };
              console.log(`Preloaded data for tournament: ${tournament.name}`);
            }
          }
        }
      } catch (error) {
        console.log(`Could not preload data for tournament ${tournament.id}:`, error);
      }
    }
    
    setPreloadedTournamentData(preloadedData);
  }, []);

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
        
        // Preload leaderboard data for all completed tournaments
        preloadTournamentData(data);
      } catch (error) {
        console.error("Error fetching tournaments from backend:", error);
        setTournamentError("Failed to load tournaments.");
      } finally {
        setLoadingTournaments(false);
      }
    };
    fetchTournaments();
  }, [refreshTrigger, preloadTournamentData]);

  

  // Load teams for the selected tournament
  const loadTeams = useCallback(async () => {
    if (!selectedTournamentId) {
      setTeams([]);
      setDraftPicks([]);
      return;
    }
    try {
      const response = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${selectedTournamentId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tournamentData = await response.json();
      setTeams(tournamentData.teams || []);
      
      // Calculate draft picks from teams using snake draft pattern
      const allPicks = [];
      
      // Sort teams by draft order first
      const sortedTeams = [...(tournamentData.teams || [])]
        .filter(team => team.draftOrder !== null && team.draftOrder !== undefined)
        .sort((a, b) => a.draftOrder - b.draftOrder);
      
      if (sortedTeams.length === 0) {
        setDraftPicks([]);
        return;
      }
      
      // Determine maximum number of players per team to calculate rounds
      const maxPlayersPerTeam = Math.max(...sortedTeams.map(team => team.golferNames.length));
      
      // Build picks using snake draft pattern
      for (let round = 0; round < maxPlayersPerTeam; round++) {
        const isOddRound = (round % 2) === 0; // 0-indexed, so round 0 is "1st round" (odd)
        const teamsThisRound = isOddRound ? sortedTeams : [...sortedTeams].reverse();
        
        teamsThisRound.forEach(team => {
          if (team.golferNames[round]) { // Check if team has a player for this round
            allPicks.push({
              pickNumber: allPicks.length + 1,
              teamName: team.name,
              playerName: team.golferNames[round],
              draftOrder: team.draftOrder,
              round: round + 1
            });
          }
        });
      }
      
      setDraftPicks(allPicks);
    } catch (error) {
      console.error("Error loading teams:", error);
      setTeams([]);
      setDraftPicks([]);
    }
  }, [selectedTournamentId]);

  // Callback to trigger a refresh when teams are updated, a new tournament is created, or manual odds are updated
  const handleDataUpdated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setLeaderboardRefreshKey(prev => prev + 1);
    loadTeams(); // Reload teams when data is updated
  }, [loadTeams]);

  // Modify onClick for Show Leaderboard to update leaderboardRefreshKey
  const handleShowLeaderboardClick = () => {
    setShowSetup(false);
    setShowAnnualChampionship(false);
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

  // Use preloaded data if available and tournament has completed draft
  const effectiveRawData = useMemo(() => {
    const preloadedData = preloadedTournamentData[selectedTournamentId];
    if (preloadedData && draftStatus.IsDraftComplete) {
      return preloadedData.rawData;
    }
    return rawData;
  }, [preloadedTournamentData, selectedTournamentId, draftStatus.IsDraftComplete, rawData]);

  const effectiveLoading = useMemo(() => {
    const preloadedData = preloadedTournamentData[selectedTournamentId];
    if (preloadedData && draftStatus.IsDraftComplete) {
      return false; // Data is already loaded
    }
    return loading;
  }, [preloadedTournamentData, selectedTournamentId, draftStatus.IsDraftComplete, loading]);

  const effectiveError = useMemo(() => {
    const preloadedData = preloadedTournamentData[selectedTournamentId];
    if (preloadedData && draftStatus.IsDraftComplete) {
      return preloadedData.error;
    }
    return error;
  }, [preloadedTournamentData, selectedTournamentId, draftStatus.IsDraftComplete, error]);

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
    console.log('Fetching draft status for tournament:', selectedTournamentId);
    setDraftStatusLoading(true);
    try {
      // Fetch draft status
      const draftRes = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${selectedTournamentId}/draft_status`);
      if (!draftRes.ok) throw new Error('Failed to fetch draft status');
      const status = await draftRes.json();
      console.log('Draft status received:', status);
      setDraftStatus(status);
    } catch (error) {
      console.error('Error fetching draft status:', error);
      setDraftStatus({ IsDraftStarted: false, IsDraftLocked: false, IsDraftComplete: false });
    } finally {
      setDraftStatusLoading(false);
    }
  }, [selectedTournamentId]);

  useEffect(() => {
    fetchDraftStatus();
  }, [fetchDraftStatus]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

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
    if (!effectiveRawData || effectiveRawData.length === 0) return [];

    const sortableData = [...effectiveRawData];

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

  }, [effectiveRawData, sortColumn, sortDirection]);

  // Memoize the augmented draft board players
  const augmentedDraftBoardPlayers = useMemo(() => {
    if (!draftBoardPlayers || draftBoardPlayers.length === 0) {
      return [];
    }

    return draftBoardPlayers.map(player => {
      const teamName = selectedTeamGolfersMap[player.name];
      const draftPick = draftPicks.find(pick => pick.playerName === player.name);
      return {
        ...player,
        teamAssigned: teamName,
        teamColor: teamName ? teamColors[teamName] || '#FFCDD2' : null,
        pickNumber: draftPick ? draftPick.pickNumber : null
      };
    });
  }, [draftBoardPlayers, selectedTeamGolfersMap, teamColors, draftPicks]);

  // --- Determine what to show based on draft and tournament status ---
  const shouldShowDraftBoard = useMemo(() => {
    // Show draft board if:
    // 1. Draft has started 
    // 2. Draft is not complete
    return draftStatus.IsDraftStarted && 
           !draftStatus.IsDraftComplete;
  }, [draftStatus]);

  const shouldShowLeaderboard = useMemo(() => {
    // Show leaderboard if draft is complete
    return draftStatus.IsDraftComplete;
  }, [draftStatus.IsDraftComplete]);

  // --- Main Render Logic ---
  if (loadingTournaments) return <div>Loading tournaments...</div>;
  if (tournamentError) return <div style={{ color: 'red' }}>Error: {tournamentError}</div>;

  return (
    <div className="App">
      <header className="modern-header">
        <div className="header-container">
          {/* Logo/Brand Section */}
          <div className="brand-section">
            <div className="logo-container">
              <div className="wv-golf-logo">
                <span className="golf-icon">⛳</span>
              </div>
            </div>
            <div className="brand-text">
              <h1 className="app-title">Alumni Golf Tournament</h1>
              <p className="app-subtitle">West Virginia</p>
            </div>
          </div>

          {/* Tournament Selector Section */}
          <div className="tournament-section">
            <label htmlFor="tournament-select" className="tournament-label">
              Select Tournament
            </label>
            <div className="select-wrapper">
              <select
                id="tournament-select"
                className="modern-select"
                value={selectedTournamentId}
                onChange={(e) => {
                  const newTournamentId = e.target.value;
                  console.log('Tournament selection changed to:', newTournamentId);
                  setSelectedTournamentId(newTournamentId);
                  setLeaderboardRefreshKey(prev => prev + 1);
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
              <span className="select-arrow">▼</span>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="modern-nav">
            <button 
              className={`nav-button ${!selectedTournamentId ? 'disabled' : ''}`}
              onClick={handleShowLeaderboardClick} 
              disabled={!selectedTournamentId}
            >
              <span className="button-icon">📊</span>
              <span className="button-text">Leaderboard</span>
            </button>
            <button 
              className="nav-button"
              onClick={() => {
                setShowSetup(false);
                setShowAnnualChampionship(true);
              }}
            >
              <span className="button-icon">🏆</span>
              <span className="button-text">Annual Championship</span>
            </button>
            <button 
              className="nav-button"
              onClick={() => {
                setShowAnnualChampionship(false);
                setShowSetup(true);
              }}
            >
              
              <span className="button-icon">⚙️</span>
              <span className="button-text">Setup</span>
            </button>
          </nav>
        </div>

        {/* Tournament Status Bar */}
        {selectedTournamentId && (
          <div className="status-bar">
            <div className="status-container">
              <div className="status-item">
                <span className="status-label">Status:</span>
                <span className={`status-value ${draftStatus.IsDraftComplete ? 'complete' : draftStatus.IsDraftStarted ? 'active' : 'pending'}`}>
                  {draftStatus.IsDraftComplete ? 'Draft Complete' : 
                   draftStatus.IsDraftStarted ? 'Draft In Progress' : 'Draft Pending'}
                </span>
              </div>
              {draftStatus.IsDraftComplete && (
                <div className="status-item">
                  <span className="status-label">Tournament:</span>
                  <span className={`status-value ${isTournamentInProgress ? 'live' : 'upcoming'}`}>
                    {isTournamentInProgress ? 'Live' : 'Upcoming'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="main-content">
        {selectedTournamentId ? (
          showSetup ? (
            <Setup
              tournamentId={selectedTournamentId}
              onTournamentCreated={handleDataUpdated}
              onTeamsSaved={handleDataUpdated}
              tournamentOddsId={tournamentOddsId}
              isDraftStarted={draftStatus.IsDraftStarted}
              hasManualDraftOdds={hasManualDraftOdds}
              onDraftStarted={handleDataUpdated}
              onManualOddsUpdated={handleDataUpdated}
            />
          ) : showAnnualChampionship ? (
            <AnnualChampionship />
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
                teams={teams}
                draftPicks={draftPicks}
              />
            ) : shouldShowLeaderboard ? (
              (effectiveLoading || draftStatusLoading || !effectiveRawData) ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
                  <p>Loading leaderboard data...</p>
                </div>
              ) : effectiveError ? (
                <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>Error: {effectiveError}</div>
              ) : sortedLeaderboardData.length > 0 ? (
                <>
                  <div className="leaderboard-container">
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
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
                  <p>No leaderboard data available for this tournament.</p>
                </div>
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
        )) : (
          showSetup ? (
            <Setup
              tournamentId={null}
              onTournamentCreated={handleDataUpdated}
              onTeamsSaved={handleDataUpdated}
              tournamentOddsId={null}
              isDraftStarted={false}
              hasManualDraftOdds={false}
              onDraftStarted={handleDataUpdated}
              onManualOddsUpdated={handleDataUpdated}
            />
          ) : showAnnualChampionship ? (
            <AnnualChampionship />
          ) : (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              Please create or select a tournament to get started.
              <br /><br />
              <p style={{ color: '#ccc', fontSize: '0.9rem' }}>
                You can manage Global Teams in Setup or view the Annual Championship anytime using the buttons above.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;