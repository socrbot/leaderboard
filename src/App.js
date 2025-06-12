import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import { useGolfLeaderboard } from './useGolfLeaderboard';
import TeamManagement from './components/TeamManagement';
import DraftBoard from './components/DraftBoard';

// Helper function to format scores for display, with live indicator support
const formatScoreForDisplay = (scoreObj) => {
  // If using isLive object, else fallback to normal behavior
  if (scoreObj && typeof scoreObj === 'object' && scoreObj.hasOwnProperty('score')) {
    if (scoreObj.score === null || scoreObj.score === undefined || scoreObj.score === '') {
      return '-';
    }
    // For live scores, use bold and a different color or style (e.g. blue and bold)
    if (scoreObj.isLive) {
      return <span style={{ fontWeight: 'bold', color: '#1565c0', fontVariantNumeric: 'tabular-nums' }}>{scoreObj.score > 0 ? `+${scoreObj.score}` : scoreObj.score}</span>;
    } else {
      return scoreObj.score > 0 ? `+${scoreObj.score}` : scoreObj.score.toString();
    }
  }
  // Fallback (for old logic)
  if (scoreObj === null || scoreObj === undefined || scoreObj === '') {
    return '-';
  }
  if (scoreObj > 0) {
    return `+${scoreObj}`;
  }
  return scoreObj.toString();
};

const BACKEND_BASE_URL = "https://leaderboard-backend-628169335141.us-east1.run.app/api";
const PLAYER_ODDS_API_ENDPOINT = `${BACKEND_BASE_URL}/player_odds`;

function App() {
  // ... [Other App.js code remains unchanged]

  // Pass leaderboardRefreshKey as the refreshDependency to useGolfLeaderboard
  const { rawData, loading, error, isTournamentInProgress, tournamentOddsId, selectedTeamGolfersMap, teamColors, isDraftStarted, hasManualDraftOdds } = useGolfLeaderboard(selectedTournamentId, leaderboardRefreshKey);

  // ... [Other App.js code remains unchanged]

  return (
    <div className="App">
      {/* ... [All other code remains unchanged] */}
      {selectedTournamentId ? (
        showTeamManagement ? (
          <TeamManagement
            tournamentId={selectedTournamentId}
            onTournamentCreated={handleDataUpdated}
            onTeamsSaved={handleDataUpdated}
            tournamentOddsId={tournamentOddsId}
            isDraftStarted={isDraftStarted}
            hasManualDraftOdds={hasManualDraftOdds}
            onDraftStarted={handleDataUpdated}
            onManualOddsUpdated={handleDataUpdated}
          />
        ) : (
          <main>
            {isTournamentInProgress ? (
              loading ? (
                <div>Loading leaderboard data...</div>
              ) : error ? (
                <div style={{ color: 'red' }}>Error: {error}</div>
              ) : sortedLeaderboardData.length > 0 ? (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>POS</th>
                      <th className="team-golfer-header">TEAM / GOLFER</th>
                      <th onClick={() => handleHeaderClick('total')} className="sortable-header">
                        TOTAL{renderSortArrow('total')}
                      </th>
                      <th onClick={() => handleHeaderClick('r1')} className="sortable-header">
                        R1{renderSortArrow('r1')}
                      </th>
                      <th onClick={() => handleHeaderClick('r2')} className="sortable-header">
                        R2{renderSortArrow('r2')}
                      </th>
                      <th onClick={() => handleHeaderClick('r3')} className="sortable-header">
                        R3{renderSortArrow('r3')}
                      </th>
                      <th onClick={() => handleHeaderClick('r4')} className="sortable-header">
                        R4{renderSortArrow('r4')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLeaderboardData.map((team, teamIndex) => (
                      <React.Fragment key={`team-${team.team}`}>
                        <tr className={`team-row team-${team.team.replace(/[^a-zA-Z0-9]/g, '')}`}>
                          <td>{team.position}</td>
                          <td className="team-name-cell">{team.team}</td>
                          <td className="total-cell">{formatScoreForDisplay(team.total)}</td>
                          <td>{formatScoreForDisplay(team.r1)}</td>
                          <td>{formatScoreForDisplay(team.r2)}</td>
                          <td>{formatScoreForDisplay(team.r3)}</td>
                          <td>{formatScoreForDisplay(team.r4)}</td>
                        </tr>
                        {team.golfers && team.golfers.map((golfer, golferIndex) => (
                          <tr key={`golfer-${team.team}-${golferIndex}`} className="golfer-row">
                            <td></td>
                            <td className="golfer-name-cell">{golfer.name}</td>
                            <td></td>
                            <td>{formatScoreForDisplay(golfer.r1)}</td>
                            <td>{formatScoreForDisplay(golfer.r2)}</td>
                            <td>{formatScoreForDisplay(golfer.r3)}</td>
                            <td>{formatScoreForDisplay(golfer.r4)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div>No team data available for this tournament. Select another or go to Manage Teams to assign players.</div>
              )
            ) : (
              <DraftBoard
                topPlayers={augmentedDraftBoardPlayers}
                loading={draftBoardLoading}
                error={draftBoardError}
                oddsId={tournamentOddsId}
                hasManualDraftOdds={hasManualDraftOdds}
              />
            )}
          </main>
        )
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Please create or select a tournament to get started.
          <br/><br/>
        </div>
      )}
    </div>
  );
}

export default App;
