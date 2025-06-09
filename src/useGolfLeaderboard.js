// In src/useGolfLeaderboard.js
import { useState, useEffect, useMemo } from 'react'; // Ensure useMemo is imported

// API Constants
const BACKEND_BASE_URL = "https://leaderboard-backend-628169335141.us-east1.run.app/api";
const LEADERBOARD_API_ENDPOINT = `${BACKEND_BASE_URL}/leaderboard`;

const parseNumericScore = (scoreStr) => {
    if (scoreStr === "E" || scoreStr === "e" || scoreStr === null || scoreStr === undefined || scoreStr === "") {
      return 0;
    }
    const num = parseFloat(scoreStr);
    return isNaN(num) ? null : num;
};

const sumBestNScores = (scoresArray, n, roundPlaceholder) => {
    const scoresForSorting = scoresArray.map(score => score === null ? roundPlaceholder : score);
    const sortedScores = scoresForSorting.sort((a, b) => a - b);
    if (sortedScores.length < n) {
      return null;
    }
    return sortedScores.slice(0, n).reduce((sum, score) => sum + score, 0);
};

const transformPlayersToTeams = (players, teamAssignments, currentPar, cutRoundScorePlaceholderR3, cutRoundScorePlaceholderR4) => {
  const teamsMap = new Map();

  teamAssignments.forEach(teamDef => {
    const teamPlayers = [];
    let teamRoundsRelative = { r1: [], r2: [], r3: [], r4: [] };

    teamDef.golferNames.forEach(golferName => {
      const foundPlayer = players.find(p => `${p.firstName} ${p.lastName}` === golferName);
      if (foundPlayer) {
        const roundsMap = new Map();
        const playerStatus = foundPlayer.status;

        (foundPlayer.rounds || []).forEach(round => {
          const roundNumber = parseInt(round.roundId.$numberInt);
          const rawStrokes = parseNumericScore(round.strokes.$numberInt);
          if (rawStrokes !== null) {
            roundsMap.set(roundNumber, rawStrokes - currentPar);
          }
        });

        const golferRoundScores = {
            r1: roundsMap.has(1) ? roundsMap.get(1) : null,
            r2: roundsMap.has(2) ? roundsMap.get(2) : null,
            r3: roundsMap.has(3) ? roundsMap.get(3) : null,
            r4: roundsMap.has(4) ? roundsMap.get(4) : null,
        };

        if (playerStatus && (playerStatus.toLowerCase() === 'cut' || playerStatus.toLowerCase() === 'wd' || playerStatus.toLowerCase() === 'dq')) {
            if (golferRoundScores.r1 === null) golferRoundScores.r1 = cutRoundScorePlaceholderR4;
            if (golferRoundScores.r2 === null) golferRoundScores.r2 = cutRoundScorePlaceholderR4;
            if (golferRoundScores.r3 === null) golferRoundScores.r3 = cutRoundScorePlaceholderR3;
            if (golferRoundScores.r4 === null) golferRoundScores.r4 = cutRoundScorePlaceholderR4;
        }

        const playerProcessed = {
          name: `${foundPlayer.firstName} ${foundPlayer.lastName}`,
          status: playerStatus || 'N/A',
          r1: golferRoundScores.r1,
          r2: golferRoundScores.r2,
          r3: golferRoundScores.r3,
          r4: golferRoundScores.r4,
          total: parseNumericScore(foundPlayer.total),
          thru: foundPlayer.thru || ''
        };
        teamPlayers.push(playerProcessed);

        teamRoundsRelative.r1.push(playerProcessed.r1);
        teamRoundsRelative.r2.push(playerProcessed.r2);
        teamRoundsRelative.r3.push(playerProcessed.r3);
        teamRoundsRelative.r4.push(playerProcessed.r4);

      } else {
        console.warn(`Golfer "${golferName}" not found in API response for team "${teamDef.name}". Adding placeholder.`);
        teamPlayers.push({
          name: `${golferName} (N/A)`,
          status: '',
          r1: cutRoundScorePlaceholderR4,
          r2: cutRoundScorePlaceholderR4,
          r3: cutRoundScorePlaceholderR3,
          r4: cutRoundScorePlaceholderR4,
          total: null,
          thru: ''
        });
        teamRoundsRelative.r1.push(cutRoundScorePlaceholderR4);
        teamRoundsRelative.r2.push(cutRoundScorePlaceholderR4);
        teamRoundsRelative.r3.push(cutRoundScorePlaceholderR3);
        teamRoundsRelative.r4.push(cutRoundScorePlaceholderR4);
      }
    });

    while (teamPlayers.length < 4) {
      teamPlayers.push({
        name: `Missing Golfer ${teamPlayers.length + 1}`,
        status: '', r1: null, r2: null, r3: null, r4: null, total: null, thru: ''
      });
    }

    const calculatedTeamR1 = sumBestNScores(teamRoundsRelative.r1, 3, cutRoundScorePlaceholderR4);
    const calculatedTeamR2 = sumBestNScores(teamRoundsRelative.r2, 3, cutRoundScorePlaceholderR4);
    const calculatedTeamR3 = sumBestNScores(teamRoundsRelative.r3, 3, cutRoundScorePlaceholderR3);
    const calculatedTeamR4 = sumBestNScores(teamRoundsRelative.r4, 3, cutRoundScorePlaceholderR4);

    let teamTotalSum = 0;
    let anyRoundCalculated = false;

    if (calculatedTeamR1 !== null) { teamTotalSum += calculatedTeamR1; anyRoundCalculated = true; }
    if (calculatedTeamR2 !== null) { teamTotalSum += calculatedTeamR2; anyRoundCalculated = true; }
    if (calculatedTeamR3 !== null) { teamTotalSum += calculatedTeamR3; anyRoundCalculated = true; }
    if (calculatedTeamR4 !== null) { teamTotalSum += calculatedTeamR4; anyRoundCalculated = true; }

    const finalTeamTotal = anyRoundCalculated ? teamTotalSum : null;

    teamsMap.set(teamDef.name, {
      team: teamDef.name,
      total: finalTeamTotal,
      r1: calculatedTeamR1,
      r2: calculatedTeamR2,
      r3: calculatedTeamR3,
      r4: calculatedTeamR4,
      golfers: teamPlayers,
    });
  });

  return Array.from(teamsMap.values());
};

