// Centralized API endpoints for the leaderboard app

// Backend URL is set via REACT_APP_BACKEND_URL at build time (see .env.production / .env.staging)
// Falls back to production URL if not set
export const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL || "https://leaderboard-backend-628169335141.us-east1.run.app/api";
export const TOURNAMENTS_API_ENDPOINT = `${BACKEND_BASE_URL}/tournaments`;
export const PLAYER_ODDS_API_ENDPOINT = `${BACKEND_BASE_URL}/player_odds`;
export const LEADERBOARD_API_ENDPOINT = `${BACKEND_BASE_URL}/leaderboard`;
// Add other endpoints here as needed

// LOCAL DEVELOPMENT CONFIGURATION
// Start with: REACT_APP_BACKEND_URL=http://localhost:8080/api npm start
