# Golf Leaderboard Frontend - Business Requirements Document

**Version**: 1.0  
**Last Updated**: April 11, 2026  
**Document Owner**: Product Team  
**Project**: Alumni Golf Tournament Leaderboard System

---

## 1. Executive Summary

### 1.1 Purpose
The Golf Leaderboard Frontend is a web-based application that provides real-time tournament scoring, team management, and draft functionality for alumni golf tournaments. The system enables participants to track live tournament progress, manage team compositions, and view annual championship standings.

### 1.2 Business Objectives
- Provide real-time tournament leaderboard updates with automatic refresh
- Enable intuitive team management and player draft experiences
- Display annual championship standings across multiple tournaments
- Support mobile and desktop viewing experiences
- Minimize page load times through intelligent caching
- Handle multiple concurrent tournaments throughout the golf season

### 1.3 Success Metrics
- Page load time < 2 seconds for cached tournaments
- Zero data loss during tournament transitions
- 100% accuracy in score calculations
- User engagement: Average session duration > 5 minutes during live tournaments
- Mobile responsiveness: 100% feature parity across devices

---

## 2. Stakeholders

### 2.1 Primary Users
- **Tournament Participants**: Alumni golfers viewing their team standings
- **Team Members**: Users tracking their specific team's performance
- **Tournament Organizers**: Administrators managing teams and draft processes
- **Spectators**: Family and friends following tournament progress

### 2.2 Technical Stakeholders
- **System Administrators**: Managing deployment and monitoring
- **Backend API Team**: Providing data services
- **Firebase/Firestore**: Database and hosting infrastructure

---

## 3. Functional Requirements

### 3.1 Tournament Display & Selection

#### 3.1.1 Tournament List
**Requirement ID**: FR-TL-001  
**Priority**: Critical  
**Description**: Display all available tournaments with filtering and selection capabilities

**Acceptance Criteria**:
- Display tournament name, date, and status (upcoming, in-progress, completed)
- Support filtering by year
- Show visual indicators for tournament status (draft, live, completed)
- Persist selected tournament across page refreshes
- Default to most recent active tournament on initial load

#### 3.1.2 Auto-Refresh for Live Tournaments
**Requirement ID**: FR-TL-002  
**Priority**: High  
**Description**: Automatically update leaderboard data during active tournaments

**Acceptance Criteria**:
- Refresh leaderboard data every 30 minutes during live tournaments
- Display "Last Updated" timestamp
- Show loading indicator only on manual refresh, not auto-refresh
- Pause auto-refresh when user navigates away from leaderboard
- Resume auto-refresh when returning to leaderboard view

### 3.2 Leaderboard Display

#### 3.2.1 Team Standings
**Requirement ID**: FR-LD-001  
**Priority**: Critical  
**Description**: Display team rankings with complete scoring breakdown

**Acceptance Criteria**:
- Show team position (1st, 2nd, T3, etc.)
- Display team name
- Show total score (cumulative stroke play)
- Display round-by-round scores (R1, R2, R3, R4)
- Highlight current/live rounds with visual indicator
- Use "-" placeholder for incomplete rounds with < 3 player scores
- Sort teams by total score (lowest first)
- Display team composition (4 players per team)

#### 3.2.2 Player Details
**Requirement ID**: FR-LD-002  
**Priority**: Critical  
**Description**: Show individual player scores within each team

**Acceptance Criteria**:
- Display player name
- Show player's current status (active, cut)
- Display round-by-round scores to par (e.g., -2, E, +1)
- Show total score to par
- Indicate live scores with blue text and bold formatting
- Display "CUT" status prominently for eliminated players
- Show "thru" indicator (holes completed) for players in active rounds

#### 3.2.3 Cut Player Handling
**Requirement ID**: FR-LD-003  
**Priority**: High  
**Description**: Apply and display appropriate penalty scores for cut players

**Acceptance Criteria**:
- Display "CUT" indicator next to player name
- Show actual scores for rounds completed before cut
- Apply penalty scores for missed rounds (R3, R4)
- Calculate penalty as: worst round score among non-cut players + 1 stroke
- Only apply penalties after respective rounds are completed
- Show penalty scores in team calculations
- Do NOT display penalty scores directly on leaderboard (calculation only)

