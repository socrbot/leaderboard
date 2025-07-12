import sampleTournamentData from './sampleTournamentData.json';
import { patchCutPlayerRounds, getHighestNonCutScore } from '../src/useGolfLeaderboard';

test('cut player penalty matches highest non-cut score + 1 for round 3 and 4', () => {
  const par = 72; // Use the actual par from your tournament data
  const players = sampleTournamentData.leaderboardRows;
  const round3Penalty = getHighestNonCutScore(players, 3, par) + 1;
  const round4Penalty = getHighestNonCutScore(players, 4, par) + 1;
  const patched = patchCutPlayerRounds(players, par, round3Penalty, round4Penalty);
  const cutPlayers = patched.filter(p => String(p.status).toLowerCase() === 'cut');
  cutPlayers.forEach(cutPlayer => {
    expect(cutPlayer.rounds.find(r => parseInt(r.roundId?.$numberInt || r.roundId) === 3).scoreToPar)
      .toBe(`+${round3Penalty}`);
    expect(cutPlayer.rounds.find(r => parseInt(r.roundId?.$numberInt || r.roundId) === 4).scoreToPar)
      .toBe(`+${round4Penalty}`);
  });
});