import React, { useState, useEffect, useMemo } from 'react';
import { TOURNAMENTS_API_ENDPOINT } from '../apiConfig';
import { BACKEND_BASE_URL } from '../apiConfig';

// Helper function to parse numeric scores (copied from useGolfLeaderboard)
const parseNumericScore = (scoreStr) => {
    if (scoreStr === "E" || scoreStr === "e" || scoreStr === null || scoreStr === undefined || scoreStr === "") {
        return 0;
    }
    const num = parseFloat(scoreStr);
    return isNaN(num) ? 0 : num;
};

// Helper to get highest non-cut scoreToPar for a round (copied from useGolfLeaderboard)
const getHighestNonCutScore = (leaderboardRows, roundNumber) => {
  let highestScoreToPar = null;
  leaderboardRows.forEach(row => {
    // Exclude cut and withdrawn players
    if (row.status !== 'cut' && row.status !== 'wd') {
      // Try to find by roundId first
      let round = row.rounds && row.rounds.find(r => {
        const id = parseInt(r.roundId?.$numberInt || r.roundId);
        return !isNaN(id) && id === roundNumber;
      });
      
      // If roundId is not available or empty, use array index (0-based to 1-based)
      if (!round && row.rounds && row.rounds.length >= roundNumber) {
        round = row.rounds[roundNumber - 1];
      }
      
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
      // Try to find by roundId first
      let round = row.rounds && row.rounds.find(r => {
        const id = parseInt(r.roundId?.$numberInt || r.roundId);
        return !isNaN(id) && id === roundNumber;
      });
      
      // If roundId is not available or empty, use array index (0-based to 1-based)
      if (!round && row.rounds && row.rounds.length >= roundNumber) {
        round = row.rounds[roundNumber - 1];
      }
      
      if (round && round.scoreToPar !== undefined && round.scoreToPar !== null) {
        const scoreToPar = parseNumericScore(round.scoreToPar);
        if (highestScoreToPar === null || scoreToPar > highestScoreToPar) {
          highestScoreToPar = scoreToPar;
        }
      }
    });
  }
  return highestScoreToPar;
};

// Patch in penalty rounds for CUT players (copied from useGolfLeaderboard)
const patchCutPlayerRounds = (players, par, round3Penalty, round4Penalty) => {
    return players.map(player => {
        if (String(player.status).toLowerCase() === 'cut') {
            let newRounds = player.rounds ? [...player.rounds] : [];
            const penalties = [
                { round: 3, value: round3Penalty },
                { round: 4, value: round4Penalty }
            ];
            penalties.forEach(({ round, value }) => {
                if (value !== null) {
                    // Try to find by roundId first
                    let roundIdx = newRounds.findIndex(r => {
                        const id = parseInt(r.roundId?.$numberInt || r.roundId);
                        return !isNaN(id) && id === round;
                    });
                    
                    // If roundId is not available, use array index (0-based to 1-based)
                    if (roundIdx === -1 && newRounds.length >= round) {
                        roundIdx = round - 1;
                    }
                    
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
                }
            });
            newRounds = newRounds.sort((a, b) => {
                const aId = parseInt(a.roundId?.$numberInt || a.roundId);
                const bId = parseInt(b.roundId?.$numberInt || b.roundId);
                // If roundId is not available, use array index
                return (!isNaN(aId) && !isNaN(bId)) ? aId - bId : 0;
            });
            return { ...player, rounds: newRounds };
        }
        return player;
    });
};

// Helper function to get golfer round score (simplified version)
const getGolferRoundScore = (player, roundNum, currentPar) => {
    if (player.rounds && Array.isArray(player.rounds)) {
        // Try to find by roundId first
        let round = player.rounds.find(r => {
            const id = parseInt(r.roundId?.$numberInt || r.roundId);
            return !isNaN(id) && id === roundNum;
        });
        
        // If roundId is not available or empty, use array index (0-based to 1-based)
        if (!round && player.rounds.length >= roundNum) {
            round = player.rounds[roundNum - 1];
        }
        
        if (round && round.strokes !== undefined && round.strokes !== null) {
            const strokes = typeof round.strokes === 'object' && round.strokes.$numberInt !== undefined
                ? parseInt(round.strokes.$numberInt)
                : parseInt(round.strokes);
            if (!isNaN(strokes)) {
                return { score: strokes - currentPar, isLive: false };
            }
        }
    }
    return { score: null, isLive: false };
};

