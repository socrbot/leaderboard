import { useState, useEffect, useMemo } from 'react';
import { LEADERBOARD_API_ENDPOINT, BACKEND_BASE_URL } from './apiConfig';

const parseNumericScore = (scoreStr) => {
    if (scoreStr === "E" || scoreStr === "e" || scoreStr === null || scoreStr === undefined || scoreStr === "") {
        return 0;
    }
    const num = parseFloat(scoreStr);
    return isNaN(num) ? 0 : num;
};

const getGolferRoundScore = (player, roundNum, currentPar) => {
    if (player.rounds && Array.isArray(player.rounds)) {
        const round = player.rounds.find(r => parseInt(r.roundId?.$numberInt || r.roundId) === roundNum);
        if (round && round.strokes !== undefined && round.strokes !== null) {
            // Support both MongoDB int object and plain number
            const strokes = typeof round.strokes === 'object' && round.strokes.$numberInt !== undefined
                ? round.strokes.$numberInt
                : round.strokes;
            return { score: parseNumericScore(strokes) - currentPar, isLive: false };
        }
    }
    if (
        player.currentRound &&
        parseInt(player.currentRound.$numberInt || player.currentRound) === roundNum &&
        player.currentRoundScore !== undefined &&
        player.currentRoundScore !== null &&
        player.currentRoundScore !== ""
    ) {
        return { score: parseNumericScore(player.currentRoundScore), isLive: true };
    }
    // Not started
    return { score: null, isLive: false };
};

// Only sum if enough valid scores (≥ n)
const sumBestNScores = (scoresArray, n) => {
    const validScores = (scoresArray || [])
        .map(s => (s && typeof s.score === 'number' && s.score !== null ? s.score : null))
        .filter(s => s !== null && !isNaN(s));
    if (validScores.length < n) {
        return null;
    }
    const sortedScores = [...validScores].sort((a, b) => a - b);
    return sortedScores.slice(0, n).reduce((sum, score) => sum + score, 0);
};

const transformPlayersToTeams = (players, teamAssignments, currentPar) => {
    const teamsMap = new Map();

    (teamAssignments || []).forEach(teamDef => {
        const teamPlayers = [];
        let teamRoundsRelative = { r1: [], r2: [], r3: [], r4: [] };

        (teamDef.golferNames || []).forEach(golferName => {
            const normalizedGolferName = golferName.trim().toLowerCase();
            const foundPlayer = (players || []).find(p =>
                `${p.firstName} ${p.lastName}`.trim().toLowerCase() === normalizedGolferName
            );

            if (foundPlayer) {
                const golferRoundScores = {
                    r1: getGolferRoundScore(foundPlayer, 1, currentPar),
                    r2: getGolferRoundScore(foundPlayer, 2, currentPar),
                    r3: getGolferRoundScore(foundPlayer, 3, currentPar),
                    r4: getGolferRoundScore(foundPlayer, 4, currentPar),
                };

                const playerProcessed = {
                    name: `${foundPlayer.firstName} ${foundPlayer.lastName}`,
                    status: foundPlayer.status || 'N/A',
                    r1: golferRoundScores.r1,
                    r2: golferRoundScores.r2,
                    r3: golferRoundScores.r3,
                    r4: golferRoundScores.r4,
                    total: parseNumericScore(foundPlayer.total),
                    thru: foundPlayer.thru || ''
                };
                teamPlayers.push(playerProcessed);

                teamRoundsRelative.r1.push(golferRoundScores.r1);
                teamRoundsRelative.r2.push(golferRoundScores.r2);
                teamRoundsRelative.r3.push(golferRoundScores.r3);
                teamRoundsRelative.r4.push(golferRoundScores.r4);

            } else {
                // Placeholder golfer for missing player
                teamPlayers.push({
                    name: `${golferName} (N/A)`,
                    status: '',
                    r1: { score: null, isLive: false },
                    r2: { score: null, isLive: false },
                    r3: { score: null, isLive: false },
                    r4: { score: null, isLive: false },
                    total: null,
                    thru: ''
                });
                teamRoundsRelative.r1.push({ score: null, isLive: false });
                teamRoundsRelative.r2.push({ score: null, isLive: false });
                teamRoundsRelative.r3.push({ score: null, isLive: false });
                teamRoundsRelative.r4.push({ score: null, isLive: false });
            }
        });

        while (teamPlayers.length < 4) {
            teamPlayers.push({
                name: `Missing Golfer ${teamPlayers.length + 1}`,
                status: '',
                r1: { score: null, isLive: false },
                r2: { score: null, isLive: false },
                r3: { score: null, isLive: false },
                r4: { score: null, isLive: false },
                total: null,
                thru: ''
            });
        }

        // Team round scores: null if not enough valid, else number
        const calculatedTeamR1 = sumBestNScores(teamRoundsRelative.r1, 3);
        const calculatedTeamR2 = sumBestNScores(teamRoundsRelative.r2, 3);
        const calculatedTeamR3 = sumBestNScores(teamRoundsRelative.r3, 3);
        const calculatedTeamR4 = sumBestNScores(teamRoundsRelative.r4, 3);

        // Team total: sum of completed rounds only, or null if none
        const roundTotals = [calculatedTeamR1, calculatedTeamR2, calculatedTeamR3, calculatedTeamR4];
        const completedRounds = roundTotals.filter(rt => rt !== null);
        const teamTotalSum = completedRounds.length > 0 ? completedRounds.reduce((a, b) => a + b, 0) : null;

        teamsMap.set(teamDef.name, {
            team: teamDef.name,
            total: teamTotalSum,
            r1: calculatedTeamR1,
            r2: calculatedTeamR2,
            r3: calculatedTeamR3,
            r4: calculatedTeamR4,
            golfers: teamPlayers,
        });
    });

    return Array.from(teamsMap.values());
};