### 3.3 Annual Championship

#### 3.3.1 Championship Standings
**Requirement ID**: FR-AC-001  
**Priority**: High  
**Description**: Display aggregate standings across all completed tournaments

**Acceptance Criteria**:
- Show team rankings based on cumulative stroke play
- Display total score as sum of all tournament scores
- Show individual tournament results for each team
- Only include completed tournaments marked `participatesInAnnual: true`
- Sort by total score (lowest first)
- Display team's best finish, number of wins, number of top-3 finishes
- Show tournament count included in standings

### 3.4 Draft Management

#### 3.4.1 Draft Board Display
**Requirement ID**: FR-DM-001  
**Priority**: High  
**Description**: Display player draft board with odds and selection status

**Acceptance Criteria**:
- Show all available players with betting odds
- Display player name, tournament seed/rank
- Show odds from multiple sportsbooks with average
- Indicate selected players with visual distinction
- Gray out / disable selected players
- Display which team selected each player
- Show draft order and current pick

#### 3.4.2 Draft Status Workflow
**Requirement ID**: FR-DM-002  
**Priority**: High  
**Description**: Support complete draft lifecycle from setup to completion

**Acceptance Criteria**:

**Draft States**:
1. **Not Started**: Show tournament info, hide draft board
2. **Started + Odds Unlocked**: Show "Waiting for odds to lock" message
3. **Started + Odds Locked + Incomplete**: Show active draft board
4. **Complete**: Show final leaderboard only

**State Transitions**:
- Automatically detect and respond to draft status changes
- Refresh UI when draft status changes
- Preserve user's tournament selection across state changes

### 3.5 Team Management

#### 3.5.1 Global Team Creation
**Requirement ID**: FR-TM-001  
**Priority**: High  
**Description**: Create and manage teams that persist across multiple tournaments

**Acceptance Criteria**:
- Create new team with unique name
- Assign team to specific year (2025, 2026, etc.)
- Validate team name uniqueness within year
- Support team editing (rename)
- Support team deletion with confirmation
- Display list of all global teams by year

#### 3.5.2 Tournament Team Assignment
**Requirement ID**: FR-TM-002  
**Priority**: High  
**Description**: Assign global teams to participate in specific tournaments

**Acceptance Criteria**:
- View teams assigned to a tournament
- Add teams from global team pool
- Remove teams from tournament
- Assign 4 golfers to each team
- Validate golfer names against tournament participants
- Support preferred golfer assignments from previous tournaments
- Display team participation status

#### 3.5.3 Golfer Assignment
**Requirement ID**: FR-TM-003  
**Priority**: Critical  
**Description**: Assign individual golfers to teams for each tournament

**Acceptance Criteria**:
- Display golfer assignment interface
- Allow free-text entry or selection from tournament roster
- Validate golfer exists in tournament (Unicode-safe matching)
- Support 4 golfers per team
- Show golfer assignment status (assigned/unassigned)
- Handle name variations (Chris vs Christopher, special characters)

---

## 4. Non-Functional Requirements

### 4.1 Performance

#### 4.1.1 Page Load Time
**Requirement ID**: NFR-PF-001  
**Priority**: High  
**Description**: Ensure fast page load and interaction times

**Acceptance Criteria**:
- Initial page load < 3 seconds on 4G mobile connection
- Cached tournament load < 1 second
- Tournament switch < 500ms for preloaded tournaments
- API response handling < 200ms for processing

#### 4.1.2 Caching Strategy
**Requirement ID**: NFR-PF-002  
**Priority**: High  
**Description**: Implement frontend caching for optimal performance

**Acceptance Criteria**:
- Preload all completed tournament data on app initialization
- Cache tournament data in session storage
- Invalidate cache on manual refresh
- Store last updated timestamp with cached data
- Limit cache to completed tournaments only

### 4.2 Usability

#### 4.2.1 Responsive Design
**Requirement ID**: NFR-US-001  
**Priority**: Critical  
**Description**: Support all device types and screen sizes