// Only sum if enough valid scores (≥ n) - copied from useGolfLeaderboard
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

// Function to fetch global teams that participate in annual championship
const fetchGlobalAnnualTeams = async () => {
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/global_teams`);
        if (!response.ok) {
            throw new Error(`Failed to fetch global teams: ${response.status}`);
        }
        const allTeams = await response.json();
        // Filter teams that participate in annual championship
        return allTeams.filter(team => team.participatesInAnnual !== false);
    } catch (error) {
        console.error('Error fetching global annual teams:', error);
        return [];
    }
};

// Simplified team transformation for Annual Championship
const transformPlayersToTeams = (players, teamAssignments, currentPar) => {
    const teamsData = [];

    // Process all provided teams (already filtered to annual participants)
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
                    total: parseNumericScore(foundPlayer.total),
                    r1: golferRoundScores.r1,
                    r2: golferRoundScores.r2,
                    r3: golferRoundScores.r3,
                    r4: golferRoundScores.r4,
                };
                teamPlayers.push(playerProcessed);

                teamRoundsRelative.r1.push(golferRoundScores.r1);
                teamRoundsRelative.r2.push(golferRoundScores.r2);
                teamRoundsRelative.r3.push(golferRoundScores.r3);
                teamRoundsRelative.r4.push(golferRoundScores.r4);
            }
        });

        // Calculate team scores using best 3 players per round (same as main leaderboard)
        const calculatedTeamR1 = sumBestNScores(teamRoundsRelative.r1, 3);
        const calculatedTeamR2 = sumBestNScores(teamRoundsRelative.r2, 3);
        const calculatedTeamR3 = sumBestNScores(teamRoundsRelative.r3, 3);
        const calculatedTeamR4 = sumBestNScores(teamRoundsRelative.r4, 3);

        // Team total: sum of completed rounds only, or null if none
        const roundTotals = [calculatedTeamR1, calculatedTeamR2, calculatedTeamR3, calculatedTeamR4];
        const completedRounds = roundTotals.filter(rt => rt !== null);
        const teamTotalSum = completedRounds.length > 0 ? completedRounds.reduce((a, b) => a + b, 0) : null;

        if (teamTotalSum !== null) {
            teamsData.push({
                team: teamDef.name,
                total: teamTotalSum,
                r1: calculatedTeamR1,
                r2: calculatedTeamR2,
                r3: calculatedTeamR3,
                r4: calculatedTeamR4,
                golfers: teamPlayers
            });
        }
    });

    return teamsData;
};

const AnnualChampionship = () => {
  const [tournaments, setTournaments] = useState([]);
  const [annualTeams, setAnnualTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch all tournaments for the year
  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('🔍 Annual Championship: Starting to fetch tournaments...');
        const response = await fetch(TOURNAMENTS_API_ENDPOINT);
        if (!response.ok) throw new Error('Failed to fetch tournaments');
        
        const allTournaments = await response.json();
        console.log('📅 Annual Championship: Found tournaments:', allTournaments.length);
        
        // Filter tournaments by year and only include completed drafts
        const yearTournaments = allTournaments.filter(tournament => {
          // If we don't have date metadata, we'll need to fetch the tournament details
          // For now, let's include all tournaments and check their creation date from detailed data
          return true; // We'll filter by year after getting full tournament data
        });

        // Fetch detailed data for each tournament
        const tournamentDetails = await Promise.all(
          yearTournaments.map(async (tournament) => {
            try {
              console.log(`🏌️ Annual Championship: Processing tournament ${tournament.name} (${tournament.id})`);
              // Get full tournament data first
              const tournamentResponse = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${tournament.id}`);
              const fullTournamentData = await tournamentResponse.json();
              
              // Check year from full tournament data
              const tournamentYear = fullTournamentData.created_at ? 
                new Date(fullTournamentData.created_at).getFullYear() :
                fullTournamentData.date ?
                new Date(fullTournamentData.date).getFullYear() :
                selectedYear; // Default to selected year if no date info
              
              console.log(`📅 Tournament ${tournament.name} year: ${tournamentYear} (looking for ${selectedYear})`);
              
              if (tournamentYear !== selectedYear) {
                console.log(`⏭️ Skipping ${tournament.name} - wrong year`);
                return null;
              }
              
              // Check if draft is complete
              const statusResponse = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${tournament.id}/draft_status`);
              const status = await statusResponse.json();
              
              console.log(`📝 Draft status for ${tournament.name}:`, status);
              
              if (!status.IsDraftComplete) {
                console.log(`⏭️ Skipping ${tournament.name} - draft not complete`);
                return null;
              }

              // Get leaderboard data using the correct endpoint pattern
              // Use the same pattern as useGolfLeaderboard.js
              console.log(`Fetching leaderboard for ${tournament.name}:`, {
                tournId: fullTournamentData.tournId,
                orgId: fullTournamentData.orgId,
                year: fullTournamentData.year
              });
              
              const leaderboardUrl = `${TOURNAMENTS_API_ENDPOINT.replace('/tournaments', '/leaderboard')}?tournId=${fullTournamentData.tournId}&orgId=${fullTournamentData.orgId}&year=${fullTournamentData.year}`;
              console.log(`Leaderboard URL for ${tournament.name}:`, leaderboardUrl);
              
              const leaderboardResponse = await fetch(leaderboardUrl);
              
              if (!leaderboardResponse.ok) {
                console.log(`Tournament ${tournament.name} leaderboard failed:`, leaderboardResponse.status, leaderboardResponse.statusText);
                // Tournament has completed draft but no leaderboard data yet
                return {
                  ...tournament,
                  ...fullTournamentData,
                  leaderboardData: [], // Empty leaderboard for now
                  status,
                  hasLeaderboard: false
                };
              }
              
              const leaderboardApiData = await leaderboardResponse.json();
              console.log(`Leaderboard API data for ${tournament.name}:`, leaderboardApiData);
              
              // Transform the API data to team format using the same logic as useGolfLeaderboard
              const rawPlayers = leaderboardApiData.leaderboardRows || [];
              console.log(`Raw players for ${tournament.name}:`, rawPlayers.length, 'players');
              
              // Apply cut player penalties (same as main leaderboard)
              const currentPar = fullTournamentData.par || 72;
              
              // Calculate dynamic penalties
              const round3Penalty = (() => {
                const val = getHighestNonCutScore(rawPlayers, 3);
                return val !== null ? val + 1 : null;
              })();
              const round4Penalty = (() => {
                const val = getHighestNonCutScore(rawPlayers, 4);
                return val !== null ? val + 1 : null;
              })();
              
              console.log(`Cut penalties for ${tournament.name}:`, { round3Penalty, round4Penalty });
              
              // PATCH in cut player penalty rounds for round 3 and 4
              const patchedPlayers = patchCutPlayerRounds(
                rawPlayers,
                currentPar,
                round3Penalty,
                round4Penalty
              );
              
              // Get the tournament's team assignments
              const tournamentTeams = fullTournamentData.teams || [];
              console.log(`Tournament teams for ${tournament.name}:`, tournamentTeams.length, 'teams');
              
              // Get global annual teams to filter which teams participate
              const globalAnnualTeams = await fetchGlobalAnnualTeams();
              const annualTeamNames = globalAnnualTeams.map(team => team.name);
              console.log(`Global annual team names:`, annualTeamNames);
              
              // Filter tournament teams to only include those that participate in annual championship
              const annualTournamentTeams = tournamentTeams.filter(team => 
                annualTeamNames.includes(team.name)
              );
              console.log(`🏆 Annual tournament teams for ${tournament.name}:`, annualTournamentTeams.length, 'teams');
              console.log(`🏆 Annual tournament teams detail:`, annualTournamentTeams);
              
              const teamLeaderboardData = transformPlayersToTeams(patchedPlayers, annualTournamentTeams, currentPar);
              console.log(`📊 Team leaderboard data for ${tournament.name}:`, teamLeaderboardData);
              
              return {
                ...tournament,
                ...fullTournamentData,
                leaderboardData: teamLeaderboardData,
                status,
                hasLeaderboard: true
              };
            } catch (error) {
              console.error(`💥 Error fetching data for tournament ${tournament.id}:`, error);
              return null;
            }
          })
        );

        const validTournaments = tournamentDetails.filter(Boolean);
        console.log(`✅ Valid tournaments for Annual Championship:`, validTournaments.length);
        console.log(`📋 Valid tournaments detail:`, validTournaments.map(t => ({name: t.name, hasLeaderboard: t.hasLeaderboard, teamCount: t.leaderboardData?.length || 0})));
        setTournaments(validTournaments);
        
        // Calculate annual standings
        calculateAnnualStandings(validTournaments);
        
      } catch (error) {
        console.error('💥 Error fetching tournaments:', error);
        setError('Failed to load annual championship data');
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [selectedYear]);

  const calculateAnnualStandings = (tournaments) => {
    console.log(`🧮 Calculating annual standings from ${tournaments.length} tournaments...`);
    const teamScores = {};

    // Process each tournament
    tournaments.forEach(tournament => {
      const tournamentName = tournament.name;
      
      if (tournament.leaderboardData && Array.isArray(tournament.leaderboardData)) {
        tournament.leaderboardData.forEach(teamData => {
          const teamName = teamData.team;
          const finalScore = teamData.total;

          if (!teamScores[teamName]) {
            teamScores[teamName] = {
              teamName,
              tournaments: {},
              totalScore: 0,
              tournamentsPlayed: 0
            };
          }

          if (finalScore !== null && finalScore !== undefined && !isNaN(finalScore)) {
            teamScores[teamName].tournaments[tournamentName] = finalScore;
            teamScores[teamName].totalScore += finalScore;
            teamScores[teamName].tournamentsPlayed++;
          }
        });
      }
    });

    // Convert to array and sort by total score
    const sortedTeams = Object.values(teamScores)
      .filter(team => team.tournamentsPlayed > 0) // Only include teams that played
      .sort((a, b) => a.totalScore - b.totalScore) // Lower scores are better in golf
      .map((team, index) => ({
        ...team,
        position: index + 1
      }));

    setAnnualTeams(sortedTeams);
  };

  const formatScore = (score) => {
    if (score === null || score === undefined) return '-';
    if (score === 0) return 'E';
    return score > 0 ? `+${score}` : score.toString();
  };

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    // Only show 2025 and later years
    const startYear = Math.max(2025, currentYear);
    return [startYear];
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
        <p>Loading annual championship data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  const tournamentNames = tournaments.map(t => t.name);

  return (
    <div className="annual-championship">
      <div className="annual-header">
        <h2 className="annual-title">🏆 Annual Golf Championship</h2>
        <div className="year-selector">
          <label htmlFor="year-select">Year:</label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="modern-select"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
          <p>No tournaments found for {selectedYear}</p>
          <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
            Create tournaments with completed drafts to see annual championship standings.
          </p>
        </div>
      ) : annualTeams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
          <h3>Tournaments Found ({tournaments.length})</h3>
          <div style={{ marginBottom: '20px' }}>
            {tournaments.map((tournament, index) => (
              <div key={tournament.id} style={{ 
                padding: '10px', 
                margin: '5px 0',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '5px',
                border: tournament.hasLeaderboard ? '1px solid #4caf50' : '1px solid #ff9800'
              }}>
                <strong>{tournament.name}</strong>
                <br />
                <span style={{ 
                  fontSize: '0.8rem', 
                  color: tournament.hasLeaderboard ? '#4caf50' : '#ff9800' 
                }}>
                  {tournament.hasLeaderboard ? '✅ Has Leaderboard Data' : '⏳ Waiting for Tournament Results'}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.9rem' }}>
            Annual championship will show team standings once tournaments have leaderboard data.
          </p>
        </div>
      ) : (
        <div className="annual-table-container">
          <table className="annual-table">
            <thead>
              <tr>
                <th>POS</th>
                <th>TEAM</th>
                {tournamentNames.map(name => (
                  <th key={name} className="tournament-column">{name}</th>
                ))}
                <th className="total-column">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {annualTeams.map((team) => (
                <tr key={team.teamName} className="annual-team-row">
                  <td className="position-cell">{team.position}</td>
                  <td className="team-name-cell">{team.teamName}</td>
                  {tournamentNames.map(tournamentName => (
                    <td key={tournamentName} className="score-cell">
                      {formatScore(team.tournaments[tournamentName])}
                    </td>
                  ))}
                  <td className="total-cell">
                    <strong>{formatScore(team.totalScore)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="annual-stats">
        <p>
          <strong>{tournaments.length}</strong> tournaments completed • 
          <strong> {annualTeams.length}</strong> teams participating •
          <strong> {annualTeams.reduce((total, team) => total + team.tournamentsPlayed, 0)}</strong> total team entries
        </p>
      </div>
    </div>
  );
};

export default AnnualChampionship;
