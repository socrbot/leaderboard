// src/utils/playerOddsUtils.js

// Function to calculate average odds for each player
export const calculateAverageOdds = (playerOddsData) => {
  const playerOddsMap = new Map();

  // Assuming playerOddsData is an array of objects like { Name: "Player", OddsToWin: 10000.00 }
  // from your backend's /api/player_odds endpoint
  for (const playerEntry of playerOddsData) {
    const playerName = playerEntry.name; // Assuming backend returns "name"
    const oddsToWin = playerEntry.averageOdds; // Assuming backend returns "averageOdds"

    // Your backend's calculate_average_odds already filters and averages.
    // So here, we just make sure the data is structured as expected.
    if (playerName && oddsToWin !== null && oddsToWin !== undefined) {
      if (playerOddsMap.has(playerName)) {
        playerOddsMap.get(playerName).push(oddsToWin);
      } else {
        playerOddsMap.set(playerName, [oddsToWin]);
      }
    }
  }

  const averagedOdds = [];
  playerOddsMap.forEach((oddsArray, playerName) => {
    // This re-averaging might not be necessary if your backend already sends averaged data
    // but keep it for robustness if the backend sends raw list or if we change source later.
    const validOdds = oddsArray.filter(odds => odds > 0);

    if (validOdds.length > 0) {
      const sum = validOdds.reduce((acc, current) => acc + current, 0);
      const average = sum / validOdds.length;
      averagedOdds.push({
        name: playerName,
        averageOdds: average
      });
    } else {
      averagedOdds.push({
        name: playerName,
        averageOdds: null
      });
    }
  });

  // Optionally sort by average odds (lowest first)
  averagedOdds.sort((a, b) => {
    if (a.averageOdds === null) return 1; // Nulls last
    if (b.averageOdds === null) return -1; // Nulls last
    return a.averageOdds - b.averageOdds;
  });

  return averagedOdds;
};