// src/components/LeaderboardTable.js
import React, { memo, useMemo } from 'react';

const LeaderboardRow = memo(({ team, formatScoreForDisplay }) => (
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
        <td className="golfer-name-cell">
          {golfer.name}
          {golfer.status && golfer.status.toUpperCase() === 'CUT' && (
            <span style={{ color: 'red', marginLeft: 6 }}>(CUT)</span>
          )}
        </td>
        <td></td>
        <td>{formatScoreForDisplay(golfer.r1)}</td>
        <td>{formatScoreForDisplay(golfer.r2)}</td>
        <td>{formatScoreForDisplay(golfer.r3)}</td>
        <td>{formatScoreForDisplay(golfer.r4)}</td>
      </tr>
    ))}
  </React.Fragment>
));

const LeaderboardTable = memo(({ 
  sortedLeaderboardData, 
  formatScoreForDisplay, 
  handleHeaderClick, 
  renderSortArrow 
}) => {
  const renderedRows = useMemo(() => 
    sortedLeaderboardData.map((team) => (
      <LeaderboardRow 
        key={`team-${team.team}`}
        team={team} 
        formatScoreForDisplay={formatScoreForDisplay} 
      />
    )), 
    [sortedLeaderboardData, formatScoreForDisplay]
  );

  return (
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
        {renderedRows}
      </tbody>
    </table>
  );
});

export default LeaderboardTable;
