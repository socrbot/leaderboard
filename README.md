# Alumni Golf Tournament Leaderboard

This repository powers a dynamic, team-based golf tournament leaderboard for alumni events. It pulls live data, allows team and player management, and displays up-to-the-minute scoring for each round.

## Features

- **Live Leaderboard:** See team and golfer scores update in real time, including in-progress rounds.
- **Team Management:** Easily assign golfers to teams using an intuitive management interface.
- **Draft Board:** Manage and view player draft picks for tournaments.
- **CUT Status Display:** Instantly see which players have been cut from the tournament, indicated next to their names.
- **Rounds & Totals:** Team scores are calculated using the best 3 individual scores per round; the total shows as soon as 3 golfers have posted a score for a round.
- **Responsive UI:** Designed for desktop and mobile screens.

## How It Works

- **Live scoring** and team data are fetched from a backend and the Rapid Golf API.
- Team scores per round use the best 3 available golfer scores. If fewer than 3 golfers have a score, the team’s round score shows as "-".
- The leaderboard automatically updates as new scores come in.
## Annual Championship Scoring

The application tracks an annual championship across multiple tournaments throughout the season.

### Team Scoring Per Tournament
- Each round uses the **best 3 of 4 golfer scores**
- If fewer than 3 golfers have scores, the round shows as "-"
- **Cut Penalty**: Players who miss the cut receive a penalty score equal to the highest non-cut score + 1 stroke
- Team's total score is the sum of all round scores

### Annual Championship Scoring
The annual championship uses **cumulative stroke scoring**:
- Each team's total score is the **sum of their tournament scores** across all completed tournaments
- **Lower total score wins** (standard golf scoring)
- **Example**: Team A scores +5, +8, +3 = +16 total | Team B scores +10, +2, +6 = +18 total → Team A wins

### Annual Championship Standings
- Only **completed tournaments** with `participatesInAnnual: true` count toward the championship
- Final standings are sorted by **lowest total score** (best in golf)
- Each team's results show their tournament scores and cumulative total
## Getting Started

1. **Clone the repo:**
    ```bash
    git clone https://github.com/socrbot/leaderboard.git
    cd leaderboard
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Start the development server:**
    ```bash
    npm start
    ```
    The app will run at [http://localhost:3000](http://localhost:3000).

4. **Configure backend API (if needed):**
    - The backend URL is controlled by environment variables via `src/apiConfig.js`.
    - **Production** (default): `https://leaderboard-backend-628169335141.us-east1.run.app/api`
    - **Staging**: `https://leaderboard-backend-staging-1056126670188.us-east1.run.app/api`
    - For local development, set `REACT_APP_BACKEND_URL` in a `.env.local` file.

## Build & Deploy

### Production
```bash
npm run build
firebase deploy --only hosting
```

### Staging
```bash
npm run build:staging
firebase deploy --only hosting --project staging
```

The staging build uses `.env.staging` (via `env-cmd`) to set the backend URL. Firebase project aliases are configured in `.firebaserc`.

## Folder Structure

```markdown
## Folder Structure

```
src/
├── App.js                 # Main React app and leaderboard logic
├── useGolfLeaderboard.js  # Custom React hook for data fetching & transformation
├── components/
│   ├── TeamManagement.js  # Team management UI
│   ├── DraftBoard.js      # Player draft board UI
│   └── ...                # Other UI components
├── App.css                # App styling
└── ...
```
```