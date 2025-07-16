// simple-global-teams-creator.js
// This script creates global teams for Annual Championship while leaving existing tournament teams untouched

const BACKEND_BASE_URL = 'https://leaderboard-backend-628169335141.us-east1.run.app';

// Global teams for Annual Championship
// Team names and Annual Championship participation only
const SAMPLE_GLOBAL_TEAMS = [
  {
    name: "Ash",
    golferNames: [], // Golfers assigned per tournament
    participatesInAnnual: true
  },
  {
    name: "Wittig",
    golferNames: [],
    participatesInAnnual: true
  },
  {
    name: "Dingo",
    golferNames: [],
    participatesInAnnual: true
  },
  {
    name: "Coop",
    golferNames: [],
    participatesInAnnual: true
  },
  {
    name: "Decs",
    golferNames: [],
    participatesInAnnual: true
  },
  {
    name: "Rusty",
    golferNames: [],
    participatesInAnnual: true
  },
  {
    name: "Brooks",
    golferNames: [],
    participatesInAnnual: true
  },
  {
    name: "Nobes",
    golferNames: [],
    participatesInAnnual: true
  },
  {
    name: "Johnny",
    golferNames: [],
    participatesInAnnual: true
  },
  {
    name: "PC",
    golferNames: [],
    participatesInAnnual: true
  },
  {
    name: "Strats",
    golferNames: [],
    participatesInAnnual: true
  }
];

async function createGlobalTeamsForAnnual() {
  console.log('🚀 Creating global teams for Annual Championship...');
  
  try {
    // Check if global teams endpoint is available
    const testResponse = await fetch(`${BACKEND_BASE_URL}/api/global_teams`);
    if (!testResponse.ok && testResponse.status !== 404) {
      throw new Error('Backend not deployed or not accessible');
    }
    
    console.log('✅ Backend is accessible');
    
    const createdTeams = [];
    
    for (const teamData of SAMPLE_GLOBAL_TEAMS) {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/global_teams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teamData)
        });
        
        if (response.ok) {
          const result = await response.json();
          createdTeams.push(result);
          console.log(`✅ Created: ${teamData.name} (Annual: ${teamData.participatesInAnnual})`);
        } else {
          const error = await response.json();
          if (error.error && error.error.includes('already exists')) {
            console.log(`⚠️ Team "${teamData.name}" already exists - skipping`);
          } else {
            console.error(`❌ Failed to create "${teamData.name}":`, error.error);
          }
        }
      } catch (error) {
        console.error(`❌ Error creating "${teamData.name}":`, error.message);
      }
    }
    
    console.log(`🎉 Created ${createdTeams.length} global teams!`);
    
    // Verify Annual Championship will work
    const annualTeams = createdTeams.filter(team => team.participatesInAnnual !== false);
    console.log(`🏆 ${annualTeams.length} teams will appear in Annual Championship`);
    
    return {
      totalCreated: createdTeams.length,
      annualParticipants: annualTeams.length,
      teams: createdTeams
    };
    
  } catch (error) {
    console.error('💥 Failed to create global teams:', error);
    throw error;
  }
}

// Instructions for use:
console.log(`
📋 INSTRUCTIONS:
1. Update BACKEND_BASE_URL with your actual backend URL
2. Customize SAMPLE_GLOBAL_TEAMS with your team names
3. Run this script in browser console:
   createGlobalTeamsForAnnual().then(console.log)

🔒 SAFETY: This script only CREATES new global teams.
It does NOT modify or delete existing tournament teams.
Your leaderboards will continue to work unchanged.
`);

// Run the script:
createGlobalTeamsForAnnual().then(result => {
  console.log('✅ Global teams creation complete:', result);
}).catch(error => {
  console.error('❌ Error:', error);
});