**Acceptance Criteria**:
- Mobile viewport: 320px - 767px (single column layout)
- Tablet viewport: 768px - 1023px (adaptive layout)
- Desktop viewport: 1024px+ (full layout)
- Touch-friendly controls (minimum 44px tap targets)
- Readable font sizes (minimum 14px body text)

#### 4.2.2 Accessibility
**Requirement ID**: NFR-US-002  
**Priority**: Medium  
**Description**: Ensure application is accessible to users with disabilities

**Acceptance Criteria**:
- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Sufficient color contrast (WCAG AA minimum)
- Screen reader compatible

### 4.3 Reliability

#### 4.3.1 Error Handling
**Requirement ID**: NFR-RL-001  
**Priority**: High  
**Description**: Gracefully handle errors and display user-friendly messages

**Acceptance Criteria**:
- Display error messages for failed API calls
- Show fallback UI when data unavailable
- Log errors to console for debugging
- Provide retry mechanism for transient failures
- Maintain application stability when backend unavailable

#### 4.3.2 Data Accuracy
**Requirement ID**: NFR-RL-002  
**Priority**: Critical  
**Description**: Ensure 100% accuracy in score calculations and displays

**Acceptance Criteria**:
- Verify scores match RapidAPI source data
- Validate team score calculations (best 3 of 4)
- Correctly handle special characters in player names (å, ø, ü, etc.)
- Accurately parse score-to-par formats (-5, E, +3)
- Handle edge cases (withdrawals, disqualifications, missed cuts)

### 4.4 Browser Compatibility

**Requirement ID**: NFR-BC-001  
**Priority**: High  
**Description**: Support modern web browsers

**Supported Browsers**:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

---

## 5. User Interface Requirements

### 5.1 Navigation

#### 5.1.1 Primary Navigation
- Tournament selector dropdown (top of page)
- Tab navigation: Leaderboard / Draft Board / Team Management / Annual Championship
- Refresh button for manual data updates
- Last updated timestamp display

### 5.2 Leaderboard View

#### 5.2.1 Layout
- Header: Tournament name, date, status
- Team standings table:
  - Columns: Position, Team Name, R1, R2, R3, R4, Total
  - Expandable rows showing 4 team members
- Footer: Last updated, data source attribution

