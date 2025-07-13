// src/components/DraftBoard.js
import React from 'react';

const DraftBoard = ({ topPlayers, loading, error, oddsId, hasManualDraftOdds }) => { // NEW: Receive hasManualDraftOdds prop
  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h2 style={{ marginTop: '30px', textAlign: 'center' }}>Draft Board</h2>

      
      {loading ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Loading draft board players...</p>
      ) : error ? (
        <p style={{ textAlign: 'center', color: 'red' }}>{error}</p>
      ) : topPlayers.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>
          No draft board players available for this tournament. Ensure the Odds ID ({oddsId}) is correct, or upload manual odds.
        </p>
      ) : (
        <div style={{ maxWidth: '1000px', margin: '20px auto', overflowX: 'auto', border: '1px solid #555', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', backgroundColor: '#333' }}>
          <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', color: 'white', fontFamily: 'Arial, sans-serif' }}>
            <thead>
              <tr>
                <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '8px 0 0 0' }}>Tier 1</th>
                <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555' }}>Tier 2</th>
                <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555' }}>Tier 3</th>
                <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '0 8px 0 0' }}>Tier 4</th>
              </tr>
              <tr>
                <th style={{ padding: '10px 5px', textAlign: 'left', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '8px 0 0 0', width: '20%' }}>Player</th>
                <th style={{ padding: '10px 5px', textAlign: 'right', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '5%' }}>Odds</th>
                <th style={{ padding: '10px 5px', textAlign: 'left', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '20%' }}>Player</th>
                <th style={{ padding: '10px 5px', textAlign: 'right', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '5%' }}>Odds</th>
                <th style={{ padding: '10px 5px', textAlign: 'left', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '20%' }}>Player</th>
                <th style={{ padding: '10px 5px', textAlign: 'right', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '5%' }}>Odds</th>
                <th style={{ padding: '10px 5px', textAlign: 'left', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '0 8px 0 0', width: '20%' }}>Player</th>
                <th style={{ padding: '10px 5px', textAlign: 'right', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '0 8px 0 0', width: '5%' }}>Odds</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(11)].map((_, rowIndex) => {
                return (
                  <tr key={rowIndex} style={{ backgroundColor: rowIndex % 2 === 0 ? '#4A4A4A' : '#525252' }}>
                    {[...Array(4)].map((_, colIndex) => {
                      const playerIndexInArray = colIndex * 11 + rowIndex;
                      const player = topPlayers[playerIndexInArray];
                      const isLastColInRow = colIndex === 3;

                      // Determine background color and text color based on team assignment
                      let cellBackgroundColor = (rowIndex % 2 === 0 ? '#4A4A4A' : '#525252');
                      let cellTextColor = 'white'; // Default text color for unselected players

                      if (player && player.teamAssigned) {
                          // If a player is assigned, use their specific team color
                          cellBackgroundColor = player.teamColor;
                          cellTextColor = 'black'; // Ensure text is black for all highlight colors
                      }

                      return (
                        <React.Fragment key={colIndex}>
                          {player ? (
                            <>
                              <td style={{
                                padding: '8px 5px',
                                textAlign: 'left',
                                borderRight: '1px dotted #555',
                                backgroundColor: cellBackgroundColor, // Apply dynamic color
                                color: cellTextColor // Apply dynamic text color
                              }}>
                                {player.name}
                                {player.teamAssigned && (
                                  <span style={{ fontSize: '0.7em', marginLeft: '5px', opacity: 0.8, color: cellTextColor }}>
                                    ({player.teamAssigned})
                                  </span>
                                )}
                              </td>
                              <td style={{
                                padding: '8px 5px',
                                textAlign: 'right',
                                borderRight: isLastColInRow ? 'none' : '1px dotted #555',
                                backgroundColor: cellBackgroundColor, // Apply dynamic color
                                color: cellTextColor // Apply dynamic text color
                              }}>
                                {player.averageOdds !== null ? player.averageOdds.toFixed(2) : 'N/A'}
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '8px 5px', borderRight: '1px dotted #555' }}></td>
                              <td style={{ padding: '8px 5px', borderRight: isLastColInRow ? 'none' : '1px dotted #555' }}></td>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DraftBoard;