// --- Main Hook ---
export const useGolfLeaderboard = (tournamentId, refreshDependency) => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamAssignments, setTeamAssignments] = useState([]);
  const [isTournamentInProgress, setIsTournamentInProgress] = useState(false);
  const [tournamentOddsId, setTournamentOddsId] = useState('');
  const [isDraftStarted, setIsDraftStarted] = useState(false); // NEW: State for IsDraftStarted


  // State to hold the RapidAPI-specific identifiers AND the tournament's PAR
  const [tournamentSpecifics, setTournamentSpecifics] = useState({
    orgId: '1',
    tournId: '033',
    year: '2025',
    par: 71 // Default par, will be overwritten by fetched data
  });

  // Effect to fetch tournament details (including RapidAPI IDs, PAR, IsInProgress, OddsId, and IsDraftStarted)
  // from YOUR backend based on the Firebase tournamentId.
  useEffect(() => {
    const fetchTournamentDetails = async () => {
      if (!tournamentId) {
        console.log("No tournamentId selected, resetting states.");
        setTeamAssignments([]);
        setTournamentSpecifics({ orgId: '1', tournId: '033', year: '2025', par: 71 }); // Reset to defaults
        setIsTournamentInProgress(false); // Reset
        setTournamentOddsId(''); // Reset
        setIsDraftStarted(false); // NEW: Reset IsDraftStarted
        setLoading(false); // No tournament selected, so no data to load
        return;
      }

      setError(null); // Clear errors from previous fetches
      setLoading(true); // Set loading while fetching tournament details

      try {
        const response = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const tournamentData = await response.json();
        console.log("Fetched tournamentData from YOUR backend:", tournamentData);

        setTeamAssignments(tournamentData.teams || []); // Keep setting teamAssignments here

        // --- IMPORTANT: Update tournamentSpecifics with fetched data ---
        setTournamentSpecifics({
          orgId: tournamentData.orgId || '1',
          tournId: tournamentData.tournId || '033',
          year: tournamentData.year || '2025',
          par: tournamentData.par || 71 // Use stored par, default to 71 if missing
        });

        // Set IsInProgress, tournamentOddsId, and IsDraftStarted
        setIsTournamentInProgress(tournamentData.IsInProgress || false);
        setTournamentOddsId(tournamentData.oddsId || '');
        setIsDraftStarted(tournamentData.IsDraftStarted || false); // NEW: Set IsDraftStarted

        console.log("Updated tournamentSpecifics state with:", {
          orgId: tournamentData.orgId,
          tournId: tournamentData.tournId,
          year: tournamentData.year,
          par: tournamentData.par,
          IsInProgress: tournamentData.IsInProgress,
          oddsId: tournamentData.oddsId,
          IsDraftStarted: tournamentData.IsDraftStarted // Log new field
        });

        if (!tournamentData.teams || tournamentData.teams.length === 0) {
            setLoading(false);
        }

      } catch (e) {
        console.error("Error fetching tournament details from YOUR backend:", e);
        setError(`Failed to load tournament details: ${e.message}`);
        setTeamAssignments([]);
        setTournamentSpecifics({ orgId: '1', tournId: '033', year: '2025', par: 71 }); // Reset on error
        setIsTournamentInProgress(false); // Reset
        setTournamentOddsId(''); // Reset
        setIsDraftStarted(false); // NEW: Reset IsDraftStarted on error
        setLoading(false);
      }
    };

    fetchTournamentDetails();
  }, [tournamentId, refreshDependency]);

  // Effect to fetch player data and transform using the tournament-specific details
  useEffect(() => {
    console.log("useEffect [leaderboard dependencies] triggered.");
    console.log("Current state for leaderboard fetch conditions:",
      "tournamentId=", tournamentId,
      "teamAssignments.length=", teamAssignments.length,
      "tournamentSpecifics=", tournamentSpecifics,
      "isTournamentInProgress=", isTournamentInProgress
    );

    // Only fetch leaderboard data if the tournament is in progress (or over)
    if (!isTournamentInProgress) {
        console.log("Tournament is not in progress (or over), skipping leaderboard fetch.");
        setRawData([]); // Clear any old leaderboard data
        setLoading(false);
        return;
    }

    if (!tournamentId || teamAssignments.length === 0 || !tournamentSpecifics.tournId || !tournamentSpecifics.orgId || !tournamentSpecifics.year || tournamentSpecifics.par === undefined || tournamentSpecifics.par === null) {
      console.warn("Leaderboard fetch skipped due to missing or empty dependencies (e.g., no teams, or tournamentSpecifics not yet loaded/complete).");
      setRawData([]);
      setLoading(false);
      return;
    }

    const fetchAndTransformData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchUrl = `${LEADERBOARD_API_ENDPOINT}?tournId=${tournamentSpecifics.tournId}&orgId=${tournamentSpecifics.orgId}&year=${tournamentSpecifics.year}`;
        console.log("Attempting to fetch leaderboard data with URL:", fetchUrl);

        const response = await fetch(fetchUrl);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          console.error("Leaderboard API response not OK:", response.status, errorBody);
          throw new Error(`HTTP error! status: ${response.status} - ${errorBody.error || errorBody.message || response.statusText}`);
        }

        const result = await response.json();
        console.log("Raw RapidAPI leaderboard result (from your backend):", result);

        if (result.error) {
            console.error("RapidAPI response contained an error (passed through your backend):", result.error, result.details);
            throw new Error(`Backend Error: ${result.error} ${result.details || ''}`);
        }

        if (!result.leaderboardRows || result.leaderboardRows.length === 0) {
          console.warn("No 'leaderboardRows' data found in API response from RapidAPI. This might be why your screen is blank.");
          const transformedData = transformPlayersToTeams(
            [],
            teamAssignments,
            tournamentSpecifics.par,
            9,
            10
          );
          console.log("Transformed data (empty leaderboardRows from API):", transformedData);
          setRawData(transformedData);
          setLoading(false);
          return;
        }

        const rawPlayers = result.leaderboardRows;
        console.log("Raw players successfully extracted from API response:", rawPlayers);

        let maxR3Score = -Infinity;
        let foundAnyR3Score = false;
        rawPlayers.forEach(player => {
          const r3Round = (player.rounds || []).find(r => parseInt(r.roundId.$numberInt) === 3);
          if (r3Round) {
            const rawStrokes = parseNumericScore(r3Round.strokes.$numberInt);
            if (rawStrokes !== null) {
              maxR3Score = Math.max(maxR3Score, rawStrokes);
              foundAnyR3Score = true;
            }
          }
        });

        const dynamicCutRoundScorePlaceholderR3 = foundAnyR3Score ?
          (maxR3Score - tournamentSpecifics.par + 1) : null;

        let maxR4Score = -Infinity;
        let foundAnyR4Score = false;
        rawPlayers.forEach(player => {
          const r4Round = (player.rounds || []).find(r => parseInt(r.roundId.$numberInt) === 4);
          if (r4Round) {
            const rawStrokes = parseNumericScore(r4Round.strokes.$numberInt);
            if (rawStrokes !== null) {
              maxR4Score = Math.max(maxR4Score, rawStrokes);
              foundAnyR4Score = true;
            }
          }
        });

        const dynamicCutRoundScorePlaceholderR4 = foundAnyR4Score ?
          (maxR4Score - tournamentSpecifics.par + 1) : null;

        const transformedData = transformPlayersToTeams(
          rawPlayers,
          teamAssignments,
          tournamentSpecifics.par,
          dynamicCutRoundScorePlaceholderR3 !== null ? dynamicCutRoundScorePlaceholderR3 : 9,
          dynamicCutRoundScorePlaceholderR4 !== null ? dynamicCutRoundScorePlaceholderR4 : 10
        );

        console.log("Final transformed data for rawData state:", transformedData);
        setRawData(transformedData);
        setLoading(false);

      } catch (e) {
        setError(e.message);
        console.error("Error in fetchAndTransformData:", e);
        setRawData([]); // Clear data on error
        setLoading(false);
      }
    };

    if (teamAssignments.length > 0 && tournamentSpecifics.tournId && tournamentSpecifics.orgId && tournamentSpecifics.year && tournamentSpecifics.par !== undefined && tournamentSpecifics.par !== null) {
      fetchAndTransformData();
    } else {
      console.log("Skipping fetchAndTransformData execution: conditions not met (teams or tournamentSpecifics incomplete).");
      setLoading(false);
      setRawData([]);
    }
  }, [tournamentId, teamAssignments, tournamentSpecifics, isTournamentInProgress, refreshDependency]);

  // NEW: Memoize the selectedTeamGolfersMap directly from teamAssignments
  const selectedTeamGolfersMap = useMemo(() => {
    const newMap = {};
    if (teamAssignments && teamAssignments.length > 0) {
      teamAssignments.forEach(team => {
        team.golferNames.forEach(golferName => {
          newMap[golferName] = team.name; // Map golfer name to team name
        });
      });
    }
    return newMap;
  }, [teamAssignments]); // This will re-run whenever teamAssignments changes

  // Define some consistent colors for teams.
  const teamColors = useMemo(() => ({
    "Team A": "#FFCDD2", // Light Red
    "Team B": "#B2DFDB", // Light Teal
    "Team C": "#C8E6C9", // Light Green
    "Team D": "#FFECB3", // Light Amber
    "Team E": "#E1BEE7", // Light Purple
    "Team F": "#BBDEFB", // Light Blue
    "Team G": "#FFAB91", // Light Orange
  }), []);


  console.log("useGolfLeaderboard returning: rawData.length=", rawData.length, "loading=", loading, "error=", error, "isTournamentInProgress=", isTournamentInProgress, "tournamentOddsId=", tournamentOddsId, "teamAssignments.length=", teamAssignments.length, "isDraftStarted=", isDraftStarted);
  // ADD selectedTeamGolfersMap, teamColors, and isDraftStarted to the returned object
  return { rawData, loading, error, isTournamentInProgress, tournamentOddsId, teamAssignments, selectedTeamGolfersMap, teamColors, isDraftStarted };
};