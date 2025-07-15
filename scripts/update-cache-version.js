// scripts/update-cache-version.js
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/sw.js');
const timestamp = Date.now();

// Read the service worker file
let swContent = fs.readFileSync(swPath, 'utf8');

// Update cache version with timestamp
swContent = swContent.replace(
  /const CACHE_NAME = 'leaderboard-cache-v\d+';/,
  `const CACHE_NAME = 'leaderboard-cache-v${timestamp}';`
);

swContent = swContent.replace(
  /const API_CACHE_NAME = 'leaderboard-api-cache-v\d+';/,
  `const API_CACHE_NAME = 'leaderboard-api-cache-v${timestamp}';`
);

// Write back to file
fs.writeFileSync(swPath, swContent);

console.log(`Cache version updated to: v${timestamp}`);
