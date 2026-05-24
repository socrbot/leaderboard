import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './App.css';
import { useGolfLeaderboard } from './useGolfLeaderboard';
import Setup from './components/Setup';
import DraftBoard from './components/DraftBoard';
import DraftPicker from './components/DraftPicker';
import AnnualChampionship from './components/AnnualChampionship';
import TournamentScores from './components/TournamentScores';
import JoinLeague from './components/JoinLeague';
import UserSettings from './components/UserSettings';
import LandingPage from './components/LandingPage';
import { useAuth } from './contexts/AuthContext';
import { TOURNAMENTS_API_ENDPOINT, PLAYER_ODDS_API_ENDPOINT, LEAGUES_API_ENDPOINT } from './apiConfig';

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

  const { user, userData, signOut, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const isAdmin = userData?.role === 'admin';
  // Active league: starts from user's first leagueId, admin can switch via LeagueManagement
  const [activeLeagueId, setActiveLeagueId] = useState(null);
  const [activeLeagueName, setActiveLeagueName] = useState(null);
  useEffect(() => {
    if (activeLeagueId === null && userData?.leagueIds?.[0]) {
      setActiveLeagueId(userData.leagueIds[0]);
    }
  }, [userData, activeLeagueId]);
  // Fetch league name whenever activeLeagueId changes
  useEffect(() => {
    if (!activeLeagueId) { setActiveLeagueName(null); return; }
    fetch(`${LEAGUES_API_ENDPOINT}/${activeLeagueId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setActiveLeagueName(d?.name || null))
      .catch(() => setActiveLeagueName(null));
  }, [activeLeagueId]);
  const [pendingSetup, setPendingSetup] = useState(false);

  const [showSetup, setShowSetup] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);

  // After sign-in: clear pending state and stay on current non-setup view.
  useEffect(() => {
    if (pendingSetup && user && userData !== null) {
      setPendingSetup(false);
      setShowSetup(false);
    }
  }, [isAdmin, pendingSetup, user, userData]);
  const [showAnnualChampionship, setShowAnnualChampionship] = useState(false);
  const [showTournamentScores, setShowTournamentScores] = useState(false);
  const [setupActiveTab, setSetupActiveTab] = useState('league');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState([]);
  const [showAnnualYearPicker, setShowAnnualYearPicker] = useState(false);
  const annualYearPickerRef = useRef(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [tournamentError, setTournamentError] = useState(null);
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const pickerRef = useRef(null);

  // Sorting state
  const [sortColumn, setSortColumn] = useState('total');
  const [sortDirection, setSortDirection] = useState('asc');
  const [expandedTeams, setExpandedTeams] = useState({});

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
    IsDraftComplete: false,
    numTeams: 0,
    draftPicks: [],
    teams: [],
    currentPickTeam: null,
    currentRound: null,
    currentTier: null,
    DraftLockedOdds: [],
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
                rawData: leaderboardData.teamScores || leaderboardData.teams || leaderboardData,
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

  // Fetch all tournaments (all years) for the picker dropdown — scoped to active league
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const params = new URLSearchParams();
        if (activeLeagueId) params.set('leagueId', activeLeagueId);
        const url = `${TOURNAMENTS_API_ENDPOINT}${params.toString() ? `?${params}` : ''}`;
        const res = await fetch(url);
        if (res.ok) setAllTournaments(await res.json());
      } catch {}
    };
    fetchAll();
  }, [refreshTrigger, activeLeagueId]);

  // Close tournament picker when clicking outside
  useEffect(() => {
    if (!showTournamentPicker) return;
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowTournamentPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTournamentPicker]);

  // Close annual year picker when clicking outside
  useEffect(() => {
    if (!showAnnualYearPicker) return;
    const handleClickOutside = (e) => {
      if (annualYearPickerRef.current && !annualYearPickerRef.current.contains(e.target)) {
        setShowAnnualYearPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAnnualYearPicker]);

  // Tournaments grouped by year (newest first) for the picker
  const tournamentsByYear = useMemo(() => {
    const grouped = {};
    allTournaments.forEach(t => {
      const y = t.year || 'Unknown';
      if (!grouped[y]) grouped[y] = [];
      grouped[y].push(t);
    });
    return Object.entries(grouped).sort(([a], [b]) => Number(b) - Number(a));
  }, [allTournaments]);

  // Fetch available years (to default selectedYear to the most recent)
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const response = await fetch(`${TOURNAMENTS_API_ENDPOINT}/years`);
        if (response.ok) {
          const years = await response.json();
          setAvailableYears(years);
          // If current selectedYear isn't in the list, default to the most recent year
          if (years.length > 0 && !years.includes(selectedYear)) {
            setSelectedYear(years[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching tournament years:', error);
      }
    };
    fetchYears();
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch available tournaments from your Flask Backend (filtered by year)
  useEffect(() => {
    const fetchTournaments = async () => {
      setLoadingTournaments(true);
      setTournamentError(null);
      try {
        const params = new URLSearchParams();
        if (selectedYear) params.set('year', selectedYear);
        if (activeLeagueId) params.set('leagueId', activeLeagueId);
        const url = `${TOURNAMENTS_API_ENDPOINT}${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url);
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
  }, [refreshTrigger, selectedYear, activeLeagueId, preloadTournamentData]);

  

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
    setShowTournamentScores(false);
    setShowUserSettings(false);
    setLeaderboardRefreshKey(prev => prev + 1);
  };

  // Pass leaderboardRefreshKey as the refreshDependency to useGolfLeaderboard
  const {
    rawData,
    loading,
    error,
    isTournamentInProgress,
    isTournamentOver,
    tournamentOddsId,
    selectedTeamGolfersMap,
    teamColors,
    isDraftStarted,
    hasManualDraftOdds,
    tournamentInfo
  } = useGolfLeaderboard(selectedTournamentId, leaderboardRefreshKey);

  // Use preloaded data if available, tournament has completed draft, and tournament is NOT currently in progress.
  // When a tournament is still in progress (e.g. Round 1 of the Masters is live), always use fresh
  // live data so that score updates are reflected immediately rather than serving stale cached data.
  const effectiveRawData = useMemo(() => {
    const preloadedData = preloadedTournamentData[selectedTournamentId];
    if (preloadedData && draftStatus.IsDraftComplete && !isTournamentInProgress) {
      return preloadedData.rawData || [];
    }
    return rawData || [];
  }, [preloadedTournamentData, selectedTournamentId, draftStatus.IsDraftComplete, isTournamentInProgress, rawData]);

  const effectiveLoading = useMemo(() => {
    const preloadedData = preloadedTournamentData[selectedTournamentId];
    if (preloadedData && draftStatus.IsDraftComplete && !isTournamentInProgress) {
      return false; // Data is already loaded
    }
    return loading;
  }, [preloadedTournamentData, selectedTournamentId, draftStatus.IsDraftComplete, isTournamentInProgress, loading]);

  const effectiveError = useMemo(() => {
    const preloadedData = preloadedTournamentData[selectedTournamentId];
    if (preloadedData && draftStatus.IsDraftComplete && !isTournamentInProgress) {
      return preloadedData.error;
    }
    return error;
  }, [preloadedTournamentData, selectedTournamentId, draftStatus.IsDraftComplete, isTournamentInProgress, error]);

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
      setDraftStatus({ IsDraftStarted: false, IsDraftLocked: false, IsDraftComplete: false,
        numTeams: 0, draftPicks: [], teams: [], currentPickTeam: null, currentRound: null,
        currentTier: null, DraftLockedOdds: [] });
      setDraftStatusLoading(false);
      return;
    }
    try {
      const draftRes = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${selectedTournamentId}/draft_status`);
      if (!draftRes.ok) throw new Error('Failed to fetch draft status');
      const status = await draftRes.json();
      setDraftStatus(prev => {
        if (JSON.stringify(prev) === JSON.stringify(status)) return prev;
        // Draft just completed — refresh leaderboard data to pick up golferNames
        if (!prev.IsDraftComplete && status.IsDraftComplete) {
          setLeaderboardRefreshKey(k => k + 1);
        }
        return status;
      });
    } catch (error) {
      console.error('Error fetching draft status:', error);
      setDraftStatus({ IsDraftStarted: false, IsDraftLocked: false, IsDraftComplete: false,
        numTeams: 0, draftPicks: [], teams: [], currentPickTeam: null, currentRound: null,
        currentTier: null, DraftLockedOdds: [] });
    } finally {
      setDraftStatusLoading(false);
    }
  }, [selectedTournamentId]);

  useEffect(() => {
    setDraftStatusLoading(true);
    fetchDraftStatus();
  }, [fetchDraftStatus]);

  // Poll draft status every 10 s while draft is locked or active (not yet complete)
  useEffect(() => {
    if (draftStatus.IsDraftComplete) return;
    if (!draftStatus.IsDraftLocked && !draftStatus.IsDraftStarted) return;
    const interval = setInterval(fetchDraftStatus, 10000);
    return () => clearInterval(interval);
  }, [draftStatus.IsDraftLocked, draftStatus.IsDraftStarted, draftStatus.IsDraftComplete, fetchDraftStatus]);

  // Sync teams + draftPicks state from enriched draftStatus (authoritative source)
  useEffect(() => {
    if (draftStatus.teams && draftStatus.teams.length > 0) {
      setTeams(draftStatus.teams);
    }
    if (Array.isArray(draftStatus.draftPicks)) {
      setDraftPicks(draftStatus.draftPicks);
    }
  }, [draftStatus]);

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
  const formatDateRange = (startDate, endDate) => {
    if (!startDate) return '';
    const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const start = fmt(startDate);
    if (!endDate) return start;
    const end = fmt(endDate);
    const year = new Date(endDate).getFullYear();
    return `${start} – ${end}, ${year}`;
  };
  const renderSortArrow = (column) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  // Memoize the sorted leaderboard data
  const sortedLeaderboardData = useMemo(() => {
    if (!effectiveRawData || !Array.isArray(effectiveRawData) || effectiveRawData.length === 0) return [];

    const sortableData = [...effectiveRawData];

    sortableData.sort((a, b) => {
      let aValue, bValue;
      
      // Handle different column names for backend compatibility
      if (sortColumn === 'total') {
        aValue = a.totalScore !== undefined ? a.totalScore : a.total;
        bValue = b.totalScore !== undefined ? b.totalScore : b.total;
      } else if (sortColumn.startsWith('r')) {
        // Handle round scores from roundDetails
        const roundKey = sortColumn;
        aValue = a.roundDetails?.[roundKey]?.score !== undefined ? a.roundDetails[roundKey].score : a[sortColumn];
        bValue = b.roundDetails?.[roundKey]?.score !== undefined ? b.roundDetails[roundKey].score : b[sortColumn];
      } else {
        aValue = a[sortColumn];
        bValue = b[sortColumn];
      }

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
      const draftPick = draftPicks.find(pick => pick.playerName === player.name);
      // Use live draftPicks as primary source during draft, fall back to hook data post-draft
      const teamName = (draftPick ? draftPick.teamName : null) || selectedTeamGolfersMap[player.name];
      return {
        ...player,
        teamAssigned: teamName,
        teamColor: teamName ? teamColors[teamName] || '#FFCDD2' : null,
        pickNumber: draftPick ? draftPick.pickNumber : null
      };
    });
  }, [draftBoardPlayers, selectedTeamGolfersMap, teamColors, draftPicks]);

  // Memoize the Team/Golfer table data for draft display
  const teamGolferTableData = useMemo(() => {
    if (!teams || teams.length === 0) {
      return [];
    }

    // Sort teams by draft order
    const sortedTeams = [...teams].sort((a, b) => {
      const orderA = a.draftOrder !== null && a.draftOrder !== undefined ? a.draftOrder : 999;
      const orderB = b.draftOrder !== null && b.draftOrder !== undefined ? b.draftOrder : 999;
      return orderA - orderB;
    });

    return sortedTeams.map((team, teamIndex) => {
      // Get the drafted golfers for this team
      const draftedGolfers = team.golferNames || [];
      
      // Create golfer rows (always 4 rows per team)
      const golferRows = [];
      for (let i = 0; i < 4; i++) {
        if (i < draftedGolfers.length) {
          // Drafted golfer
          golferRows.push({
            name: draftedGolfers[i],
            isDrafted: true
          });
        } else {
          // Blank row for undrafted slot
          golferRows.push({
            name: '- - -',
            isDrafted: false
          });
        }
      }

      return {
        team: team.name,
        position: team.draftOrder || (teamIndex + 1),
        golfers: golferRows,
        teamColor: teamColors[team.name] || '#FFCDD2'
      };
    });
  }, [teams, teamColors]);

  // --- Determine what to show based on draft and tournament status ---
  const shouldShowDraftBoard = useMemo(() => {
    // Show draft board (admin view) if odds are locked and draft is not complete
    return draftStatus.IsDraftLocked && !draftStatus.IsDraftComplete;
  }, [draftStatus]);

  // Show DraftPicker while draft is active (both members and admin)
  const shouldShowDraftPicker = useMemo(() => {
    return draftStatus.IsDraftStarted && !draftStatus.IsDraftComplete;
  }, [draftStatus]);

  const shouldShowLeaderboard = useMemo(() => {
    // Show leaderboard if draft is complete
    return draftStatus.IsDraftComplete;
  }, [draftStatus.IsDraftComplete]);

  // --- Main Render Logic ---

  // Gate: unauthenticated users see the landing page
  if (!user) {
    const handleLandingSignIn = async () => {
      setSigningIn(true);
      try {
        await signInWithGoogle();
      } finally {
        setSigningIn(false);
      }
    };
    return <LandingPage onSignIn={handleLandingSignIn} signingIn={signingIn} />;
  }

  if (loadingTournaments) return <div>Loading tournaments...</div>;
  if (tournamentError) return <div style={{ color: 'red' }}>Error: {tournamentError}</div>;

  // Gate: signed-in non-admin user who hasn't joined the league yet
  if (user && userData && !isAdmin && !userData.inLeague) {
    return <JoinLeague />;
  }

  return (
    <div className={`App${showSetup ? ' setup-active' : ''}`}>
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
              <p className="app-subtitle">{activeLeagueName || 'West Virginia'}</p>
            </div>
          </div>

          {/* Tournament Selector removed — now in the details bar picker */}

          {/* Navigation Section */}
          <nav className="modern-nav">
            <button
              className={`nav-link ${!selectedTournamentId ? 'disabled' : ''}`}
              onClick={() => { setShowAnnualYearPicker(false); handleShowLeaderboardClick(); }}
              disabled={!selectedTournamentId}
            >
              Leaderboard
            </button>
            <button
              className={`nav-link ${!selectedTournamentId ? 'disabled' : ''}`}
              onClick={() => {
                if (!selectedTournamentId) return;
                setShowSetup(false);
                setShowAnnualChampionship(false);
                setShowAnnualYearPicker(false);
                setShowTournamentScores(true);
                setShowUserSettings(false);
              }}
              disabled={!selectedTournamentId}
            >
              Tournament Scores
            </button>
            <button
              className="nav-link"
              onClick={() => {
                setShowSetup(false);
                setShowAnnualChampionship(true);
                setShowTournamentScores(false);
                setShowUserSettings(false);
              }}
            >
              Annual
            </button>
            {!user ? (
              <button
                className="nav-link"
                onClick={() => { setPendingSetup(true); signInWithGoogle(); }}
              >
                Sign In
              </button>
            ) : null}
          </nav>

          {/* User avatar — always visible; opens My Settings */}
          {user && (
            <button
              className={`user-avatar-btn${showUserSettings ? ' active' : ''}`}
              onClick={() => {
                setShowAnnualChampionship(false);
                setShowTournamentScores(false);
                setShowSetup(false);
                setShowUserSettings(s => !s);
              }}
              title={`Signed in as ${user.email}`}
              aria-label="My Settings"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Profile'} className="user-avatar-img" referrerPolicy="no-referrer" />
              ) : (
                <span className="user-avatar-initials">
                  {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          )}
        </div>
      </header>
      {/* Status bar: context-aware — Annual, Setup, or Tournament Details */}
      {showAnnualChampionship ? (
        <div className="status-bar">
          <p className="status-section-title">Annual Championship</p>
          <div className="tournament-picker" ref={annualYearPickerRef}>
            <button
              className="picker-trigger"
              onClick={() => setShowAnnualYearPicker(p => !p)}
              aria-expanded={showAnnualYearPicker}
            >
              <span className="status-line-name">{selectedYear}</span>
              <span className="picker-chevron">{showAnnualYearPicker ? '▴' : '▾'}</span>
            </button>
            {showAnnualYearPicker && (
              <div className="picker-dropdown">
                {(availableYears.length > 0 ? availableYears : [selectedYear]).map(yr => (
                  <button
                    key={yr}
                    className={`picker-item${yr === selectedYear ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedYear(yr);
                      setShowAnnualYearPicker(false);
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : showSetup ? (
        <>
          <div className="status-bar">
            <p className="status-section-title">Setup</p>
            <div className="tournament-picker" ref={pickerRef}>
              <button
                className="picker-trigger"
                onClick={() => setShowTournamentPicker(p => !p)}
                aria-expanded={showTournamentPicker}
              >
                <span className="status-line-name">
                  {(selectedTournamentId
                    ? (tournamentInfo?.Name || allTournaments.find(t => t.id === selectedTournamentId)?.name || tournaments.find(t => t.id === selectedTournamentId)?.name)
                    : 'No tournament selected') || 'No tournament selected'}
                </span>
                <span className="picker-chevron">{showTournamentPicker ? '▴' : '▾'}</span>
              </button>
              {showTournamentPicker && (
                <div className="picker-dropdown">
                  {tournamentsByYear.map(([year, ts]) => (
                    <div key={year} className="picker-year-group">
                      <p className="picker-year-label">{year}</p>
                      {ts.map(t => (
                        <button
                          key={t.id}
                          className={`picker-item${t.id === selectedTournamentId ? ' active' : ''}`}
                          onClick={() => {
                            setSelectedTournamentId(t.id);
                            setLeaderboardRefreshKey(prev => prev + 1);
                            setShowTournamentPicker(false);
                          }}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {tournamentInfo?.StartDate && (
              <p className="status-line">
                <span className="status-line-label">Dates:</span> {formatDateRange(tournamentInfo.StartDate, tournamentInfo.EndDate)}
              </p>
            )}
            {(tournamentInfo?.Venue || tournamentInfo?.Courses?.[0]?.Name) && (
              <p className="status-line">
                <span className="status-line-label">Course:</span> {tournamentInfo?.Venue || tournamentInfo?.Courses?.[0]?.Name}
              </p>
            )}
          </div>
          {/* Setup tab bar — desktop only; mobile uses second bottom bar */}
          <div className="setup-nav-bar">
            <button
              className={`setup-nav-link ${setupActiveTab === 'league' ? 'active' : ''}`}
              onClick={() => setSetupActiveTab('league')}
            >
              League
            </button>
            <button
              className={`setup-nav-link ${setupActiveTab === 'global-teams' ? 'active' : ''}`}
              onClick={() => setSetupActiveTab('global-teams')}
            >
              Manage Teams
            </button>
            <button
              className={`setup-nav-link ${setupActiveTab === 'tournament-creation' ? 'active' : ''}`}
              onClick={() => setSetupActiveTab('tournament-creation')}
            >
              Create Tournament
            </button>
            <button
              className={`setup-nav-link ${setupActiveTab === 'draft-management' ? 'active' : ''} ${!selectedTournamentId ? 'disabled' : ''}`}
              onClick={() => {
                if (!selectedTournamentId) return;
                setSetupActiveTab('draft-management');
              }}
              disabled={!selectedTournamentId}
            >
              Draft Management
            </button>
            <button
              className={`setup-nav-link ${setupActiveTab === 'my-profile' ? 'active' : ''}`}
              onClick={() => setSetupActiveTab('my-profile')}
            >
              My Profile
            </button>
            <button
              className="setup-nav-link setup-nav-signout"
              onClick={() => { setShowSetup(false); signOut(); }}
            >
              Sign Out
            </button>
          </div>
        </>
      ) : selectedTournamentId ? (
        <div className="status-bar">
          <p className="status-section-title">Tournament Details</p>
          <div className="tournament-picker" ref={pickerRef}>
            <button
              className="picker-trigger"
              onClick={() => setShowTournamentPicker(p => !p)}
              aria-expanded={showTournamentPicker}
            >
              <span className="status-line-name">
                {tournamentInfo?.Name || allTournaments.find(t => t.id === selectedTournamentId)?.name || tournaments.find(t => t.id === selectedTournamentId)?.name}
              </span>
              <span className="picker-chevron">{showTournamentPicker ? '▴' : '▾'}</span>
            </button>
            {showTournamentPicker && (
              <div className="picker-dropdown">
                {tournamentsByYear.map(([year, ts]) => (
                  <div key={year} className="picker-year-group">
                    <p className="picker-year-label">{year}</p>
                    {ts.map(t => (
                      <button
                        key={t.id}
                        className={`picker-item${t.id === selectedTournamentId ? ' active' : ''}`}
                        onClick={() => {
                          setSelectedTournamentId(t.id);
                          setLeaderboardRefreshKey(prev => prev + 1);
                          setShowTournamentPicker(false);
                        }}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          {tournamentInfo?.StartDate && (
            <p className="status-line">
              <span className="status-line-label">Dates:</span> {formatDateRange(tournamentInfo.StartDate, tournamentInfo.EndDate)}
            </p>
          )}
          {(tournamentInfo?.Venue || tournamentInfo?.Courses?.[0]?.Name) && (
            <p className="status-line">
              <span className="status-line-label">Course:</span> {tournamentInfo?.Venue || tournamentInfo?.Courses?.[0]?.Name}
            </p>
          )}
          <p className={`status-line status-line-badge ${
            isTournamentOver ? 'complete' :
            isTournamentInProgress ? 'live' :
            draftStatus.IsDraftComplete ? 'complete' :
            draftStatus.IsDraftStarted ? 'active' :
            draftStatus.IsDraftLocked ? 'active' : 'pending'
          }`}>
            {isTournamentInProgress && tournamentInfo?.CurrentRound
              ? `Round ${tournamentInfo.CurrentRound} · `
              : ''}
            {isTournamentOver ? 'Tournament Complete' :
             isTournamentInProgress ? 'Live' :
             draftStatus.IsDraftComplete ? 'Draft Complete' :
             draftStatus.IsDraftStarted ? 'Draft In Progress' :
             draftStatus.IsDraftLocked ? 'Odds Locked' : 'Created'}
          </p>
        </div>
      ) : null}

      <div className="main-content">
        {showUserSettings ? (
          <UserSettings activeLeagueId={activeLeagueId} onSignOut={() => { setShowUserSettings(false); signOut(); }} />
        ) : selectedTournamentId ? (
          showSetup ? (
            <Setup
              tournamentId={selectedTournamentId}
              selectedYear={selectedYear}
              activeLeagueId={activeLeagueId}
              onLeagueChange={setActiveLeagueId}
              onTournamentCreated={handleDataUpdated}
              onTeamsSaved={handleDataUpdated}
              tournamentOddsId={tournamentOddsId}
              isDraftStarted={draftStatus.IsDraftStarted}
              hasManualDraftOdds={hasManualDraftOdds}
              onDraftStarted={handleDataUpdated}
              onManualOddsUpdated={handleDataUpdated}
              onSignOut={() => { setShowSetup(false); signOut(); }}
              userEmail={user?.email}
              activeTab={setupActiveTab}
              setActiveTab={setSetupActiveTab}
            />
          ) : showAnnualChampionship ? (
            <AnnualChampionship selectedYear={selectedYear} leagueId={activeLeagueId} />
          ) : showTournamentScores ? (
            <TournamentScores
              tournamentId={selectedTournamentId}
              tournamentName={tournaments.find(t => t.id === selectedTournamentId)?.name}
            />
          ) : (
            <main>
            {draftStatusLoading ? (
              <div>Loading draft status...</div>
            ) : shouldShowDraftPicker ? (
              <DraftPicker
                tournamentId={selectedTournamentId}
                draftStatus={draftStatus}
                onDraftComplete={fetchDraftStatus}
                onStatusRefresh={fetchDraftStatus}
                topPlayers={augmentedDraftBoardPlayers}
                draftBoardLoading={draftBoardLoading}
                draftBoardError={draftBoardError}
                oddsId={tournamentOddsId}
                hasManualDraftOdds={hasManualDraftOdds}
                tournamentInfo={tournamentInfo}
                isAdmin={isAdmin}
              />
            ) : shouldShowDraftBoard ? (
              <>
                <DraftBoard
                  topPlayers={augmentedDraftBoardPlayers}
                  loading={draftBoardLoading}
                  error={draftBoardError}
                  oddsId={tournamentOddsId}
                  hasManualDraftOdds={hasManualDraftOdds}
                  teams={teams}
                  draftPicks={draftPicks}
                  isDraftStarted={draftStatus.IsDraftStarted}
                  tournamentInfo={tournamentInfo}
                />
                
                {/* Team/Golfer Table - Shows teams and their drafted golfers during draft */}
                {teamGolferTableData.length > 0 && (
                  <div style={{ marginTop: '40px' }}>
                    <h2 style={{ textAlign: 'center', color: '#fff', marginBottom: '20px', fontSize: '1.8rem' }}>Team Rosters</h2>
                    <div className="leaderboard-container">
                      <table className="leaderboard-table">
                        <thead>
                          <tr>
                            <th>TEAM / GOLFER</th>
                            <th>TOTAL</th>
                            <th>R1</th>
                            <th>R2</th>
                            <th>R3</th>
                            <th>R4</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamGolferTableData.map((team) => (
                            <React.Fragment key={`team-${team.team}`}>
                              <tr className={`team-row team-${team.team.replace(/[^a-zA-Z0-9]/g, '')}`}>
                                <td className="team-name-cell">{team.team}</td>
                                <td className="total-cell">-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                              </tr>
                              {team.golfers && team.golfers.map((golfer, golferIndex) => (
                                <tr 
                                  key={`golfer-${team.team}-${golferIndex}`} 
                                  className="golfer-row"
                                  style={{ opacity: golfer.isDrafted ? 1 : 0.4 }}
                                >
                                  <td className="golfer-name-cell">{golfer.name}</td>
                                  <td></td>
                                  <td>-</td>
                                  <td>-</td>
                                  <td>-</td>
                                  <td>-</td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
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
                      {sortedLeaderboardData.map((team, index) => {
                        const teamName = team.teamName || team.team || 'Unknown Team';
                        const teamTotal = team.totalScore !== undefined ? team.totalScore : team.total;
                        const golfers = team.players || team.golfers || [];
                        return (
                        <React.Fragment key={`team-${teamName}-${index}`}>
                          <tr
                            className={`team-row${expandedTeams[index] ? ' team-row-expanded' : ''}`}
                            onClick={() => setExpandedTeams(prev => ({ ...prev, [index]: !prev[index] }))}
                          >
                            <td className="team-name-cell">
                              <span className="team-expand-icon">{expandedTeams[index] ? '▾' : '▸'}</span>
                              {teamName}
                            </td>
                            <td className="total-cell">{formatScoreForDisplay(teamTotal)}</td>
                            <td>{formatScoreForDisplay(team.roundDetails?.r1?.score || team.r1)}</td>
                            <td>{formatScoreForDisplay(team.roundDetails?.r2?.score || team.r2)}</td>
                            <td>{formatScoreForDisplay(team.roundDetails?.r3?.score || team.r3)}</td>
                            <td>{formatScoreForDisplay(team.roundDetails?.r4?.score || team.r4)}</td>
                          </tr>
                          {expandedTeams[index] && golfers.map((golfer, golferIndex) => {
                            const isCut = golfer.status && golfer.status.toUpperCase() === 'CUT';
                            return (
                              <tr key={`golfer-${teamName}-${golferIndex}`} className={`golfer-row${isCut ? ' golfer-row-cut' : ''} ${golferIndex % 2 === 0 ? 'golfer-band-a' : 'golfer-band-b'}`}>
                                <td className="golfer-name-cell">
                                  <span className="golfer-name-text">{golfer.name}</span>
                                  {isCut
                                    ? <span className="golfer-cut-label">CUT</span>
                                    : golfer.thru && golfer.thru !== 'F' && golfer.thru !== ''
                                      ? <span className="golfer-status-label">Thru {golfer.thru}</span>
                                      : golfer.thru === 'F'
                                        ? <span className="golfer-status-label">Finished</span>
                                        : golfer.status && <span className="golfer-status-label">{golfer.status}</span>
                                  }
                                </td>
                                <td></td>
                                <td>{formatScoreForDisplay(golfer.r1?.score)}</td>
                                <td>{formatScoreForDisplay(golfer.r2?.score)}</td>
                                <td>{formatScoreForDisplay(golfer.r3?.score)}</td>
                                <td>{formatScoreForDisplay(golfer.r4?.score)}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                        );
                      })}
                    </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
                  <p>No leaderboard data available for this tournament.</p>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
                <p>Lock the draft odds in Setup to view the draft tiers.</p>
              </div>
            )}
          </main>
        )) : (
          showSetup ? (
            <Setup
              tournamentId={null}
              selectedYear={selectedYear}
              activeLeagueId={activeLeagueId}
              onLeagueChange={setActiveLeagueId}
              onTournamentCreated={handleDataUpdated}
              onTeamsSaved={handleDataUpdated}
              tournamentOddsId={null}
              isDraftStarted={false}
              hasManualDraftOdds={false}
              onDraftStarted={handleDataUpdated}
              onManualOddsUpdated={handleDataUpdated}
              onSignOut={() => { setShowSetup(false); signOut(); }}
              userEmail={user?.email}
              activeTab={setupActiveTab}
              setActiveTab={setSetupActiveTab}
            />
          ) : showAnnualChampionship ? (
            <AnnualChampionship selectedYear={selectedYear} leagueId={activeLeagueId} />
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
      <nav className="bottom-nav">
        <button
          className={`bottom-nav-link ${!showAnnualChampionship && !showSetup && !showTournamentScores ? 'active' : ''} ${!selectedTournamentId ? 'disabled' : ''}`}
          onClick={() => { setShowAnnualYearPicker(false); handleShowLeaderboardClick(); }}
          disabled={!selectedTournamentId}
        >
          Leaderboard
        </button>
        <button
          className={`bottom-nav-link ${showTournamentScores ? 'active' : ''} ${!selectedTournamentId ? 'disabled' : ''}`}
          onClick={() => {
            if (!selectedTournamentId) return;
            setShowSetup(false);
            setShowAnnualChampionship(false);
            setShowAnnualYearPicker(false);
            setShowTournamentScores(true);
            setShowUserSettings(false);
          }}
          disabled={!selectedTournamentId}
        >
          Scores
        </button>
        <button
          className={`bottom-nav-link ${showAnnualChampionship ? 'active' : ''}`}
          onClick={() => {
            setShowSetup(false);
            setShowAnnualChampionship(true);
            setShowTournamentScores(false);
            setShowUserSettings(false);
          }}
        >
          Annual
        </button>
        {!user ? (
          <button
            className="bottom-nav-link"
            onClick={() => { setPendingSetup(true); signInWithGoogle(); }}
          >
            Sign In
          </button>
        ) : null}
      </nav>

      {/* Second mobile bottom bar — setup tabs, only shown in Setup view */}
      {showSetup && (
        <nav className="bottom-nav setup-bottom-nav">
          <button
            className={`bottom-nav-link ${setupActiveTab === 'league' ? 'active' : ''}`}
            onClick={() => setSetupActiveTab('league')}
          >
            League
          </button>
          <button
            className={`bottom-nav-link ${setupActiveTab === 'global-teams' ? 'active' : ''}`}
            onClick={() => setSetupActiveTab('global-teams')}
          >
            Teams
          </button>
          <button
            className={`bottom-nav-link ${setupActiveTab === 'tournament-creation' ? 'active' : ''}`}
            onClick={() => setSetupActiveTab('tournament-creation')}
          >
            Create
          </button>
          <button
            className={`bottom-nav-link ${setupActiveTab === 'draft-management' ? 'active' : ''} ${!selectedTournamentId ? 'disabled' : ''}`}
            onClick={() => {
              if (!selectedTournamentId) return;
              setSetupActiveTab('draft-management');
            }}
            disabled={!selectedTournamentId}
          >
            Draft
          </button>
          <button
            className={`bottom-nav-link ${setupActiveTab === 'my-profile' ? 'active' : ''}`}
            onClick={() => setSetupActiveTab('my-profile')}
          >
            Profile
          </button>
          <button
            className="bottom-nav-link"
            onClick={() => { setShowSetup(false); signOut(); }}
          >
            Sign Out
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;