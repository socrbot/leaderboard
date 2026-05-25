import { useState, useEffect, useMemo } from 'react';
import { BACKEND_BASE_URL, LEADERBOARD_API_ENDPOINT } from './apiConfig';
import {
    LIFECYCLE_STATES,
    deriveLifecycleState,
    isLifecycleLive,
    isLifecycleFinished,
    logV2Anomaly,
} from './leaderboardLifecycle';

export const useGolfLeaderboard = (
    tournamentId,
    refreshDependency
) => {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [teamAssignments, setTeamAssignments] = useState([]);
    const [isTournamentInProgress, setIsTournamentInProgress] = useState(false);
    const [isTournamentOver, setIsTournamentOver] = useState(false);
    const [lifecycleState, setLifecycleState] = useState(LIFECYCLE_STATES.CREATED);
    const [tournamentOddsId, setTournamentOddsId] = useState('');
    const [isDraftStarted, setIsDraftStarted] = useState(false);
    const [hasManualDraftOdds, setHasManualDraftOdds] = useState(false);
    const [tournamentInfo, setTournamentInfo] = useState(null);

    const [tournamentSpecifics, setTournamentSpecifics] = useState({
        orgId: '1',
        tournId: '033',
        year: '2025',
        par: 71
    });

    // Fetch tournament details and metadata
    useEffect(() => {
        const fetchTournamentDetails = async () => {
            if (!tournamentId) {
                setTeamAssignments([]);
                setTournamentSpecifics({ orgId: '1', tournId: '033', year: '2025', par: 71 });
                setIsTournamentInProgress(false);
                setIsTournamentOver(false);
                setLifecycleState(LIFECYCLE_STATES.CREATED);
                setTournamentOddsId('');
                setIsDraftStarted(false);
                setHasManualDraftOdds(false);
                setTournamentInfo(null);
                setLoading(false);
                return;
            }

            setError(null);
            setLoading(true);

            try {
                console.log('🏌️ useGolfLeaderboard: Fetching tournament details for', tournamentId);
                const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const tournamentData = await response.json();

                console.log('📋 Tournament data received:', tournamentData);

                setTeamAssignments(tournamentData.teams || []);
                setTournamentSpecifics({
                    orgId: tournamentData.orgId || '1',
                    tournId: tournamentData.tournId || '033',
                    year: tournamentData.year || '2025',
                    par: tournamentData.par || 71
                });
                const derivedLifecycle = deriveLifecycleState(tournamentData);
                const isInProgress = isLifecycleLive(derivedLifecycle);
                const isOver = isLifecycleFinished(derivedLifecycle);

                if (!tournamentData.lifecycleState) {
                    logV2Anomaly('lifecycle_missing', {
                        tournamentId,
                        derivedLifecycle,
                    });
                }

                setLifecycleState(derivedLifecycle);
                setIsTournamentInProgress(isInProgress);
                setIsTournamentOver(isOver);
                setTournamentOddsId(tournamentData.oddsId || '');
                setIsDraftStarted(tournamentData.IsDraftStarted || false);
                setHasManualDraftOdds(tournamentData.hasManualDraftOdds || false);
                setTournamentInfo(tournamentData.Tournament || null);

                if (!tournamentData.teams || tournamentData.teams.length === 0) {
                    setLoading(false);
                }

            } catch (e) {
                console.error('💥 Error fetching tournament details:', e);
                setError(`Failed to load tournament details: ${e.message}`);
                setTeamAssignments([]);
                setTournamentSpecifics({ orgId: '1', tournId: '033', year: '2025', par: 71 });
                setIsTournamentInProgress(false);
                setIsTournamentOver(false);
                setLifecycleState(LIFECYCLE_STATES.CREATED);
                setTournamentOddsId('');
                setIsDraftStarted(false);
                setHasManualDraftOdds(false);
                setTournamentInfo(null);
                setLoading(false);
            }
        };

        fetchTournamentDetails();
    }, [tournamentId, refreshDependency]);

    // Fetch leaderboard data with team calculations from backend
    useEffect(() => {
        // Fetch leaderboard when we have required tournament context.
        // Backend handles live/in-progress/completed/not-started states.
        if (!tournamentId || teamAssignments.length === 0 || !tournamentSpecifics.tournId || 
            !tournamentSpecifics.orgId || !tournamentSpecifics.year || 
            tournamentSpecifics.par === undefined || tournamentSpecifics.par === null) {
            setRawData([]);
            setLoading(false);
            return;
        }

        const fetchLeaderboardData = async (isInitialLoad = true) => {
            // Only show loading spinner on initial load, not on auto-refresh
            if (isInitialLoad) {
                setLoading(true);
            }
            setError(null);
            try {
                console.log('🏌️ useGolfLeaderboard: Fetching leaderboard with team calculations...');
                
                // Call backend endpoint with calculateTeams=true to get team scores
                const fetchUrl = `${LEADERBOARD_API_ENDPOINT}?calculateTeams=true&tournId=${tournamentSpecifics.tournId}&orgId=${tournamentSpecifics.orgId}&year=${tournamentSpecifics.year}&tournamentId=${tournamentId}`;
                
                console.log('🌐 Leaderboard API URL:', fetchUrl);
                
                const response = await fetch(fetchUrl);
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    throw new Error(`HTTP error! status: ${response.status} - ${errorBody.error || errorBody.message || response.statusText}`);
                }
                
                const result = await response.json();
                console.log('📊 Backend team calculation result:', result);
                
                if (result.error) {
                    throw new Error(`Backend Error: ${result.error} ${result.details || ''}`);
                }

                // Backend is the single source of truth for team scores.
                // If teamScores is missing, render placeholder rows from teamAssignments
                // and emit an anomaly so the gap is observable. We DO NOT recompute scores client-side.
                let calculatedTeamData = result.teamScores || result.teams || [];
                if ((!calculatedTeamData || calculatedTeamData.length === 0) && teamAssignments.length > 0) {
                    logV2Anomaly('team_scores_missing', {
                        tournamentId,
                        teamAssignmentsCount: teamAssignments.length,
                        hasLegacyRows: Array.isArray(result?.leaderboardData?.leaderboardRows)
                            && result.leaderboardData.leaderboardRows.length > 0,
                        dataFreshness: result?.dataFreshness,
                    });
                    calculatedTeamData = teamAssignments.map((team) => {
                        const golfers = (team.golferNames || []).map((golferName) => ({
                            name: golferName,
                            status: '',
                            r1: { score: null, isLive: false },
                            r2: { score: null, isLive: false },
                            r3: { score: null, isLive: false },
                            r4: { score: null, isLive: false },
                            total: null,
                            thru: '',
                        }));
                        return {
                            teamName: team.name,
                            team: team.name,
                            totalScore: null,
                            total: null,
                            r1: null,
                            r2: null,
                            r3: null,
                            r4: null,
                            players: golfers,
                            golfers,
                        };
                    });
                }
                console.log('🏆 Calculated team data:', calculatedTeamData);
                console.log('🔍 First team structure:', calculatedTeamData[0]);
                
                setRawData(calculatedTeamData);
                setLoading(false);

            } catch (e) {
                console.error('💥 Error fetching leaderboard data:', e);
                setError(e.message);
                setRawData([]);
                setLoading(false);
            }
        };

        // Initial fetch
        fetchLeaderboardData(true);

        // Set up auto-refresh polling only for live tournaments.
        if (!isTournamentInProgress) {
            return undefined;
        }

        const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
        const pollInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing leaderboard data...');
            fetchLeaderboardData(false); // Don't show loading spinner on auto-refresh
        }, AUTO_REFRESH_INTERVAL);

        // Cleanup: Clear interval when component unmounts or dependencies change
        return () => {
            console.log('🛑 Clearing leaderboard auto-refresh interval');
            clearInterval(pollInterval);
        };
    }, [tournamentId, teamAssignments, tournamentSpecifics, isTournamentInProgress, isDraftStarted, refreshDependency]);

    // Create golfer-to-team mapping
    const selectedTeamGolfersMap = useMemo(() => {
        const newMap = {};
        if (teamAssignments && teamAssignments.length > 0) {
            teamAssignments.forEach(team => {
                (team.golferNames || []).forEach(golferName => {
                    newMap[golferName] = team.name;
                });
            });
        }
        return newMap;
    }, [teamAssignments]);

    // Team colors for UI display
    const teamColors = useMemo(() => ({
        "Team A": "#FFCDD2",
        "Team B": "#B2DFDB", 
        "Team C": "#C8E6C9",
        "Team D": "#FFECB3",
        "Team E": "#E1BEE7",
        "Team F": "#BBDEFB",
        "Team G": "#FFAB91",
    }), []);

    return {
        rawData,
        loading,
        error,
        isTournamentInProgress,
        isTournamentOver,
        lifecycleState,
        tournamentOddsId,
        teamAssignments,
        selectedTeamGolfersMap,
        teamColors,
        isDraftStarted,
        hasManualDraftOdds,
        tournamentInfo
    };
};
