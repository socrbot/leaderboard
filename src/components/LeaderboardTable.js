// src/components/LeaderboardTable.js
import React, { memo, useMemo, useState, useCallback } from 'react';

const LeaderboardRow = memo(({ team, formatScoreForDisplay }) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(prev => !prev), []);
  const hasCut = team.golfers && team.golfers.some(g => g.status && g.status.toUpperCase() === 'CUT');

  return (
    <React.Fragment key={`team-${team.team}`}>
      <tr
        className={`team-row team-${team.team.replace(/[^a-zA-Z0-9]/g, '')} team-row-expandable`}
        onClick={toggle}
        title={expanded ? 'Collapse golfers' : 'Expand golfers'}
      >
        <td>{team.position}</td>
        <td className="team-name-cell">
          <span className="team-expand-icon">{expanded ? '▾' : '▸'}</span>
          {team.team}
          {hasCut && <span className="team-cut-badge">CUT</span>}
        </td>
        <td className="total-cell">{formatScoreForDisplay(team.total)}</td>
        <td>{formatScoreForDisplay(team.r1)}</td>
        <td>{formatScoreForDisplay(team.r2)}</td>
        <td>{formatScoreForDisplay(team.r3)}</td>
        <td>{formatScoreForDisplay(team.r4)}</td>
      </tr>
      {expanded && team.golfers && team.golfers.map((golfer, golferIndex) => {
        const isCut = golfer.status && golfer.status.toUpperCase() === 'CUT';
        return (
          <tr key={`golfer-${team.team}-${golferIndex}`} className={`golfer-row${isCut ? ' golfer-row-cut' : ''}`}>
            <td></td>
            <td className="golfer-name-cell">
              <span className="golfer-name-text">{golfer.name}</span>
              {isCut && <span className="golfer-cut-label">CUT</span>}
              {!isCut && golfer.status && golfer.status !== 'active' && (
                <span className="golfer-status-label">{golfer.status}</span>
              )}
            </td>
            <td></td>
            <td>{formatScoreForDisplay(golfer.r1)}</td>
            <td>{formatScoreForDisplay(golfer.r2)}</td>
            <td>{formatScoreForDisplay(golfer.r3)}</td>
            <td>{formatScoreForDisplay(golfer.r4)}</td>
          </tr>
        );
      })}
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
