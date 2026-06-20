# Backend Implementation Guide: In-Progress Tournament Support

## Overview
This document provides implementation guidance for the backend API changes required to support displaying in-progress tournament scores in the Annual Championship table.

## Frontend Changes (COMPLETED ✅)
The frontend has been updated to:
- Call `/api/annual_championship?year=2026&includeInProgress=true`
- Display live tournament badges in column headers
- Show provisional scores in blue italic text
- Add hover tooltips indicating provisional status
- Display an info notice when live data is included

## Backend Changes Required

### 1. Update `/api/annual_championship` Endpoint

**Location:** Backend API service (Cloud Run: leaderboard-backend-628169335141.us-east1.run.app)

**Changes:**
1. Add support for `includeInProgress` query parameter (boolean, default: false)
2. When `includeInProgress=true`, include tournaments that are in-progress but not officially complete
3. For in-progress tournaments, calculate team scores using existing leaderboard calculation logic
4. Add `isComplete` flag to tournament objects in response

### 2. Expected Response Format

```javascript
{
  standings: [
    {
      teamName: "Team Wittig",
      totalScore: 15,
      tournaments: [
        {
          tournamentId: "tournament-1",
          score: 5,
          position: 2
        },
        {
          tournamentId: "tournament-2", 
          score: 10,
          position: 3
        }
      ]
    }
    // ... more teams
  ],
  tournaments: [
    {
      tournamentId: "tournament-1",
      name: "The Masters",
      teamResults: [
        { teamName: "Team Wittig", score: 5, position: 2 }
      ],
      isComplete: true  // ← Completed tournament
    },
    {
      tournamentId: "tournament-2",
      name: "US Open",
      teamResults: [
        { teamName: "Team Wittig", score: 10, position: 3 }
      ],
      isComplete: false  // ← In-progress tournament (NEW)
    }
  ],
  metadata: {
    tournamentCount: 2,
    teamCount: 5,
    inProgressCount: 1,  // ← NEW: count of in-progress tournaments
    calculatedAt: "2026-06-20T18:00:00Z"
  }
}
```

### 3. Implementation Pseudocode

```python
def get_annual_championship():
    year = request.args.get('year')
    include_in_progress = request.args.get('includeInProgress', 'false').lower() == 'true'
    
    # Get tournaments for this year
    tournaments_query = db.collection('tournaments').where('year', '==', year)
    
    if include_in_progress:
        # Include both complete and in-progress tournaments
        tournaments = [t for t in tournaments_query if t.draftComplete]
    else:
        # Original behavior: only completed tournaments
        tournaments = [t for t in tournaments_query if t.isOfficiallyComplete]
    
    tournament_data = []
    in_progress_count = 0
    
    for tournament in tournaments:
        is_complete = tournament.get('isOfficiallyComplete', False)
        
        if is_complete:
            # Use stored team results
            team_results = tournament.get('teamResults', [])
        else:
            # Calculate team scores using existing leaderboard logic
            # REUSE: Call the same function used by /api/leaderboard endpoint
            team_results = calculate_team_scores(
                tournament_id=tournament.id,
                org_id=tournament.orgId,
                tourn_id=tournament.tournId,
                year=tournament.year
            )
            in_progress_count += 1
        
        tournament_data.append({
            'tournamentId': tournament.id,
            'name': tournament.name,
            'teamResults': team_results,
            'isComplete': is_complete  # NEW FLAG
        })
    
    # Calculate standings (sum across tournaments)
    standings = calculate_annual_standings(tournament_data)
    
    return {
        'standings': standings,
        'tournaments': tournament_data,
        'metadata': {
            'tournamentCount': len(tournaments),
            'teamCount': len(standings),
            'inProgressCount': in_progress_count,  # NEW
            'calculatedAt': datetime.utcnow().isoformat()
        }
    }
```

### 4. Reusing Existing Team Calculation Logic

The backend should **reuse** the same team calculation logic used by the `/api/leaderboard?calculateTeams=true` endpoint. This ensures consistency and avoids code duplication.

**Key function to reuse:**
- Team score calculation (best 3 of 4 golfer scores per round)
- Cut penalty logic
- Round score aggregation

