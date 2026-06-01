import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './App.css';
import { useGolfLeaderboard } from './useGolfLeaderboard';
import Setup from './components/Setup';
import DraftBoard from './components/DraftBoard';
import PreviewDraftBoard from './components/PreviewDraftBoard';
import DraftPicker from './components/DraftPicker';
import AnnualChampionship from './components/AnnualChampionship';
import TournamentScores from './components/TournamentScores';
import UserSettings from './components/UserSettings';
import LandingPage from './components/LandingPage';
import { useAuth } from './contexts/AuthContext';
import { TOURNAMENTS_API_ENDPOINT, PLAYER_ODDS_API_ENDPOINT, LEAGUES_API_ENDPOINT, BACKEND_BASE_URL } from './apiConfig';
import { authFetch } from './authFetch';
import { devLog, devError } from './utils/devLog';
import { Capacitor } from '@capacitor/core';
import { onForegroundPush, onPushAction } from './notifications/registerPush';

function App() {
  // Pure score formatter. Cheap enough that an internal cache is more overhead than savings
  // (the previous JSON.stringify key dominated CPU). Kept stable via useCallback so memoized
  // children that consume it as a prop don't churn.
  const formatScoreForDisplay = useCallback((scoreObj) => {
    // Show "-" for not started rounds (null, undefined, empty, or explicit notStarted)
    if (scoreObj && scoreObj.notStarted) return '-';
    if (scoreObj && typeof scoreObj === 'object' && Object.prototype.hasOwnProperty.call(scoreObj, 'score')) {
      if (
        scoreObj.score === null ||
        scoreObj.score === undefined ||
        scoreObj.score === '' ||
        Number.isNaN(scoreObj.score)
      ) {
        return '-';
      }
      if (scoreObj.isLive) {
        if (scoreObj.score === 0) {
          return <span style={{ fontWeight: 'bold', color: '#1565c0', fontVariantNumeric: 'tabular-nums' }}>E</span>;
        }
        return (
          <span style={{ fontWeight: 'bold', color: '#1565c0', fontVariantNumeric: 'tabular-nums' }}>
            {scoreObj.score > 0 ? `+${scoreObj.score}` : scoreObj.score}
          </span>
        );
      }
      if (scoreObj.score === 0) return 'E';
      return scoreObj.score > 0 ? `+${scoreObj.score}` : scoreObj.score.toString();
    }
    // Fallback for numbers (totals etc)
    if (scoreObj === null || scoreObj === undefined || scoreObj === '') return '-';
    if (scoreObj === 0) return 'E';
    if (scoreObj > 0) return `+${scoreObj}`;
    return scoreObj.toString();
  }, []);

  // Returns a colour for a score: green for negative (under par), red for positive
  // (over par), undefined for 0/E/missing. Mirrors the scores-table logic.
  const getScoreColor = useCallback((scoreObj) => {
    let raw;
    if (scoreObj && typeof scoreObj === 'object') {
      if (scoreObj.notStarted) return undefined;
      raw = scoreObj.score;
    } else {
      raw = scoreObj;
    }
    if (raw === null || raw === undefined || raw === '' || raw === '-' || raw === 'E') return undefined;
    const num = typeof raw === 'string' ? parseFloat(raw.replace('+', '')) : raw;
    if (Number.isNaN(num) || num === 0) return undefined;
    return num < 0 ? '#4ade80' : '#f87171';
  }, []);

  const { user, userData, signOut, signInWithGoogle, getIdToken, hadAuthSession } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  // Super-admin override (developer only — assigned manually in Firestore users/{uid}.role).
  const isSuperAdmin = userData?.role === 'admin';
  // Active league: starts from user's first leagueId; users can switch via the league picker.
  const [activeLeagueId, setActiveLeagueId] = useState(null);
  const [activeLeagueName, setActiveLeagueName] = useState(null);
  const [managedLeagues, setManagedLeagues] = useState([]);
  // Leagues the user owns (created). Drives admin UI gating per league.
  const [ownedLeagueIds, setOwnedLeagueIds] = useState(() => new Set());
  // Bumped to force re-fetch of leagues (e.g. after Create League).
  const [leaguesRefreshKey, setLeaguesRefreshKey] = useState(0);
  const refreshLeagues = useCallback(() => setLeaguesRefreshKey((k) => k + 1), []);
  // Tracks whether the membership-validated league list has been fetched at least once.
  // Used to gate the "no leagues" view so we don't flash it while leagues are still loading.
  const [managedLeaguesLoaded, setManagedLeaguesLoaded] = useState(false);
  const [showLeagueMenu, setShowLeagueMenu] = useState(false);
  const leaguePickerRef = useRef(null);
  const [foregroundPushBanner, setForegroundPushBanner] = useState(null);
  const [showPushDeniedHint, setShowPushDeniedHint] = useState(false);

  useEffect(() => {
    const loadLeagues = async () => {
      if (!user) {
        setManagedLeagues([]);
        setOwnedLeagueIds(new Set());
        setManagedLeaguesLoaded(false);
        return;
      }
      try {
        const token = await getIdToken();
        const headers = { Authorization: `Bearer ${token}` };

        const profileRes = await fetch(`${BACKEND_BASE_URL}/user/profile`, {
          headers,
        });

        let profileLeagues = [];
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          profileLeagues = Array.isArray(profileData?.leagues)
            ? profileData.leagues.map((league) => ({
                leagueId: league.leagueId,
                name: league.name || 'Unnamed League',
              }))
            : [];
        }

        const mineRes = await fetch(`${LEAGUES_API_ENDPOINT}/mine`, {
          headers,
        });

        let adminLeagues = [];
        if (mineRes.ok) {
          const leagues = await mineRes.json();
          adminLeagues = Array.isArray(leagues)
            ? leagues.map((league) => ({
                leagueId: league.leagueId,
                name: league.name || 'Unnamed League',
              }))
            : [];
        }

        const mergedMap = new Map();
        [...profileLeagues, ...adminLeagues].forEach((league) => {
          if (league?.leagueId) {
            mergedMap.set(league.leagueId, league);
          }
        });

        const normalized = Array.from(mergedMap.values());
        setManagedLeagues(normalized);
        setOwnedLeagueIds(new Set(adminLeagues.map((l) => l.leagueId).filter(Boolean)));
      } catch {
        setManagedLeagues([]);
        setOwnedLeagueIds(new Set());
      } finally {
        setManagedLeaguesLoaded(true);
      }
    };

    loadLeagues();
  }, [user, getIdToken, leaguesRefreshKey]);

  // Reconcile activeLeagueId against the membership-validated managedLeagues list.
  // activeLeagueId is ONLY ever set from this validated set — we never trust
  // userData.leagueIds directly, so users cannot view leagues they aren't members of.
  useEffect(() => {
    if (!managedLeaguesLoaded) return;
    if (managedLeagues.length === 0) {
      if (activeLeagueId !== null) setActiveLeagueId(null);
      return;
    }
    if (!activeLeagueId || !managedLeagues.some((l) => l.leagueId === activeLeagueId)) {
      setActiveLeagueId(managedLeagues[0].leagueId);
    }
  }, [managedLeagues, managedLeaguesLoaded, activeLeagueId]);

  // Resolve the active league name from the validated managedLeagues list instead of
  // hitting the public /api/leagues/<id> endpoint (which would leak names of leagues
  // the user is not a member of).
  useEffect(() => {
    if (!activeLeagueId) { setActiveLeagueName(null); return; }
    const entry = managedLeagues.find((l) => l.leagueId === activeLeagueId);
    setActiveLeagueName(entry?.name || null);
  }, [activeLeagueId, managedLeagues]);

  useEffect(() => {
    if (!showLeagueMenu) return;
    const handleClickOutside = (event) => {
      if (leaguePickerRef.current && !leaguePickerRef.current.contains(event.target)) {
        setShowLeagueMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLeagueMenu]);

  useEffect(() => {
    const unsubscribe = onForegroundPush((payload) => {
      const title = payload?.notification?.title || payload?.title || 'Draft update';
      const body = payload?.notification?.body || payload?.body || '';
      setForegroundPushBanner({ title, body });
      window.setTimeout(() => {
        setForegroundPushBanner(null);
      }, 6000);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const resolveTournamentId = (payload) => {
      if (!payload) return '';
      return (
        payload?.data?.tournamentId
        || payload?.notification?.data?.tournamentId
        || payload?.tournamentId
        || ''
      ).toString();
    };

    const unsubscribe = onPushAction((payload) => {
      const tournamentId = resolveTournamentId(payload);
      if (!tournamentId) return;

      setSelectedTournamentId(tournamentId);
      setShowSetup(false);
      setShowAnnualChampionship(false);
      setShowTournamentScores(false);
      setShowUserSettings(false);
      setLeaderboardRefreshKey(prev => prev + 1);
    });

    return unsubscribe;
  }, []);

  const [pendingSetup, setPendingSetup] = useState(false);

  // Ownership-derived flags. Super-admin (developer) always sees admin UI.
  const isLeagueOwner = isSuperAdmin || ownedLeagueIds.size > 0;
  const isActiveLeagueAdmin = isSuperAdmin || (!!activeLeagueId && ownedLeagueIds.has(activeLeagueId));

  const [showSetup, setShowSetup] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);

  // After sign-in: clear pending state and stay on current non-setup view.
  useEffect(() => {
    if (pendingSetup && user && userData !== null) {
      setPendingSetup(false);
      setShowSetup(false);
    }
  }, [isLeagueOwner, pendingSetup, user, userData]);
  const [showAnnualChampionship, setShowAnnualChampionship] = useState(false);
  const [showTournamentScores, setShowTournamentScores] = useState(false);
  const [setupActiveTab, setSetupActiveTab] = useState('league-management');
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
  const initialViewAppliedForUserRef = useRef(null);
  // Tournaments we've already warmed the HTTP cache for (avoid hammering the
  // backend if the user mouses across items repeatedly).
  const prefetchedTournamentsRef = useRef(new Set());

  // Fire-and-forget GET to warm the browser HTTP cache for a tournament's
  // leaderboard payload. Safe to call on hover — backend returns `Cache-Control`
  // headers, so a subsequent click loads instantly from the disk cache.
  const prefetchTournamentLeaderboard = useCallback((tournamentId) => {
    if (!tournamentId) return;
    if (prefetchedTournamentsRef.current.has(tournamentId)) return;
    prefetchedTournamentsRef.current.add(tournamentId);
    authFetch(`${TOURNAMENTS_API_ENDPOINT}/${tournamentId}/leaderboard`).catch(() => {
      // Allow a future hover to retry by clearing the dedupe marker.
      prefetchedTournamentsRef.current.delete(tournamentId);
    });
  }, []);

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

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setShowPushDeniedHint(false);
      return;
    }
    const denied = typeof Notification !== 'undefined' && Notification.permission === 'denied';
    const activeDraft = draftStatus.IsDraftStarted && !draftStatus.IsDraftComplete;
    setShowPushDeniedHint(Boolean(denied && activeDraft && !showSetup && !showUserSettings));
  }, [draftStatus.IsDraftStarted, draftStatus.IsDraftComplete, showSetup, showUserSettings]);

  // Helper function to find a tournament ready for draft board display.
  // Parallel requests — was previously sequential await in a for-loop (O(n) wall-clock).
  const findDraftReadyTournament = async (tournaments) => {
    const results = await Promise.all(tournaments.map(async (tournament) => {
      try {
        const statusResponse = await authFetch(`${TOURNAMENTS_API_ENDPOINT}/${tournament.id}/draft_status`);
        if (!statusResponse.ok) return null;
        const status = await statusResponse.json();
        if (status.IsDraftStarted && !status.IsDraftComplete) return tournament.id;
        return null;
      } catch (_e) {
        devLog(`Could not check draft status for tournament ${tournament.id}`);
        return null;
      }
    }));
    return results.find((id) => !!id) || null;
  };
  
