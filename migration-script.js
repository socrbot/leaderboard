// migration-script.js - Run this once to migrate existing teams to global teams
// This script extracts unique teams from all tournaments and creates global teams

const BACKEND_BASE_URL = 'YOUR_BACKEND_URL'; // Replace with your actual backend URL

async function migrateTeamsToGlobal() {
  console.log('🚀 Starting team migration to global teams...');
  
  try {
    // Step 1: Get all tournaments
    const tournamentsResponse = await fetch(`${BACKEND_BASE_URL}/api/tournaments`);
    if (!tournamentsResponse.ok) throw new Error('Failed to fetch tournaments');
    const tournaments = await tournamentsResponse.json();
    
    console.log(`📋 Found ${tournaments.length} tournaments`);
    
    // Step 2: Collect unique teams from all tournaments
    const uniqueTeams = new Map();
    
    for (const tournament of tournaments) {
      const tournamentResponse = await fetch(`${BACKEND_BASE_URL}/api/tournaments/${tournament.id}`);
      if (!tournamentResponse.ok) continue;
      
      const tournamentData = await tournamentResponse.json();
      const teams = tournamentData.teams || [];
      
      console.log(`📊 Tournament "${tournament.name}" has ${teams.length} teams`);
      
      teams.forEach(team => {
        if (team.name && !uniqueTeams.has(team.name)) {
          uniqueTeams.set(team.name, {
            name: team.name,
            golferNames: team.golferNames || [],
            participatesInAnnual: team.participatesInAnnual !== false, // Default to true
            draftOrder: team.draftOrder || 0
          });
        }
      });
    }
    
    console.log(`🎯 Found ${uniqueTeams.size} unique teams to migrate`);
    
    // Step 3: Create global teams
    const createdTeams = [];
    
    for (const [teamName, teamData] of uniqueTeams) {
      try {
        const createResponse = await fetch(`${BACKEND_BASE_URL}/api/global_teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teamData)
        });
        
        if (createResponse.ok) {
          const result = await createResponse.json();
          createdTeams.push({ ...teamData, id: result.id });
          console.log(`✅ Created global team: ${teamName}`);
        } else {
          const error = await createResponse.json();
          console.log(`⚠️ Team "${teamName}" may already exist: ${error.error}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create team "${teamName}":`, error);
      }
    }
    
    console.log(`🎉 Migration complete! Created ${createdTeams.length} global teams`);
    
    // Step 4: Update tournaments to reference global teams
    console.log('🔄 Updating tournament team assignments...');
    
    for (const tournament of tournaments) {
      const tournamentResponse = await fetch(`${BACKEND_BASE_URL}/api/tournaments/${tournament.id}`);
      if (!tournamentResponse.ok) continue;
      
      const tournamentData = await tournamentResponse.json();
      const teams = tournamentData.teams || [];
      
      // Map tournament teams to global team IDs
      const teamAssignments = teams.map(team => {
        const globalTeam = createdTeams.find(gt => gt.name === team.name);
        return globalTeam ? { globalTeamId: globalTeam.id } : null;
      }).filter(Boolean);
      
      // Update tournament with team assignments
      try {
        const updateResponse = await fetch(`${BACKEND_BASE_URL}/api/tournaments/${tournament.id}/team_assignments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamAssignments })
        });
        
        if (updateResponse.ok) {
          console.log(`✅ Updated team assignments for "${tournament.name}"`);
        }
      } catch (error) {
        console.error(`❌ Failed to update team assignments for "${tournament.name}":`, error);
      }
    }
    
    console.log('🎊 Full migration complete!');
    
    return {
      tournamentsProcessed: tournaments.length,
      globalTeamsCreated: createdTeams.length,
      uniqueTeamsFound: uniqueTeams.size
    };
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Usage:
// 1. Replace BACKEND_BASE_URL with your actual backend URL
// 2. Run this in browser console or Node.js
// 3. Check the console output for migration status

// Uncomment to run:
// migrateTeamsToGlobal().then(result => {
//   console.log('Migration summary:', result);
// }).catch(error => {
//   console.error('Migration error:', error);
// });

console.log('Migration script loaded. Update BACKEND_BASE_URL and uncomment the last section to run.');