#### 5.2.2 Visual Design
- Color coding:
  - Live scores: Blue (#007bff)
  - Cut players: Red text with gray background
  - Complete scores: Black
- Position badges (1st: gold, 2nd: silver, 3rd: bronze)
- Alternating row backgrounds for readability

### 5.3 Draft Board View

#### 5.3.1 Layout
- Player grid or table with columns:
  - Player name
  - Betting odds (multiple sportsbooks + average)
  - Rank/seed
  - Selection status
- Draft order indicator
- Current pick highlight

### 5.4 Team Management View

#### 5.4.1 Layout
- Global teams list with year filter
- Create new team button
- Team editor modal/panel:
  - Team name input
  - Golfer assignment interface (4 golfers)
  - Save/Cancel buttons

---

## 6. Data Requirements

### 6.1 Input Data

#### 6.1.1 From Backend API
- Tournament list with metadata
- Live leaderboard data
- Team assignments
- Global team definitions
- Draft status and player odds
- Annual championship standings

#### 6.1.2 User Inputs
- Tournament selection
- Team name creation
- Golfer name assignments
- Draft picks (via interface)

### 6.2 Data Validation

#### 6.2.1 Team Names
- Required field
- Maximum 50 characters
- Unique within year
- Alphanumeric + spaces allowed

#### 6.2.2 Golfer Names
- Required (4 per team)
- Must match tournament roster (with fuzzy matching)
- Support Unicode characters
- Handle name variations

---

## 7. Integration Requirements

### 7.1 Backend API Integration

**Requirement ID**: IR-API-001  
**Priority**: Critical  
**Description**: Integrate with Flask backend for all data operations

**Endpoints Required**:
- `GET /api/tournaments` - List tournaments
- `GET /api/tournaments/{id}` - Get tournament details
- `GET /api/tournaments/{id}/leaderboard` - Get leaderboard
- `GET /api/annual_championship?year={year}` - Get standings
- `GET /api/global_teams?year={year}` - Get teams
- `POST /api/global_teams` - Create team
- `PUT /api/global_teams/{id}` - Update team
- `DELETE /api/global_teams/{id}` - Delete team
- `GET /api/player_odds?oddsId={id}` - Get player odds
- `POST /api/tournaments/{id}/start_draft` - Start draft
- `POST /api/tournaments/{id}/complete_draft` - Complete draft

### 7.2 Firebase Hosting

**Requirement ID**: IR-FH-001  
**Priority**: Critical  
**Description**: Deploy application on Firebase Hosting

**Requirements**:
- Production environment: `https://[project-id].web.app`
- Staging environment: `https://[staging-project-id].web.app`
- Custom domain support
- SSL/TLS encryption
- CDN distribution

---

## 8. Security Requirements

### 8.1 Data Access

**Requirement ID**: SR-DA-001  
**Priority**: High  
**Description**: Ensure secure data access and transmission

**Acceptance Criteria**:
- All API calls over HTTPS
- CORS properly configured for allowed origins
- No sensitive data stored in browser storage
- API keys never exposed in frontend code

### 8.2 Input Validation

**Requirement ID**: SR-IV-001  
**Priority**: Medium  
**Description**: Validate all user inputs client-side

**Acceptance Criteria**:
- Sanitize text inputs
- Validate data types
- Enforce maximum lengths
- Prevent XSS attacks through proper escaping

---

## 9. Deployment Requirements

### 9.1 Build Process

**Requirements**:
- Production build: `npm run build`
- Staging build: `npm run build:staging`
- Environment-specific configuration via `.env` files
- Minified and optimized assets

### 9.2 Deployment Targets

#### Production
- **Command**: `firebase deploy --only hosting`
- **URL**: Production domain
- **Backend**: `https://leaderboard-backend-628169335141.us-east1.run.app/api`

#### Staging
- **Command**: `firebase deploy --only hosting --project staging`
- **URL**: Staging domain
- **Backend**: `https://leaderboard-backend-staging-1056126670188.us-east1.run.app/api`

---

## 10. Constraints & Assumptions

### 10.1 Technical Constraints
- Must use React framework (current: React 18+)
- Must integrate with existing Flask backend
- Must use Firebase for hosting
- Limited by RapidAPI rate limits (20 calls/day)

### 10.2 Business Constraints
- Tournaments run April - November annually
- Maximum 20 tournaments per year
- Maximum 12 teams per tournament
- 4 golfers per team (fixed)

### 10.3 Assumptions
- Users have modern web browsers (last 2 years)
- Users have stable internet connection
- RapidAPI provides accurate, timely data
- Backend API maintains 99.5% uptime
- Tournament data structure remains consistent

---

## 11. Future Enhancements

### 11.1 Phase 2 Features (Potential)
- Real-time notifications for score updates
- User accounts and authentication
- Private leagues with custom scoring
- Historical data visualization (charts/graphs)
- Player statistics and trends
- Mobile app (iOS/Android)
- Push notifications for team standings
- Social sharing of team performance
- Playoff bracket visualization
- Live commentary integration

### 11.2 Analytics & Reporting
- User engagement metrics
- Tournament participation trends
- Popular teams tracking
- Device/browser usage statistics

---

## 12. Acceptance & Sign-Off

### 12.1 Acceptance Criteria Summary
- All Critical priority requirements implemented and tested
- 95%+ of High priority requirements implemented
- Performance benchmarks met
- Browser compatibility verified
- User acceptance testing completed

### 12.2 Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Technical Lead | | | |
| QA Lead | | | |
| Business Stakeholder | | | |

---

## Appendix A: Glossary

- **Cut**: Tournament elimination after Round 2 (typically top 50 players + ties continue)
- **Stroke Play**: Golf scoring format where total strokes determine winner
- **Score to Par**: Player's score relative to course par (e.g., -2 means 2 under par)
- **Best 3 of 4**: Team scoring using 3 lowest individual scores per round
- **Live Score**: Score for player currently on course (in-progress round)
- **Annual Championship**: Season-long competition aggregating all tournament results
- **Draft**: Team selection process for assigning professional golfers

## Appendix B: Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | April 11, 2026 | AI Assistant | Initial comprehensive BRD |
