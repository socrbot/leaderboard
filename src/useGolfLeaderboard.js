// src/useGolfLeaderboard.js
import { useState, useEffect } from 'react';

// API Constants (point to your Flask backend)
const API_ENDPOINT = "http://localhost:5000/api/leaderboard";

// Define the Par for the course
const PAR = 71;

// Team Assignments
const teamAssignments = [
  {
    name: "Ash",
    golferNames: ["Scottie Scheffler", "Jason Day", "Cameron Smith", "Daniel Berger"]
  },
  {
    name: "Wittig",
    golferNames: ["Rory McIlroy", "Tom Kim", "Corey Conners", "Tony Finau"]
  },
  {
    name: "Dingo",
    golferNames: ["Bryson DeChambeau", "Matt Fitzpatrick", "Akshay Bhatia", "Sepp Straka"]
  },
  {
    name: "Coop",
    golferNames: ["Jon Rahm", "Hideki Matsuyama", "Keegan Bradley", "Patrick Reed"]
  },
  {
    name: "Decs",
    golferNames: ["Justin Thomas", "Will Zalatoris", "Russell Henley", "Robert MacIntyre"]
  },
  {
    name: "Rusty",
    golferNames: ["Xander Schauffele", "Tommy Fleetwood", "Brian Harman", "Max Homa"]
  },
  {
    name: "Brooks",
    golferNames: ["Jordan Spieth", "Tyrrell Hatton", "Maverick McNealy", "Cameron Young"]
  },
  {
    name: "Nobes",
    golferNames: ["Ludvig Åberg", "Si Woo Kim", "Sam Burns", "Min Woo Lee"]
  },
  {
    name: "Jonny",
    golferNames: ["Joaquin Niemann", "Justin Rose", "Shane Lowry", "Adam Scott"]
  },
  {
    name: "PC",
    golferNames: ["Viktor Hovland", "Brooks Koepka", "Wyndham Clark", "Sungjae Im"]
  },
  {
    name: "Strats",
    golferNames: ["Collin Morikawa", "Patrick Cantlay", "Keith Mitchell", "Nicolai Højgaard"]
  },
];

// ALL HELPER FUNCTIONS MUST BE DECLARED BEFORE useGolfLeaderboard

const parseNumericScore = (scoreStr) => {
    if (scoreStr === "E" || scoreStr === "e" || scoreStr === null || scoreStr === undefined || scoreStr === "") {
      return 0;
    }
    const num = parseFloat(scoreStr);
    return isNaN(num) ? null : num;
};

const formatScoreForDisplay = (score) => {
    if (score === null || score === undefined || isNaN(score)) {
        return "-";
    }
    if (score === 0) {
        return "E";
    }
    return score > 0 ? `+${score}` : `${score}`;
};

const sumBestNScores = (scoresArray, n, roundPlaceholder) => {
    const scoresForSorting = scoresArray.map(score => score === null ? roundPlaceholder : score);
    const sortedScores = scoresForSorting.sort((a, b) => a - b);
    if (sortedScores.length < n) {
      return null;
    }
    return sortedScores.slice(0, n).reduce((sum, score) => sum + score, 0);
};

const transformPlayersToTeams = (players, cutRoundScorePlaceholderR3, cutRoundScorePlaceholderR4) => {
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
            roundsMap.set(roundNumber, rawStrokes - PAR);
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

// --- Main Hook (no sorting or position assignment here anymore) ---
export const useGolfLeaderboard = () => { // Removed sortColumn, sortDirection parameters
  const [rawData, setRawData] = useState([]); // Will store the fetched and transformed data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndTransformData = async () => { // Renamed for clarity
      try {
        const response = await fetch(API_ENDPOINT);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(`HTTP error! status: ${response.status} - ${errorBody.error || response.statusText}`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(`Backend Error: ${result.error} ${result.details || ''}`);
        }

        if (!result.leaderboardRows || result.leaderboardRows.length === 0) {
          throw new Error("No 'leaderboardRows' data found in API response.");
        }

        const rawPlayers = result.leaderboardRows;

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
          (maxR3Score - PAR + 1) : null;

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
          (maxR4Score - PAR + 1) : null;


        // Call transformPlayersToTeams to get the processed data
        const transformedData = transformPlayersToTeams(
          rawPlayers,
          dynamicCutRoundScorePlaceholderR3 !== null ? dynamicCutRoundScorePlaceholderR3 : 9,
          dynamicCutRoundScorePlaceholderR4 !== null ? dynamicCutRoundScorePlaceholderR4 : 10
        );

        setRawData(transformedData); // Store the transformed data (without sorting or positions yet)

      } catch (e) {
        setError(e.message);
        console.error("Error fetching leaderboard data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAndTransformData(); // Call it once on mount
    const intervalId = setInterval(fetchAndTransformData, 5 * 60 * 1000); // And then on interval
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array, so it runs only once on mount (and then by interval)

  // Return the raw data, loading, and error. Sorting will happen in App.js
  return { rawData, loading, error };
};