// --- PATCHING HELPERS FOR CUT PLAYER PENALTIES ---
/**
 * Patch in penalty rounds for CUT players.
 * @param {Array} players - leaderboardRows array
 * @param {number} par - course par
 * @param {number} round3Penalty - penalty scoreToPar for round 3 (e.g., 13 for +13)
 * @param {number} round4Penalty - penalty scoreToPar for round 4 (e.g., 16 for +16)
 * @returns {Array}
 */
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

// Helper to get highest non-cut scoreToPar for a round
export function getHighestNonCutScore(leaderboardRows, roundNumber) {
  let highestScoreToPar = null;
  leaderboardRows.forEach(row => {
    // Exclude cut and withdrawn players
    if (row.status !== 'cut' && row.status !== 'wd') {
      const round = row.rounds && row.rounds.find(r => r.roundId && Number(r.roundId.$numberInt) === roundNumber);
      if (round && round.scoreToPar !== undefined && round.scoreToPar !== null) {
        const scoreToPar = parseNumericScore(round.scoreToPar);
        if (highestScoreToPar === null || scoreToPar > highestScoreToPar) {
          highestScoreToPar = scoreToPar;
        }
      }
    }
  });
  // If no valid score found, fallback to highest available scoreToPar for the round
  if (highestScoreToPar === null) {
    leaderboardRows.forEach(row => {
      const round = row.rounds && row.rounds.find(r => r.roundId && Number(r.roundId.$numberInt) === roundNumber);
      if (round && round.scoreToPar !== undefined && round.scoreToPar !== null) {
        const scoreToPar = parseNumericScore(round.scoreToPar);
        if (highestScoreToPar === null || scoreToPar > highestScoreToPar) {
          highestScoreToPar = scoreToPar;
        }
      }
    });
  }
  return highestScoreToPar;
}

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
                const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const tournamentData = await response.json();

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

    useEffect(() => {
        if (!isTournamentInProgress) {
            setRawData([]);
            setLoading(false);
            return;
        }
        if (!tournamentId || teamAssignments.length === 0 || !tournamentSpecifics.tournId || !tournamentSpecifics.orgId || !tournamentSpecifics.year || tournamentSpecifics.par === undefined || tournamentSpecifics.par === null) {
            setRawData([]);
            setLoading(false);
            return;
        }
        const fetchAndTransformData = async () => {
            setLoading(true);
            setError(null);
            try {
                const fetchUrl = `${LEADERBOARD_API_ENDPOINT}?tournId=${tournamentSpecifics.tournId}&orgId=${tournamentSpecifics.orgId}&year=${tournamentSpecifics.year}`;
                const response = await fetch(fetchUrl);
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    throw new Error(`HTTP error! status: ${response.status} - ${errorBody.error || errorBody.message || response.statusText}`);
                }
                const result = await response.json();
                if (result.error) {
                    throw new Error(`Backend Error: ${result.error} ${result.details || ''}`);
                }
                const rawPlayers = result.leaderboardRows || [];
                // Calculate dynamic penalties
                const round3Penalty = (() => {
                    const val = getHighestNonCutScore(rawPlayers, 3, tournamentSpecifics.par);
                    return val !== null ? val + 1 : null;
                })();
                const round4Penalty = (() => {
                    const val = getHighestNonCutScore(rawPlayers, 4, tournamentSpecifics.par);
                    return val !== null ? val + 1 : null;
                })();
                // PATCH in cut player penalty rounds for round 3 and 4
                const patchedPlayers = patchCutPlayerRounds(
                    rawPlayers,
                    tournamentSpecifics.par,
                    round3Penalty,
                    round4Penalty
                );
                const transformedData = transformPlayersToTeams(
                    patchedPlayers,
                    teamAssignments,
                    tournamentSpecifics.par
                );
                setRawData(transformedData);
                setLoading(false);
            } catch (e) {
                setError(e.message);
                setRawData([]);
                setLoading(false);
            }
        };
        if (teamAssignments.length > 0 && tournamentSpecifics.tournId && tournamentSpecifics.orgId && tournamentSpecifics.year && tournamentSpecifics.par !== undefined && tournamentSpecifics.par !== null) {
            fetchAndTransformData();
        } else {
            setLoading(false);
            setRawData([]);
        }
    }, [tournamentId, teamAssignments, tournamentSpecifics, isTournamentInProgress, refreshDependency]);
    const selectedTeamGolfersMap = useMemo(() => {
        const newMap = {};
        if (teamAssignments && teamAssignments.length > 0) {
            teamAssignments.forEach(team => {
                team.golferNames.forEach(golferName => {
                    newMap[golferName] = team.name;
                });
            });
        }
        return newMap;
    }, [teamAssignments]);

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

