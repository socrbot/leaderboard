# The Sunday Cup — Alumni Golf Tournament Leaderboard

A React-based web application that powers team-based golf tournament scoring for WVU alumni events. It integrates with a Flask backend to deliver live leaderboard updates, snake-draft team management, and cumulative annual championship standings across the full season.

## Features

- **Live Leaderboard** — Real-time team and golfer scores with per-round breakdowns and in-progress indicator
- **Best-3-of-4 Scoring** — Team round scores calculated from the best 3 of 4 golfers; cut players receive a penalty stroke
- **Snake Draft System** — Pick-order draft board with live on-clock notifications via Firebase Cloud Messaging
- **Annual Championship** — Cumulative stroke standings across all completed tournaments in a season
- **Multi-League Support** — Users can create or join leagues via invite code; each league manages its own tournaments and teams
- **Tournament Scores View** — Dedicated view showing per-player round scores across all tournaments
- **CUT Status Display** — Visual indicator for players who missed the cut
- **Responsive UI** — Dark-themed card layout optimised for desktop and mobile
- **Progressive Web App** — Service worker support with push notification opt-in

## How It Works

- **Live scoring** and team data are fetched from a backend and the Rapid Golf API.
- Team scores per round use the best 3 available golfer scores. If fewer than 3 golfers have a score, the team’s round score shows as "-".
- The leaderboard automatically updates as new scores come in.
## Prerequisites

- Node.js 18+
- npm 9+
- A Firebase project with Authentication and Firestore enabled
- Access to the backend API (see [leaderboard-backend](https://github.com/socrbot/leaderboard-backend))

## Installation

```bash
# Clone the repository
git clone https://github.com/socrbot/leaderboard.git
cd leaderboard

# Install dependencies
npm install
```

Create a `.env.local` file for local development:

```env
REACT_APP_BACKEND_URL=http://localhost:8080/api
```

## Usage

### Development

```bash
npm start
```

The app runs at [http://localhost:3000](http://localhost:3000) and proxies API requests to the backend URL configured in `.env.local`.

### Build Targets

| Command | Environment | Firebase Project |
|---|---|---|
| `npm run build` | Production | `alumni-golf-tournament` |
| `npm run build:staging` | Staging | `alumni-golf-tournament-staging` |
| `npm run build:v2-prod` | V2 Production | `alumni-golf-tournament` (v2 hosting) |

### Deployment

Deployment is fully automated via GitHub Actions. **Do not deploy manually.**

| Branch | Target |
|---|---|
| `master` | Production — `alumni-golf-tournament.web.app` |
| `v2-prod` | V2 Production — `alumni-golf-tournament-v2.web.app` |
| `v2` | Staging — `aulmni-leaderboard-v2.web.app` |

## Project Structure

```
src/
├── App.js                    # Root component — auth, tournament selection, view routing
├── apiConfig.js              # Backend URL constants
├── authFetch.js              # fetch() wrapper that attaches Firebase ID tokens
├── useGolfLeaderboard.js     # Data-fetching hook for live leaderboard scores
├── leaderboardLifecycle.js   # Tournament lifecycle state helpers
├── components/
│   ├── AnnualChampionship.js # Season standings view
│   ├── DraftBoard.js         # Snake draft pick board
│   ├── TeamManagement.js     # Team / golfer assignment UI
│   ├── TournamentCreation.js # Admin: create tournament with odds integration
│   ├── LeagueManagement.js   # Create league, invite code display
│   ├── UserSettings.js       # User profile, league join/create, notifications
│   └── Setup.js              # Admin setup panel
├── hooks/                    # Shared custom hooks
├── notifications/            # FCM push notification helpers
└── App.css                   # Global dark-theme styles
```

## Annual Championship Scoring

- Each team's round score = best 3 of 4 golfer scores for that round
- Players who miss the cut receive a penalty: `highest_non_cut_score + 1`
- Annual total = sum of all tournament scores (lower is better)
- Only tournaments marked `participatesInAnnual: true` and `isOfficiallyComplete: true` count

## Contributing

1. Fork the repository and create a feature branch from `v2` (staging).
2. Make your changes and ensure `npm test` passes.
3. Open a pull request against `v2` — CI will deploy a preview build automatically.
4. Changes are promoted to `v2-prod` (production) after review.

Code style: standard React/ES2022. No custom linter config beyond `react-app`.

## License

MIT License. See [LICENSE](LICENSE) for details.