// Function to preload tournament data for faster switching.
  // Parallelized — previously sequential awaits multiplied per-tournament latency.
  const preloadTournamentData = useCallback(async (tournaments) => {
    const entries = await Promise.all(tournaments.map(async (tournament) => {
      try {
        const statusResponse = await authFetch(`${TOURNAMENTS_API_ENDPOINT}/${tournament.id}/draft_status`);
        if (!statusResponse.ok) return null;
        const status = await statusResponse.json();
        if (!status.IsDraftComplete) return null;
        const leaderboardResponse = await authFetch(`${TOURNAMENTS_API_ENDPOINT}/${tournament.id}/leaderboard`);
        if (!leaderboardResponse.ok) return null;
        const leaderboardData = await leaderboardResponse.json();
        devLog(`Preloaded data for tournament: ${tournament.name}`);
        return [tournament.id, {
          rawData: leaderboardData.teamScores || leaderboardData.teams || leaderboardData,
          loading: false,
          error: null,
          lastUpdated: Date.now(),
        }];
      } catch (error) {
        devLog(`Could not preload data for tournament ${tournament.id}:`, error);
        return null;
      }
    }));
    const preloadedData = {};
    for (const entry of entries) {
      if (entry) preloadedData[entry[0]] = entry[1];
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
        const res = await authFetch(url);
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
    const getStartTimestamp = (tournament) => {
      const raw =
        tournament?.startDate ||
        tournament?.StartDate ||
        tournament?.Tournament?.StartDate ||
        0;
      const ts = new Date(raw).getTime();
      return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
    };

    const grouped = {};
    allTournaments.forEach(t => {
      const y = t.year || 'Unknown';
      if (!grouped[y]) grouped[y] = [];
      grouped[y].push(t);
    });

    Object.keys(grouped).forEach((year) => {
      grouped[year].sort((a, b) => getStartTimestamp(a) - getStartTimestamp(b));
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
        const response = await authFetch(url);
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

  // Persist the last-selected tournament per league so league-switching no longer
  // drops the user's current view. Reset draft/picker state only when the
  // previously selected tournament does not belong to the new active league.
  useEffect(() => {
    if (!activeLeagueId) return;
    let restored = '';
    try {
      restored = window.localStorage.getItem(`leaderboard:lastTournament:${activeLeagueId}`) || '';
    } catch (_e) { /* localStorage may be unavailable */ }

    setSelectedTournamentId((current) => {
      if (current && allTournaments.some((t) => t.id === current && (!t.leagueId || t.leagueId === activeLeagueId))) {
        return current;
      }
      if (restored && allTournaments.some((t) => t.id === restored)) {
        return restored;
      }
      return '';
    });
    setShowTournamentPicker(false);
  }, [activeLeagueId, allTournaments]);

  useEffect(() => {
    if (!activeLeagueId || !selectedTournamentId) return;
    try {
      window.localStorage.setItem(`leaderboard:lastTournament:${activeLeagueId}`, selectedTournamentId);
    } catch (_e) { /* ignore */ }
  }, [activeLeagueId, selectedTournamentId]);

  useEffect(() => {
    if (!user) {
      initialViewAppliedForUserRef.current = null;
      return;
    }

    if (userData === null || loadingTournaments) {
      return;
    }

    if (initialViewAppliedForUserRef.current === user.uid) {
      return;
    }

    const isInLeague =
      userData?.inLeague === true ||
      (Array.isArray(userData?.leagueIds) && userData.leagueIds.length > 0);

    setShowSetup(false);
    setShowAnnualChampionship(false);
    setShowTournamentScores(false);

    if (isInLeague) {
      setShowUserSettings(false);
      setLeaderboardRefreshKey((prev) => prev + 1);
    } else {
      setShowUserSettings(true);
    }

    initialViewAppliedForUserRef.current = user.uid;
  }, [loadingTournaments, user, userData]);

  

  // Load teams for the selected tournament
  const loadTeams = useCallback(async () => {
    if (!selectedTournamentId) {
      setTeams([]);
      setDraftPicks([]);
      return;
    }
    try {
      const response = await authFetch(`${TOURNAMENTS_API_ENDPOINT}/${selectedTournamentId}`);
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

  const handleShowScoresClick = () => {
    setShowSetup(false);
    setShowAnnualChampionship(false);
    setShowTournamentScores(true);
    setShowUserSettings(false);
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
      if (!selectedTournamentId || (!tournamentOddsId && !hasManualDraftOdds)) {
        setDraftBoardLoading(false);
        setDraftBoardPlayers([]);
        setDraftBoardError(null);
        return;
      }

      setDraftBoardLoading(true);
      setDraftBoardError(null);
      try {
        // Primary source: the currently selected tournament's locked draft odds
        // from /draft_status. This avoids cross-tournament ambiguity when
        // multiple tournaments share the same oddsId.
        const lockedOdds = Array.isArray(draftStatus?.DraftLockedOdds) ? draftStatus.DraftLockedOdds : [];
        if (lockedOdds.length > 0) {
          setDraftBoardPlayers(lockedOdds.slice(0, 44));
          return;
        }

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
  }, [selectedTournamentId, tournamentOddsId, leaderboardRefreshKey, isDraftStarted, hasManualDraftOdds, draftStatus?.DraftLockedOdds]);

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
      const draftRes = await authFetch(`${TOURNAMENTS_API_ENDPOINT}/${selectedTournamentId}/draft_status`);
      if (!draftRes.ok) throw new Error('Failed to fetch draft status');
      const status = await draftRes.json();
      setDraftStatus(prev => {
        // Cheap shallow compare on the scalar fields that actually drive UI.
        // JSON.stringify on the full object (incl. teams + draftPicks arrays) was hot.
        const same =
          prev.IsDraftStarted === status.IsDraftStarted &&
          prev.IsDraftLocked === status.IsDraftLocked &&
          prev.IsDraftComplete === status.IsDraftComplete &&
          prev.currentPickTeam === status.currentPickTeam &&
          prev.currentRound === status.currentRound &&
          prev.currentTier === status.currentTier &&
          prev.numTeams === status.numTeams &&
          (prev.draftPicks?.length || 0) === (status.draftPicks?.length || 0) &&
          (prev.teams?.length || 0) === (status.teams?.length || 0) &&
          (prev.DraftLockedOdds?.length || 0) === (status.DraftLockedOdds?.length || 0);
        if (same) return prev;
        // Draft just completed — refresh leaderboard data to pick up golferNames
        if (!prev.IsDraftComplete && status.IsDraftComplete) {
          setLeaderboardRefreshKey(k => k + 1);
        }
        return status;
      });
    } catch (error) {
      devError('Error fetching draft status:', error);
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

  // Pre-lock-in preview: tournament selected, odds not yet locked, draft not
  // started. Shows a flat list of current odds plus the captured-at timestamp.
  const shouldShowPreviewBoard = useMemo(() => {
    return (
      !!selectedTournamentId
      && !draftStatus.IsDraftLocked
      && !draftStatus.IsDraftStarted
      && !draftStatus.IsDraftComplete
    );
  }, [selectedTournamentId, draftStatus.IsDraftLocked, draftStatus.IsDraftStarted, draftStatus.IsDraftComplete]);

  // --- Main Render Logic ---

  // Auth is still resolving (Firebase onAuthStateChanged hasn't fired yet).
  // If a previous session hint is present in localStorage, render a neutral app
  // skeleton so returning users don't see the landing page flash. Otherwise
  // render the landing page immediately for first-time visitors.
  if (user === undefined) {
    if (hadAuthSession) {
      return (
        <div className="App app-loading-skeleton">
          <header className="modern-header">
            <div className="header-container">
              <div className="brand-section">
                <div className="logo-container">
                  <div className="wv-golf-logo"><span className="golf-icon">⛳</span></div>
                </div>
                <div className="brand-text">
                  <h1 className="app-title">The Sunday Cup</h1>
                  <p className="app-subtitle">{activeLeagueName || ''}</p>
                </div>
              </div>
            </div>
          </header>
          <div className="main-content" aria-busy="true" />
        </div>
      );
    }
    // No prior session: fall through to the landing page below.
  }

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

  // Early-membership gate: if the signed-in user's Firestore doc has no league
  // memberships (and they're not an admin), route them straight to the My Profile
  // view BEFORE rendering the leaderboard shell. This avoids the flash of the
  // leaderboard for non-members. `userData` comes from Firestore users/{uid} and
  // is the immediate signal — we don't wait for the server /user/profile round-trip.
  const hasNoMembershipsHint =
    !!userData &&
    userData.role !== 'admin' &&
    !(Array.isArray(userData.leagueIds) && userData.leagueIds.length > 0);
  // Server-validated fallback: if /user/profile and /leagues/mine both returned empty.
  const hasNoValidatedLeagues =
    !!userData && !isSuperAdmin && managedLeaguesLoaded && managedLeagues.length === 0;

  if (hasNoMembershipsHint || hasNoValidatedLeagues) {
    return (
      <div className="App">
        <header className="modern-header">
          <div className="header-container">
            <div className="brand-section">
              <div className="logo-container">
                <div className="wv-golf-logo"><span className="golf-icon">⛳</span></div>
              </div>
              <div className="brand-text">
                <h1 className="app-title">The Sunday Cup</h1>
              </div>
            </div>
          </div>
        </header>

        {foregroundPushBanner && (
          <div style={{
            margin: '12px 16px 0',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid #2f7a3f',
            backgroundColor: '#102915',
            color: '#d7f6df',
          }}>
            <div style={{ fontWeight: 700 }}>{foregroundPushBanner.title}</div>
            {foregroundPushBanner.body ? <div style={{ marginTop: 4 }}>{foregroundPushBanner.body}</div> : null}
          </div>
        )}

        {showPushDeniedHint && (
          <div style={{
            margin: '12px 16px 0',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #7d5f1d',
            backgroundColor: '#2b2109',
            color: '#f6e7be',
          }}>
            Browser push is blocked. Keep the draft screen open for live turn updates.
          </div>
        )}

        <div className="main-content">
          <UserSettings activeLeagueId={null} onSignOut={signOut} onLeagueCreated={refreshLeagues} />
        </div>
      </div>
    );
  }

  if (loadingTournaments) {
    // Show the full app shell with a lightweight skeleton instead of a blocking white page.
    // The header/nav renders immediately so the page feels responsive while tournaments load.
    return (
      <div className="App app-loading-skeleton">
        <header className="modern-header">
          <div className="header-container">
            <div className="brand-section">
              <div className="logo-container">
                <div className="wv-golf-logo"><span className="golf-icon">⛳</span></div>
              </div>
              <div className="brand-text">
                <h1 className="app-title">The Sunday Cup</h1>
                <p className="app-subtitle">{activeLeagueName || ''}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="main-content" aria-busy="true" />
      </div>
    );
  }
  if (tournamentError) return <div style={{ color: 'red' }}>Error: {tournamentError}</div>;

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
              <h1 className="app-title">The Sunday Cup</h1>
              <p className="app-subtitle">{activeLeagueName || 'West Virginia'}</p>
            </div>
          </div>

          {/* Tournament Selector removed — now in the details bar picker */}

          {/* Navigation Section */}
          <nav className="modern-nav">
            <button
              className={`nav-link ${!selectedTournamentId ? 'disabled' : ''}`}
              onClick={() => {
                setShowAnnualYearPicker(false);
                handleShowLeaderboardClick();
              }}
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
              Scores
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
              className={`user-avatar-btn${(isLeagueOwner ? showSetup : showUserSettings) ? ' active' : ''}`}
              onClick={() => {
                setShowAnnualChampionship(false);
                setShowTournamentScores(false);
                if (isLeagueOwner) {
                  setShowUserSettings(false);
                  setShowSetup(true);
                } else {
                  setShowSetup(false);
                  setShowUserSettings(s => !s);
                }
              }}
              title={`Signed in as ${user.email}`}
              aria-label={isLeagueOwner ? 'Admin Setup' : 'My Settings'}
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
      {/* Status bar: context-aware — Annual, Profile, or Tournament Details */}
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
      ) : showSetup || showUserSettings ? (
        <>
          {/* Setup tab bar — desktop only; mobile uses second bottom bar */}
          {showSetup && (
            <div className="setup-nav-bar">
            <button
              className={`setup-nav-link ${setupActiveTab === 'league-management' ? 'active' : ''}`}
              onClick={() => setSetupActiveTab('league-management')}
            >
              League Management
            </button>
            <button
              className={`setup-nav-link ${setupActiveTab === 'tournament-management' ? 'active' : ''}`}
              onClick={() => setSetupActiveTab('tournament-management')}
            >
              Tournament Management
            </button>
            <button
              className={`setup-nav-link ${setupActiveTab === 'my-profile' ? 'active' : ''}`}
              onClick={() => setSetupActiveTab('my-profile')}
            >
              My Profile
            </button>
            </div>
          )}
        </>
      ) : selectedTournamentId ? (
        <div className="status-bar">
          {managedLeagues.length > 1 && (
            <div className="status-league-block">
              <p className="status-section-title">League</p>
              <div className="tournament-picker" ref={leaguePickerRef}>
                <button
                  className="picker-trigger"
                  onClick={() => setShowLeagueMenu(prev => !prev)}
                  aria-expanded={showLeagueMenu}
                >
                  <span className="status-line-name">{activeLeagueName || 'Select league'}</span>
                  <span className="picker-chevron">{showLeagueMenu ? '▴' : '▾'}</span>
                </button>
                {showLeagueMenu && (
                  <div className="picker-dropdown">
                    {managedLeagues.map((league) => (
                      <button
                        key={league.leagueId}
                        type="button"
                        className={`picker-item${league.leagueId === activeLeagueId ? ' active' : ''}`}
                        onClick={() => {
                          setActiveLeagueId(league.leagueId);
                          setActiveLeagueName(league.name || null);
                          setShowLeagueMenu(false);
                        }}
                      >
                        {league.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
                        onMouseEnter={() => prefetchTournamentLeaderboard(t.id)}
                        onFocus={() => prefetchTournamentLeaderboard(t.id)}
                        onClick={() => {
                          // Bumping refreshKey on the same tournament forces a full refetch loop
                          // and unnecessary teardown. Only bump when actually switching.
                          if (t.id !== selectedTournamentId) {
                            setSelectedTournamentId(t.id);
                            setLeaderboardRefreshKey(prev => prev + 1);
                          }
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
          {(tournamentInfo?.CourseName || tournamentInfo?.Venue || tournamentInfo?.Courses?.[0]?.Name) && (
            <p className="status-line">
              <span className="status-line-label">Course:</span> {tournamentInfo?.CourseName || tournamentInfo?.Venue || tournamentInfo?.Courses?.[0]?.Name}
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
          <UserSettings activeLeagueId={activeLeagueId} onSignOut={() => { setShowUserSettings(false); signOut(); }} onLeagueCreated={refreshLeagues} />
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
                isAdmin={isActiveLeagueAdmin}
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
                                  <td className="golfer-name-cell" colSpan={2}>
                                    <span className="golfer-name-with-photo">
                                      <span className="golfer-name-text">{golfer.name}</span>
                                    </span>
                                  </td>
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
                        <th
                          className="sortable-header team-golfer-header"
                          onClick={() => {
                            const allKeys = sortedLeaderboardData.map((t, i) => t.teamName || t.team || `Unknown Team`);
                            const allExpanded = allKeys.length > 0 && allKeys.every(k => expandedTeams[k]);
                            if (allExpanded) {
                              setExpandedTeams({});
                            } else {
                              const next = {};
                              allKeys.forEach(k => { next[k] = true; });
                              setExpandedTeams(next);
                            }
                          }}
                          title="Expand/collapse all teams"
                        >
                          <span className="team-expand-icon">
                            {sortedLeaderboardData.length > 0 && sortedLeaderboardData.every(t => expandedTeams[t.teamName || t.team || 'Unknown Team']) ? '▾' : '▸'}
                          </span>
                          TEAM / GOLFER
                        </th>
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
                        const expandKey = teamName;
                        return (
                        <React.Fragment key={`team-${teamName}-${index}`}>
                          <tr
                            className={`team-row${expandedTeams[expandKey] ? ' team-row-expanded' : ''}`}
                            onClick={() => setExpandedTeams(prev => ({ ...prev, [expandKey]: !prev[expandKey] }))}
                          >
                            <td className="team-name-cell">
                              <span className="team-expand-icon">{expandedTeams[expandKey] ? '▾' : '▸'}</span>
                              {teamName}
                            </td>
                            <td className="total-cell" style={{ color: getScoreColor(teamTotal) }}>{formatScoreForDisplay(teamTotal)}</td>
                            <td style={{ color: getScoreColor(team.roundDetails?.r1?.score || team.r1) }}>{formatScoreForDisplay(team.roundDetails?.r1?.score || team.r1)}</td>
                            <td style={{ color: getScoreColor(team.roundDetails?.r2?.score || team.r2) }}>{formatScoreForDisplay(team.roundDetails?.r2?.score || team.r2)}</td>
                            <td style={{ color: getScoreColor(team.roundDetails?.r3?.score || team.r3) }}>{formatScoreForDisplay(team.roundDetails?.r3?.score || team.r3)}</td>
                            <td style={{ color: getScoreColor(team.roundDetails?.r4?.score || team.r4) }}>{formatScoreForDisplay(team.roundDetails?.r4?.score || team.r4)}</td>
                          </tr>
                          {expandedTeams[expandKey] && golfers.map((golfer, golferIndex) => {
                            const isCut = golfer.status && golfer.status.toUpperCase() === 'CUT';
                            return (
                              <tr key={`golfer-${teamName}-${golferIndex}`} className={`golfer-row${isCut ? ' golfer-row-cut' : ''} ${golferIndex % 2 === 0 ? 'golfer-band-a' : 'golfer-band-b'}`}>
                                <td className="golfer-name-cell" colSpan={2}>
                                  <span className="golfer-name-with-photo">
                                    <span className="golfer-name-text">{golfer.name}</span>
                                  </span>
                                  {isCut
                                    ? <span className="golfer-cut-label">CUT</span>
                                    : golfer.thru && golfer.thru !== 'F' && golfer.thru !== ''
                                      ? <span className="golfer-status-label">Thru {golfer.thru}</span>
                                      : golfer.thru === 'F'
                                        ? <span className="golfer-status-label">Finished</span>
                                        : golfer.status && <span className="golfer-status-label">{golfer.status}</span>
                                  }
                                </td>
                                <td style={{ color: getScoreColor(golfer.r1?.score) }}>{formatScoreForDisplay(golfer.r1?.score)}</td>
                                <td style={{ color: getScoreColor(golfer.r2?.score) }}>{formatScoreForDisplay(golfer.r2?.score)}</td>
                                <td style={{ color: getScoreColor(golfer.r3?.score) }}>{formatScoreForDisplay(golfer.r3?.score)}</td>
                                <td style={{ color: getScoreColor(golfer.r4?.score) }}>{formatScoreForDisplay(golfer.r4?.score)}</td>
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
              shouldShowPreviewBoard ? (
                <PreviewDraftBoard
                  tournamentId={selectedTournamentId}
                  tournamentName={tournamentInfo?.Name || allTournaments.find(t => t.id === selectedTournamentId)?.name}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
                  <p>Select a tournament to view its draft board.</p>
                </div>
              )
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
                You can manage your leagues in Setup or view the Annual Championship anytime using the buttons above.
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
            handleShowScoresClick();
            setShowAnnualYearPicker(false);
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
            className={`bottom-nav-link ${setupActiveTab === 'league-management' ? 'active' : ''}`}
            onClick={() => setSetupActiveTab('league-management')}
          >
            League Management
          </button>
          <button
            className={`bottom-nav-link ${setupActiveTab === 'tournament-management' ? 'active' : ''}`}
            onClick={() => setSetupActiveTab('tournament-management')}
          >
            Tournament Management
          </button>
          <button
            className={`bottom-nav-link ${setupActiveTab === 'my-profile' ? 'active' : ''}`}
            onClick={() => setSetupActiveTab('my-profile')}
          >
            Profile
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;