**Example integration:**
```python
def calculate_team_scores(tournament_id, org_id, tourn_id, year):
    """
    Reuses existing leaderboard calculation logic.
    This is the SAME function called by /api/leaderboard endpoint.
    """
    # Fetch live leaderboard data from RapidAPI
    leaderboard_data = fetch_leaderboard_from_api(org_id, tourn_id, year)
    
    # Get team assignments from tournament
    tournament = db.collection('tournaments').document(tournament_id).get()
    team_assignments = tournament.get('teamAssignments', [])
    
    # Calculate team scores (existing logic)
    team_scores = []
    for team in team_assignments:
        team_total = calculate_team_total(team, leaderboard_data)
        team_scores.append({
            'teamName': team['name'],
            'score': team_total['score'],
            'position': team_total['position']
        })
    
    return team_scores
```

### 5. Caching Considerations

**Important:** The backend already has caching for the leaderboard API. Apply similar caching for in-progress tournament calculations:

- Cache duration: 5 minutes (same as leaderboard endpoint)
- Cache key: `annual_championship:{year}:inProgress:{timestamp // 5min}`
- Invalidate cache when tournament completes

### 6. Backward Compatibility

**Critical:** The `includeInProgress` parameter is OPTIONAL and defaults to `false`.

- Old frontend calls (without parameter) → Returns only completed tournaments
- New frontend calls (with `includeInProgress=true`) → Includes in-progress tournaments
- No breaking changes to existing behavior

### 7. Testing Checklist

- [ ] Endpoint works without `includeInProgress` parameter (backward compatibility)
- [ ] Endpoint returns only completed tournaments when `includeInProgress=false`
- [ ] Endpoint includes in-progress tournaments when `includeInProgress=true`
- [ ] `isComplete` flag is correctly set for each tournament
- [ ] Team scores for in-progress tournaments match leaderboard endpoint
- [ ] `inProgressCount` in metadata is accurate
- [ ] Performance is acceptable (leverage existing caching)
- [ ] Error handling when leaderboard API is unavailable

### 8. Deployment Strategy

1. **Deploy backend changes** to staging environment
2. **Test** with staging frontend (already deployed with new parameter)
3. **Verify** backward compatibility with production frontend (old parameter)
4. **Deploy backend** to production
5. **Deploy frontend** to production (already done)
6. **Monitor** for any performance or API rate limit issues

### 9. API Rate Limits

**Important:** Including in-progress tournaments will increase calls to the external leaderboard API.

**Mitigation:**
- Reuse existing caching (5-minute TTL)
- Only calculate in-progress tournament scores when explicitly requested
- Consider increasing cache duration during high-traffic periods

### 10. Example API Calls

**Production:**
```bash
# Only completed tournaments (original behavior)
curl "https://leaderboard-backend-628169335141.us-east1.run.app/api/annual_championship?year=2026"

# Include in-progress tournaments (new behavior)
curl "https://leaderboard-backend-628169335141.us-east1.run.app/api/annual_championship?year=2026&includeInProgress=true"
```

**Staging:**
```bash
# Include in-progress tournaments
curl "https://leaderboard-backend-staging-1056126670188.us-east1.run.app/api/annual_championship?year=2026&includeInProgress=true"
```

## Frontend Behavior

When the backend returns in-progress tournament data:
- ✅ Tournament headers show "● Live" badge
- ✅ Scores displayed in blue italic text
- ✅ Hover tooltip: "Position: X (Provisional - Live Tournament)"
- ✅ Info notice at bottom: "ℹ️ Includes provisional scores from live tournaments"

When tournament completes:
- ✅ Backend sets `isComplete: true`
- ✅ Frontend removes provisional styling
- ✅ Scores appear as normal (black, not italic)
- ✅ No "Live" badge shown

## Related Files

**Frontend (this repository):**
- `/src/components/AnnualChampionship.js` - Updated ✅
- `/README.md` - Updated ✅

**Backend (separate repository):**
- Annual championship endpoint handler
- Team calculation logic (reused from leaderboard endpoint)
- Caching configuration

## Questions or Issues?

If you encounter any issues during backend implementation, refer to:
- Existing `/api/leaderboard?calculateTeams=true` endpoint implementation
- Team calculation logic for round scoring
- Firebase tournament data structure
- RapidAPI integration for live leaderboard data
