import { useState, useEffect, useMemo } from 'react';
import { BACKEND_BASE_URL, LEADERBOARD_API_ENDPOINT } from './apiConfig';

export const useGolfLeaderboard = (
    tournamentId,
    refreshDependency
) => {
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [teamAssignments, setTeamAssignments] = useState([]);
    const [isTournamentInProgress, setIsTournamentInProgress] = useState(false);
    const [tournamentOddsId, setTournamentOddsId] = useState('');
    const [isDraftStarted, setIsDraftStarted] = useState(false);
    const [hasManualDraftOdds, setHasManualDraftOdds] = useState(false);

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
                setTournamentOddsId('');
                setIsDraftStarted(false);
                setHasManualDraftOdds(false);
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
                setIsTournamentInProgress(tournamentData.IsInProgress || false);
                setTournamentOddsId(tournamentData.oddsId || '');
                setIsDraftStarted(tournamentData.IsDraftStarted || false);
                setHasManualDraftOdds(tournamentData.hasManualDraftOdds || false);

                if (!tournamentData.teams || tournamentData.teams.length === 0) {
                    setLoading(false);
                }

            } catch (e) {
                console.error('💥 Error fetching tournament details:', e);
                setError(`Failed to load tournament details: ${e.message}`);
                setTeamAssignments([]);
                setTournamentSpecifics({ orgId: '1', tournId: '033', year: '2025', par: 71 });
                setIsTournamentInProgress(false);
                setTournamentOddsId('');
                setIsDraftStarted(false);
                setHasManualDraftOdds(false);
                setLoading(false);
            }
        };

        fetchTournamentDetails();
    }, [tournamentId, refreshDependency]);

    // Fetch leaderboard data with team calculations from backend
    useEffect(() => {
        // If tournament is not in progress, show empty team data for completed draft
        if (!isTournamentInProgress) {
            if (isDraftStarted && teamAssignments.length > 0) {
                // Create empty team data structure for display
                const emptyTeamData = teamAssignments.map(team => ({
                    team: team.name,
                    total: null,
                    r1: null,
                    r2: null,
                    r3: null,
                    r4: null,
                    golfers: (team.golferNames || []).map(golferName => ({
                        name: golferName,
                        status: '',
                        r1: { score: null, isLive: false },
                        r2: { score: null, isLive: false },
                        r3: { score: null, isLive: false },
                        r4: { score: null, isLive: false },
                        total: null,
                        thru: ''
                    }))
                }));
                setRawData(emptyTeamData);
            } else {
                setRawData([]);
            }
            setLoading(false);
            return;
        }

        // Only fetch leaderboard if tournament is in progress and we have all required data
        if (!tournamentId || teamAssignments.length === 0 || !tournamentSpecifics.tournId || 
            !tournamentSpecifics.orgId || !tournamentSpecifics.year || 
            tournamentSpecifics.par === undefined || tournamentSpecifics.par === null) {
            setRawData([]);
            setLoading(false);
            return;
        }

        const fetchLeaderboardData = async () => {
            setLoading(true);
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

                // Backend returns calculated team data directly
                const calculatedTeamData = result.teams || [];
                console.log('🏆 Calculated team data:', calculatedTeamData);
                
                setRawData(calculatedTeamData);
                setLoading(false);

            } catch (e) {
                console.error('💥 Error fetching leaderboard data:', e);
                setError(e.message);
                setRawData([]);
                setLoading(false);
            }
        };

        fetchLeaderboardData();
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
        tournamentOddsId,
        teamAssignments,
        selectedTeamGolfersMap,
        teamColors,
        isDraftStarted,
        hasManualDraftOdds
    };
};
