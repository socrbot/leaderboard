// src/hooks/useOptimizedGolfLeaderboard.js
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LEADERBOARD_API_ENDPOINT, BACKEND_BASE_URL } from '../apiConfig';
import { useAPICache } from './useAPICache';
import { measurePerformance } from '../utils/performance';

export const useOptimizedGolfLeaderboard = (tournamentId, refreshDependency) => {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [teamAssignments, setTeamAssignments] = useState([]);
    const [isTournamentInProgress, setIsTournamentInProgress] = useState(false);
    const [tournamentOddsId, setTournamentOddsId] = useState('');
    const [isDraftStarted, setIsDraftStarted] = useState(false);
    const [hasManualDraftOdds, setHasManualDraftOdds] = useState(false);
    
    const abortControllerRef = useRef(null);
    const dataCache = useRef(new Map());

    const [tournamentSpecifics, setTournamentSpecifics] = useState({
        orgId: '1',
        tournId: '033',
        year: '2025',
        par: 71
    });

    // Use API cache for tournament details
    const tournamentUrl = tournamentId ? `${BACKEND_BASE_URL}/tournaments/${tournamentId}` : null;
    const { data: cachedTournamentData, loading: tournamentLoading } = useAPICache(tournamentUrl, [tournamentId]);

    // Memoized data processing
    const processedData = useMemo(() => {
        if (!rawData || rawData.length === 0) return [];
        
        const cacheKey = `${tournamentId}-${JSON.stringify(rawData)}-${JSON.stringify(teamAssignments)}`;
        if (dataCache.current.has(cacheKey)) {
            return dataCache.current.get(cacheKey);
        }

        measurePerformance.startTimer('process-leaderboard-data');
        
        // Process the data (existing transformation logic would go here)
        const processed = rawData; // Simplified for now
        
        dataCache.current.set(cacheKey, processed);
        measurePerformance.endTimer('process-leaderboard-data');
        
        return processed;
    }, [rawData, teamAssignments, tournamentId]);

    // Optimized tournament details fetching
    useEffect(() => {
        if (!cachedTournamentData || tournamentLoading) return;

        try {
            setTeamAssignments(cachedTournamentData.teams || []);
            setTournamentSpecifics({
                orgId: cachedTournamentData.orgId || '1',
                tournId: cachedTournamentData.tournId || '033',
                year: cachedTournamentData.year || '2025',
                par: cachedTournamentData.par || 71
            });
            setIsTournamentInProgress(cachedTournamentData.IsInProgress || false);
            setTournamentOddsId(cachedTournamentData.oddsId || '');
            setIsDraftStarted(cachedTournamentData.IsDraftStarted || false);
            setHasManualDraftOdds(cachedTournamentData.hasManualDraftOdds || false);
        } catch (e) {
            setError(`Failed to process tournament details: ${e.message}`);
        }
    }, [cachedTournamentData, tournamentLoading]);

    // Optimized leaderboard data fetching
    useEffect(() => {
        if (!isTournamentInProgress || !tournamentId || teamAssignments.length === 0) {
            setRawData([]);
            setLoading(false);
            return;
        }

        const fetchLeaderboardData = async () => {
            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            setLoading(true);
            setError(null);

            try {
                measurePerformance.startTimer(`leaderboard-fetch-${tournamentId}`);
                
                const fetchUrl = `${LEADERBOARD_API_ENDPOINT}/${tournamentSpecifics.orgId}/${tournamentSpecifics.tournId}/${tournamentSpecifics.year}`;
                
                const response = await measurePerformance.measureAPICall(fetchUrl, {
                    signal: abortControllerRef.current.signal,
                    headers: {
                        'Cache-Control': 'max-age=30',
                        'Accept': 'application/json',
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch leaderboard: ${response.status}`);
                }

                const data = await response.json();
                
                // Apply cut player penalties if needed
                const processedData = patchCutPlayerRounds(
                    data.leaderboardRows || [], 
                    tournamentSpecifics.par,
                    13, // Round 3 penalty
                    16  // Round 4 penalty
                );

                setRawData(processedData);
                measurePerformance.endTimer(`leaderboard-fetch-${tournamentId}`);
                
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error fetching leaderboard:', err);
                    setError(err.message);
                    setRawData([]);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboardData();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [isTournamentInProgress, tournamentId, teamAssignments.length, tournamentSpecifics, refreshDependency]);

    // Cleanup cache on unmount
    useEffect(() => {
        return () => {
            dataCache.current.clear();
        };
    }, []);

    return {
        rawData: processedData,
        loading: loading || tournamentLoading,
        error,
        teamAssignments,
        isTournamentInProgress,
        tournamentOddsId,
        isDraftStarted,
        hasManualDraftOdds,
        tournamentSpecifics
    };
};

// Helper function (simplified version)
function patchCutPlayerRounds(players, par, round3Penalty, round4Penalty) {
    return players.map(player => {
        if (String(player.status).toLowerCase() === 'cut') {
            let newRounds = player.rounds ? [...player.rounds] : [];
            const penalties = [
                { round: 3, value: round3Penalty },
                { round: 4, value: round4Penalty }
            ];
            
            penalties.forEach(({ round, value }) => {
                const roundIdx = newRounds.findIndex(r => parseInt(r.roundId?.$numberInt || r.roundId) === round);
                const patchedRound = {
                    courseId: newRounds[0]?.courseId || "608",
                    courseName: newRounds[0]?.courseName || "Unknown",
                    roundId: { $numberInt: String(round) },
                    scoreToPar: value > 0 ? `+${value}` : String(value),
                    strokes: { $numberInt: String(par + value) },
                    isPenalty: true
                };
                
                if (roundIdx >= 0) {
                    newRounds[roundIdx] = patchedRound;
                } else {
                    newRounds.push(patchedRound);
                }
            });
            
            newRounds = newRounds.sort((a, b) =>
                parseInt(a.roundId?.$numberInt || a.roundId) - parseInt(b.roundId?.$numberInt || b.roundId)
            );
            
            return { ...player, rounds: newRounds };
        }
        return player;
    });
}
