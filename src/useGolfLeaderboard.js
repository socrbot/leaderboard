import { useState, useEffect, useMemo, useRef } from 'react';
import { BACKEND_BASE_URL, LEADERBOARD_API_ENDPOINT } from './apiConfig';
import {
    LIFECYCLE_STATES,
    deriveLifecycleState,
    isLifecycleLive,
    isLifecycleFinished,
    logV2Anomaly,
} from './leaderboardLifecycle';
import { retryFetchJson } from './utils/retryFetch';
import { useVisibilityAwareInterval } from './hooks/useVisibilityAwareInterval';
import { devLog, devError } from './utils/devLog';

// Poll cadence while a tournament is live. Server already caches aggressively;
// 90s gives a near-live feel without hammering Cloud Run.
const LIVE_POLL_MS = 90 * 1000;
const LAST_GOOD_KEY = (tournamentId) => `leaderboard:lastGood:${tournamentId}`;

function readLastGood(tournamentId) {
    if (!tournamentId) return null;
    try {
        const raw = window.sessionStorage.getItem(LAST_GOOD_KEY(tournamentId));
        return raw ? JSON.parse(raw) : null;
    } catch (_e) { return null; }
}

function writeLastGood(tournamentId, payload) {
    if (!tournamentId) return;
    try {
        window.sessionStorage.setItem(
            LAST_GOOD_KEY(tournamentId),
            JSON.stringify({ ts: Date.now(), payload }),
        );
    } catch (_e) { /* ignore quota errors */ }
}

export const useGolfLeaderboard = (
    tournamentId,
    refreshDependency
) => {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stale, setStale] = useState(false);              // true when rawData is from last-good cache
    const [staleSince, setStaleSince] = useState(null);     // epoch ms when last fresh data was captured
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

    // Refs so polling callback always sees latest fetcher / round without re-creating the interval.
    const fetchLeaderboardRef = useRef(null);
    const currentRoundRef = useRef(null);

    // Fetch tournament details and metadata
    useEffect(() => {
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
            return undefined;
        }

        const ac = new AbortController();
        setError(null);
        setLoading(true);

        (async () => {
            try {
                devLog('🏌️ useGolfLeaderboard: Fetching tournament details for', tournamentId);
                const tournamentData = await retryFetchJson(
                    `${BACKEND_BASE_URL}/tournaments/${tournamentId}`,
                    { signal: ac.signal },
                );
                if (ac.signal.aborted) return;

                devLog('📋 Tournament data received:', tournamentData);

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
                currentRoundRef.current = tournamentData?.Tournament?.CurrentRound || null;

                if (!tournamentData.teams || tournamentData.teams.length === 0) {
                    setLoading(false);
                }
            } catch (e) {
                if (e.name === 'AbortError') return;
                devError('💥 Error fetching tournament details:', e);
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
        })();

        return () => ac.abort();
    }, [tournamentId, refreshDependency]);

    // Fetch leaderboard data with team calculations from backend
    useEffect(() => {
        if (!tournamentId || teamAssignments.length === 0 || !tournamentSpecifics.tournId ||
            !tournamentSpecifics.orgId || !tournamentSpecifics.year ||
            tournamentSpecifics.par === undefined || tournamentSpecifics.par === null) {
            setRawData([]);
            setLoading(false);
            fetchLeaderboardRef.current = null;
            return undefined;
        }

        const ac = new AbortController();

        const fetchLeaderboardData = async (isInitialLoad = true) => {
            if (ac.signal.aborted) return;
            if (isInitialLoad) setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({
                    calculateTeams: 'true',
                    tournId: tournamentSpecifics.tournId,
                    orgId: tournamentSpecifics.orgId,
                    year: tournamentSpecifics.year,
                    tournamentId,
                });
                if (isTournamentInProgress && currentRoundRef.current) {
                    params.set('roundId', String(currentRoundRef.current));
                }
                const fetchUrl = `${LEADERBOARD_API_ENDPOINT}?${params.toString()}`;
                devLog('🌐 Leaderboard API URL:', fetchUrl);

                const result = await retryFetchJson(fetchUrl, { signal: ac.signal });
                if (ac.signal.aborted) return;
                devLog('📊 Backend team calculation result:', result);

                if (result.error) {
                    throw new Error(`Backend Error: ${result.error} ${result.details || ''}`);
                }

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
                devLog('🏆 Calculated team data:', calculatedTeamData);

                setRawData(calculatedTeamData);
                setStale(false);
                setStaleSince(Date.now());
                writeLastGood(tournamentId, calculatedTeamData);
                setLoading(false);
            } catch (e) {
                if (e.name === 'AbortError' || ac.signal.aborted) return;
                devError('💥 Error fetching leaderboard data:', e);
                const cached = readLastGood(tournamentId);
                if (cached && Array.isArray(cached.payload) && cached.payload.length > 0) {
                    setRawData(cached.payload);
                    setStale(true);
                    setStaleSince(cached.ts || null);
                    setError(`Showing last-known data — refresh failed: ${e.message}`);
                } else {
                    setError(e.message);
                    setRawData([]);
                }
                setLoading(false);
            }
        };

        fetchLeaderboardRef.current = fetchLeaderboardData;
        fetchLeaderboardData(true);

        return () => {
            ac.abort();
            fetchLeaderboardRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournamentId, teamAssignments, tournamentSpecifics, refreshDependency]);

    // Visibility-aware polling for live tournaments. Pauses when the tab is hidden.
    useVisibilityAwareInterval(
        () => {
            const fn = fetchLeaderboardRef.current;
            if (fn) {
                devLog('🔄 Auto-refreshing leaderboard data...');
                fn(false);
            }
        },
        LIVE_POLL_MS,
        isTournamentInProgress,
    );

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
        stale,
        staleSince,
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
