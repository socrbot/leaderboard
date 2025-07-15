// src/components/DraftBoard.js
import React from 'react';

const DraftBoard = ({ topPlayers, loading, error, oddsId, hasManualDraftOdds, teams, draftPicks }) => { // NEW: Receive teams and draftPicks props
  // Helper function to get the next pick number
  const getNextPickNumber = () => {
    if (!draftPicks || !Array.isArray(draftPicks)) return 1;
    return draftPicks.length + 1;
  };

  // Helper function to get current drafting team
  const getCurrentDraftingTeam = () => {
    if (!teams || !Array.isArray(teams) || teams.length === 0) return null;
    
    const nextPickNumber = getNextPickNumber();
    const sortedTeams = [...teams].sort((a, b) => (a.draftOrder || 999) - (b.draftOrder || 999));
    
    // Calculate which team should be picking based on snake draft pattern
    const round = Math.ceil(nextPickNumber / teams.length);
    const pickInRound = ((nextPickNumber - 1) % teams.length) + 1;
    
    // If odd round, pick in order. If even round, pick in reverse order (snake draft)
    const teamIndex = round % 2 === 1 ? pickInRound - 1 : teams.length - pickInRound;
    
    return sortedTeams[teamIndex] || null;
  };

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      

      {/* Main container with draft order and draft board side by side */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        maxWidth: '1200px', 
        margin: '20px auto',
        alignItems: 'stretch'
      }}>
        
        {/* Draft Order Column */}
        <div style={{ 
          width: '200px',
          backgroundColor: '#333', 
          borderRadius: '8px', 
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          border: '1px solid #555',
          padding: '15px',
          flexShrink: 0,
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ marginTop: '0', marginBottom: '15px', textAlign: 'center', fontSize: '1.1em' }}>Draft Order</h3>
          
          {teams && teams.length > 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Teams in draft order */}
              <div style={{ marginBottom: '15px', flex: 1 }}>
                {[...teams]
                  .filter(team => team.draftOrder !== null && team.draftOrder !== undefined)
                  .sort((a, b) => a.draftOrder - b.draftOrder)
                  .map((team, index) => (
                    <div key={team.name} style={{
                      padding: '8px',
                      marginBottom: '5px',
                      backgroundColor: getCurrentDraftingTeam()?.name === team.name ? '#FFD700' : '#4A4A4A',
                      color: getCurrentDraftingTeam()?.name === team.name ? '#000' : '#fff',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                      border: getCurrentDraftingTeam()?.name === team.name ? '2px solid #FFD700' : '1px solid #666'
                    }}>
                      <div style={{ fontWeight: 'bold' }}>{team.draftOrder}. {team.name}</div>
                      <div style={{ 
                        fontSize: '0.8em', 
                        color: getCurrentDraftingTeam()?.name === team.name ? '#333' : '#ccc',
                        marginTop: '2px' 
                      }}>
                        {team.golferNames.length} player{team.golferNames.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))
                }
              </div>
              
              {/* Next pick indicator */}
              <div style={{ 
                textAlign: 'center', 
                padding: '8px', 
                backgroundColor: '#1a1a1a', 
                borderRadius: '4px',
                fontSize: '0.9em'
              }}>
                <div style={{ fontWeight: 'bold' }}>Next Pick: #{getNextPickNumber()}</div>
                {getCurrentDraftingTeam() && (
                  <div style={{ color: '#FFD700', marginTop: '4px', fontSize: '0.8em' }}>
                    {getCurrentDraftingTeam().name}'s turn
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#ccc', fontSize: '0.9em' }}>
              No teams with draft order assigned yet.
            </p>
          )}
        </div>

        {/* Draft Board Table Card */}
        <div style={{ 
          flex: 1,
          backgroundColor: '#333', 
          borderRadius: '8px', 
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          border: '1px solid #555',
          padding: '15px',
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ marginTop: '0', marginBottom: '15px', textAlign: 'center', fontSize: '1.1em' }}>Draft Board</h3>
          
          {loading ? (
            <p style={{ textAlign: 'center', color: '#ccc' }}>Loading draft board players...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: 'red' }}>{error}</p>
          ) : topPlayers.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#ccc' }}>
              No draft board players available for this tournament. Ensure the Odds ID ({oddsId}) is correct, or upload manual odds.
            </p>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #555', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: '#2a2a2a', flex: 1 }}>
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
                                    {player.pickNumber && (
                                      <span style={{ fontSize: '0.6em', marginLeft: '5px', fontWeight: 'bold', color: cellTextColor }}>
                                        #{player.pickNumber}
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
      </div>
    </div>
  );
};

export default DraftBoard;