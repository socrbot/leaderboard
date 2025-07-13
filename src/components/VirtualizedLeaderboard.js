// src/components/VirtualizedLeaderboard.js
import React, { memo, useMemo, useState, useEffect } from 'react';

const VirtualizedLeaderboard = memo(({ 
  sortedLeaderboardData, 
  formatScoreForDisplay, 
  handleHeaderClick, 
  renderSortArrow 
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [containerHeight, setContainerHeight] = useState(600);
  const itemHeight = 120; // Approximate height per team (including golfers)

  useEffect(() => {
    const handleScroll = (e) => {
      const scrollTop = e.target.scrollTop;
      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.min(start + Math.ceil(containerHeight / itemHeight) + 5, sortedLeaderboardData.length);
      
      setVisibleRange({ start, end });
    };

    const container = document.getElementById('leaderboard-container');
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [containerHeight, sortedLeaderboardData.length]);

  const visibleData = useMemo(() => 
    sortedLeaderboardData.slice(visibleRange.start, visibleRange.end),
    [sortedLeaderboardData, visibleRange]
  );

  const totalHeight = sortedLeaderboardData.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div 
      id="leaderboard-container"
      style={{ 
        height: containerHeight, 
        overflowY: 'auto',
        border: '1px solid #444',
        borderRadius: '8px'
      }}
    >
      <table className="leaderboard-table" style={{ position: 'relative' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
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
          {/* Spacer for items above visible range */}
          {visibleRange.start > 0 && (
            <tr style={{ height: offsetY }}>
              <td colSpan="7"></td>
            </tr>
          )}
          
          {visibleData.map((team, index) => {
            const actualIndex = visibleRange.start + index;
            return (
              <React.Fragment key={`team-${team.team}-${actualIndex}`}>
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
                  <tr key={`golfer-${team.team}-${golferIndex}-${actualIndex}`} className="golfer-row">
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
            );
          })}
          
          {/* Spacer for items below visible range */}
          {visibleRange.end < sortedLeaderboardData.length && (
            <tr style={{ height: totalHeight - offsetY - (visibleRange.end - visibleRange.start) * itemHeight }}>
              <td colSpan="7"></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default VirtualizedLeaderboard;
