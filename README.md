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
    - By default, the frontend points to a live backend API at:
      ```
      https://leaderboard-backend-628169335141.us-east1.run.app/api
      ```
    - For development or custom backends, edit the relevant URL in `src/App.js` and `src/useGolfLeaderboard.js`.

## Folder Structure