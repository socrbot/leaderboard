// src/components/DraftBoard.js
import React, { useState, useEffect } from 'react';

const DraftBoard = ({ topPlayers, loading, error, oddsId, hasManualDraftOdds, teams, draftPicks }) => { // NEW: Receive teams and draftPicks props
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [currentTierView, setCurrentTierView] = useState(0); // 0 = Tiers 1&2, 1 = Tiers 3&4

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    <div style={{ 
      padding: isMobile ? '10px' : '20px', 
      color: 'white' 
    }}>
      

      {/* Main container - responsive layout */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '15px' : '20px', 
        maxWidth: '1200px', 
        margin: isMobile ? '10px auto' : '20px auto',
        alignItems: 'stretch'
      }}>
        
        {/* Draft Order Column */}
        <div style={{ 
          width: isMobile ? '100%' : '200px',
          backgroundColor: '#333', 
          borderRadius: '8px', 
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          border: '1px solid #555',
          padding: isMobile ? '12px' : '15px',
          flexShrink: 0,
          minHeight: isMobile ? 'auto' : '500px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {teams && teams.length > 0 ? (
            <div style={{ 
              flex: 1, 
              display: isMobile ? 'block' : 'flex', 
              flexDirection: 'column' 
            }}>
              {/* Teams in draft order */}
              <div style={{ 
                marginBottom: isMobile ? '10px' : '15px', 
                flex: isMobile ? 'none' : 1 
              }}>
                {[...teams]
                  .filter(team => team.draftOrder !== null && team.draftOrder !== undefined)
                  .sort((a, b) => a.draftOrder - b.draftOrder)
                  .map((team, index) => (
                    <div key={team.name} style={{
                      padding: isMobile ? '10px' : '8px',
                      marginBottom: '5px',
                      backgroundColor: getCurrentDraftingTeam()?.name === team.name ? '#FFD700' : '#4A4A4A',
                      color: getCurrentDraftingTeam()?.name === team.name ? '#000' : '#fff',
                      borderRadius: '4px',
                      fontSize: isMobile ? '1em' : '0.9em',
                      border: getCurrentDraftingTeam()?.name === team.name ? '2px solid #FFD700' : '1px solid #666',
                      minHeight: isMobile ? '44px' : 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <div style={{ fontWeight: 'bold' }}>{team.draftOrder}. {team.name}</div>
                      <div style={{ 
                        fontSize: isMobile ? '0.9em' : '0.8em', 
                        color: getCurrentDraftingTeam()?.name === team.name ? '#333' : '#ccc',
                        marginTop: '2px' 
                      }}>
                        {team.golferNames.length} player{team.golferNames.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          ) : (
            <p style={{ 
              textAlign: 'center', 
              color: '#ccc', 
              fontSize: isMobile ? '1em' : '0.9em' 
            }}>
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
          padding: isMobile ? '12px' : '15px',
          minHeight: isMobile ? 'auto' : '500px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Next Pick Header */}
          <div style={{ 
            textAlign: 'center', 
            padding: isMobile ? '12px' : '8px', 
            backgroundColor: '#1a1a1a', 
            borderRadius: '4px',
            fontSize: isMobile ? '1em' : '1.1em',
            marginBottom: '15px',
            minHeight: isMobile ? '44px' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ fontWeight: 'bold' }}>Next Pick: #{getNextPickNumber()}</div>
            {getCurrentDraftingTeam() && (
              <div style={{ 
                color: '#FFD700', 
                marginTop: '4px', 
                fontSize: isMobile ? '0.9em' : '0.8em' 
              }}>
                {getCurrentDraftingTeam().name}'s turn
              </div>
            )}
          </div>
          
          {loading ? (
            <p style={{ textAlign: 'center', color: '#ccc' }}>Loading draft board players...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: 'red' }}>{error}</p>
          ) : topPlayers.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#ccc' }}>
              No draft board players available for this tournament. Ensure the Odds ID ({oddsId}) is correct, or upload manual odds.
            </p>
          ) : (
            <>
              {/* Mobile: Tier Navigation */}
              {isMobile && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  marginBottom: '15px', 
                  gap: '10px' 
                }}>
                  <button
                    onClick={() => setCurrentTierView(0)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: currentTierView === 0 ? '#FFD700' : '#555',
                      color: currentTierView === 0 ? '#000' : '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                      cursor: 'pointer'
                    }}
                  >
                    Tiers 1 & 2
                  </button>
                  <button
                    onClick={() => setCurrentTierView(1)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: currentTierView === 1 ? '#FFD700' : '#555',
                      color: currentTierView === 1 ? '#000' : '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                      cursor: 'pointer'
                    }}
                  >
                    Tiers 3 & 4
                  </button>
                </div>
              )}
              
              <div style={{ overflowX: 'auto', border: '1px solid #555', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: '#2a2a2a', flex: 1 }}>
              <table style={{ 
                width: '100%', 
                minWidth: isMobile ? '350px' : '700px', 
                borderCollapse: 'collapse', 
                color: 'white', 
                fontFamily: 'Arial, sans-serif' 
              }}>
                <thead>
                  <tr>
                    {isMobile ? (
                      // Mobile: Show only 2 tiers based on currentTierView
                      currentTierView === 0 ? (
                        <>
                          <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '8px 0 0 0' }}>Tier 1</th>
                          <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '0 8px 0 0' }}>Tier 2</th>
                        </>
                      ) : (
                        <>
                          <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '8px 0 0 0' }}>Tier 3</th>
                          <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '0 8px 0 0' }}>Tier 4</th>
                        </>
                      )
                    ) : (
                      // Desktop: Show all 4 tiers
                      <>
                        <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '8px 0 0 0' }}>Tier 1</th>
                        <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555' }}>Tier 2</th>
                        <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555' }}>Tier 3</th>
                        <th colSpan="2" style={{ padding: '10px 5px', textAlign: 'center', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '0 8px 0 0' }}>Tier 4</th>
                      </>
                    )}
                  </tr>
                  <tr>
                    {isMobile ? (
                      // Mobile: 2 columns
                      <>
                        <th style={{ padding: '10px 5px', textAlign: 'left', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '8px 0 0 0', width: '40%' }}>Player</th>
                        <th style={{ padding: '10px 5px', textAlign: 'right', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '10%' }}>Odds</th>
                        <th style={{ padding: '10px 5px', textAlign: 'left', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '40%' }}>Player</th>
                        <th style={{ padding: '10px 5px', textAlign: 'right', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '0 8px 0 0', width: '10%' }}>Odds</th>
                      </>
                    ) : (
                      // Desktop: 4 columns
                      <>
                        <th style={{ padding: '10px 5px', textAlign: 'left', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '8px 0 0 0', width: '20%' }}>Player</th>
                        <th style={{ padding: '10px 5px', textAlign: 'right', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '5%' }}>Odds</th>
                        <th style={{ padding: '10px 5px', textAlign: 'left', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '20%' }}>Player</th>
                        <th style={{ padding: '10px 5px', textAlign: 'right', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '5%' }}>Odds</th>
                        <th style={{ padding: '10px 5px', textAlign: 'left', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '20%' }}>Player</th>
                        <th style={{ padding: '10px 5px', textAlign: 'right', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', width: '5%' }}>Odds</th>
                        <th style={{ padding: '10px 5px', textAlign: 'left', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '0 8px 0 0', width: '20%' }}>Player</th>
                        <th style={{ padding: '10px 5px', textAlign: 'right', backgroundColor: '#1a1a1a', borderBottom: '1px solid #555', borderRadius: '0 8px 0 0', width: '5%' }}>Odds</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(11)].map((_, rowIndex) => {
                    const columnsToShow = isMobile ? 2 : 4;
                    
                    return (
                      <tr key={rowIndex} style={{ backgroundColor: rowIndex % 2 === 0 ? '#4A4A4A' : '#525252' }}>
                        {[...Array(columnsToShow)].map((_, colIndex) => {
                          let playerIndexInArray;
                          
                          if (isMobile) {
                            // Mobile: 2 columns, 11 rows each
                            // currentTierView 0 = Tiers 1&2 (players 0-21)
                            // currentTierView 1 = Tiers 3&4 (players 22-43)
                            const tierOffset = currentTierView * 22; // 0 for tiers 1&2, 22 for tiers 3&4
                            playerIndexInArray = tierOffset + (colIndex * 11) + rowIndex;
                          } else {
                            // Desktop: 4 columns, 11 rows each
                            playerIndexInArray = colIndex * 11 + rowIndex;
                          }
                          
                          const player = topPlayers[playerIndexInArray];
                          const isLastColInRow = colIndex === (columnsToShow - 1);

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
                                    padding: isMobile ? '10px 8px' : '8px 5px',
                                    textAlign: 'left',
                                    borderRight: '1px dotted #555',
                                    backgroundColor: cellBackgroundColor, // Apply dynamic color
                                    color: cellTextColor, // Apply dynamic text color
                                    fontSize: isMobile ? '0.9em' : '0.8em'
                                  }}>
                                    <div style={{ lineHeight: '1.2' }}>
                                      {player.name}
                                      {player.teamAssigned && (
                                        <span style={{ 
                                          fontSize: isMobile ? '0.8em' : '0.7em', 
                                          marginLeft: '5px', 
                                          opacity: 0.8, 
                                          color: cellTextColor,
                                          display: isMobile ? 'block' : 'inline'
                                        }}>
                                          ({player.teamAssigned})
                                        </span>
                                      )}
                                      {player.pickNumber && (
                                        <span style={{ 
                                          fontSize: isMobile ? '0.7em' : '0.6em', 
                                          marginLeft: isMobile ? '0' : '5px', 
                                          fontWeight: 'bold', 
                                          color: cellTextColor,
                                          display: isMobile ? 'block' : 'inline'
                                        }}>
                                          #{player.pickNumber}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{
                                    padding: isMobile ? '10px 8px' : '8px 5px',
                                    textAlign: 'right',
                                    borderRight: isLastColInRow ? 'none' : '1px dotted #555',
                                    backgroundColor: cellBackgroundColor, // Apply dynamic color
                                    color: cellTextColor, // Apply dynamic text color
                                    fontSize: isMobile ? '0.9em' : '0.8em'
                                  }}>
                                    {player.averageOdds !== null ? player.averageOdds.toFixed(2) : 'N/A'}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td style={{ 
                                    padding: isMobile ? '10px 8px' : '8px 5px', 
                                    borderRight: '1px dotted #555' 
                                  }}></td>
                                  <td style={{ 
                                    padding: isMobile ? '10px 8px' : '8px 5px', 
                                    borderRight: isLastColInRow ? 'none' : '1px dotted #555' 
                                  }}></td>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftBoard;