# Backend Implementation Guide: In-Progress Tournament Support

## Overview
This document provides implementation guidance for the **minimal backend changes** required to support displaying in-progress tournament scores in the Annual Championship table. The implementation **reuses existing backend functionality** - no new endpoints or status detection logic needed.

## Frontend Changes (COMPLETED ✅)
The frontend has been updated to:
- Call `/api/annual_championship?year=2026&includeInProgress=true`
- Display live tournament badges in column headers
- Show provisional scores in blue italic text
- Add hover tooltips indicating provisional status
- Display an info notice when live data is included

## Backend Changes Required (MINIMAL - Reusing Existing Logic)

### Summary: Can This Be Done Frontend-Only?
**NO - Backend changes are required, but they're minimal.** 

A frontend-only approach would require:
- Multiple API calls per page load (one per in-progress tournament)
- Complex data merging logic in the frontend
- No efficient way to get the list of in-progress tournaments

The backend change is simpler: add one query parameter that reuses existing logic.

### 1. Update `/api/annual_championship` Endpoint

**Location:** Backend API service (Cloud Run: leaderboard-backend-628169335141.us-east1.run.app)

**Changes Needed:**
1. Add support for `includeInProgress` query parameter (boolean, default: false)
2. When `includeInProgress=true`, include tournaments where `isDraftComplete=true` (not just `isOfficiallyComplete`)
3. **Reuse** existing `get_tournament_status_from_api()` function to determine if tournament is complete
4. **Reuse** existing team calculation logic from `/api/leaderboard?calculateTeams=true`
5. Add `isComplete` flag to each tournament object in response (from status detection)

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

### 3. Simplified Implementation (Reusing Existing Backend Functions)

**Key Insight:** The backend already has everything needed! Just wire it together.

```python
def get_annual_championship():
    year = request.args.get('year')
    include_in_progress = request.args.get('includeInProgress', 'false').lower() == 'true'
    
    # Get tournaments for this year
    tournaments_query = db.collection('tournaments').where('year', '==', year).get()
    
    tournament_data = []
    in_progress_count = 0
    
    for doc in tournaments_query:
        tournament = doc.to_dict()
        tournament_id = doc.id
        
        # REUSE: Existing tournament status detection
        # Backend already has get_tournament_status_from_api() function
        leaderboard_response = fetch_leaderboard_from_api(...)
        status = get_tournament_status_from_api(leaderboard_response)  # ← EXISTING FUNCTION
        is_complete = status['isOfficiallyComplete']
        
        # Filter based on includeInProgress parameter
        if not include_in_progress and not is_complete:
            continue  # Skip in-progress tournaments when includeInProgress=false
        
        if not tournament.get('isDraftComplete'):
            continue  # Skip tournaments where draft hasn't completed yet
        
        # Get team results
        if is_complete:
            # Use stored team results
            team_results = tournament.get('teamResults', [])
        else:
            # REUSE: Existing team calculation from /api/leaderboard endpoint
            # Backend already has this logic for calculateTeams=true
            team_results = calculate_team_scores_for_tournament(tournament_id)  # ← EXISTING LOGIC
            in_progress_count += 1
        
        tournament_data.append({
            'tournamentId': tournament_id,
            'name': tournament.get('name'),
            'teamResults': team_results,
            'isComplete': is_complete  # ← NEW: Add this flag
        })
    
    # Calculate standings (sum across tournaments) - EXISTING LOGIC
    standings = calculate_annual_standings(tournament_data)
    
    return {
        'standings': standings,
        'tournaments': tournament_data,
        'metadata': {
            'tournamentCount': len(tournament_data),
            'teamCount': len(standings),
            'inProgressCount': in_progress_count,  # ← NEW: Add this count
            'calculatedAt': datetime.utcnow().isoformat()
        }
    }
```

### 4. What's Being Reused (No New Code Needed)

✅ **Tournament Status Detection** - `get_tournament_status_from_api()`
   - Already returns `isOfficiallyComplete` and `isInProgress` flags
   - Used by `/api/leaderboard` endpoint

✅ **Team Score Calculation** - Team calculation logic in `/api/leaderboard?calculateTeams=true`
   - Best 3 of 4 golfer scores per round
   - Cut penalty logic
   - Round score aggregation
   - Already tested and working

✅ **Standings Calculation** - `calculate_annual_standings()`
   - Already sums tournament scores correctly
   - Sorts by total score
   - Returns proper format

### 5. Summary: Backend Changes vs Frontend-Only

**Backend Changes Required (RECOMMENDED):**
- ✅ Add `includeInProgress` query parameter (1 line)
- ✅ Filter tournaments by status (reuse existing `get_tournament_status_from_api()`)
- ✅ Call existing team calculation for in-progress tournaments
- ✅ Add `isComplete` flag to response
- ✅ Add `inProgressCount` to metadata
- **Total: ~20-30 lines of code, all reusing existing functions**

**Frontend-Only Alternative (NOT RECOMMENDED):**
- ❌ Call `/api/annual_championship` for completed tournaments
- ❌ Call `/api/tournaments` to get list of all tournaments for the year
- ❌ For each in-progress tournament, call `/api/leaderboard?calculateTeams=true`
- ❌ Merge all data in frontend
- ❌ Handle errors from multiple API calls
- **Total: 100+ lines of complex frontend code + N+2 API calls instead of 1**

**Verdict:** Backend changes are minimal, cleaner, more efficient, and reuse existing battle-tested logic. Frontend-only would be significantly more complex with worse performance.

### 6. Caching Considerations

### 6. Caching Considerations

**Important:** The backend already has caching for the leaderboard API. Apply similar caching for in-progress tournament calculations:

- Cache duration: 5 minutes (same as leaderboard endpoint) - **already implemented**
- Cache key: `annual_championship_{year}:inProgress:{includeInProgress}` 
- Invalidate cache when tournament completes - **existing logic**

**No new caching code needed** - reuse existing cache infrastructure.

### 7. Backward Compatibility

### 7. Backward Compatibility

**Critical:** The `includeInProgress` parameter is OPTIONAL and defaults to `false`.

- Old frontend calls (without parameter) → Returns only completed tournaments ✅
- New frontend calls (with `includeInProgress=true`) → Includes in-progress tournaments ✅
- **No breaking changes to existing behavior** ✅

### 8. Testing Checklist

- [ ] Endpoint works without `includeInProgress` parameter (backward compatibility)
- [ ] Endpoint returns only completed tournaments when `includeInProgress=false`
- [ ] Endpoint includes in-progress tournaments when `includeInProgress=true`
- [ ] `isComplete` flag is correctly set for each tournament (reusing status detection)
- [ ] Team scores for in-progress tournaments match `/api/leaderboard?calculateTeams=true`
- [ ] `inProgressCount` in metadata is accurate
- [ ] Performance is acceptable (reuses existing caching)
- [ ] Error handling when leaderboard API is unavailable (existing error handling)

### 9. Deployment Strategy

1. **Deploy backend changes** to staging environment
2. **Test** with staging frontend (already deployed with new parameter)
3. **Verify** backward compatibility with production frontend (old parameter)
4. **Deploy backend** to production (Cloud Run)
5. Frontend already deployed ✅
6. **Monitor** for any performance or API rate limit issues

### 10. Code Changes Summary

**What's NEW (to implement):**
- ✅ Add `includeInProgress` query parameter handling
- ✅ Add `isComplete` flag to tournament objects
- ✅ Add `inProgressCount` to metadata

**What's REUSED (already exists):**
- ✅ `get_tournament_status_from_api()` - tournament status detection
- ✅ Team calculation logic from `/api/leaderboard?calculateTeams=true`
- ✅ Standings calculation
- ✅ Caching infrastructure
- ✅ Error handling
- ✅ API rate limiting

**Estimated Implementation Time:** 1-2 hours (mostly testing existing integrations)

### 11. API Rate Limits

**Important:** Including in-progress tournaments will increase calls to the external leaderboard API.

**Mitigation (already in place):**
- ✅ Reuse existing caching (5-minute TTL)
- ✅ Only calculate in-progress tournament scores when explicitly requested
- ✅ Existing rate limiting infrastructure handles this
- Cache key includes `includeInProgress` to avoid cache collisions

### 12. Example API Calls

**Production:**
```bash
# Only completed tournaments (original behavior - backward compatible)
curl "https://leaderboard-backend-628169335141.us-east1.run.app/api/annual_championship?year=2026"

# Include in-progress tournaments (new behavior)
curl "https://leaderboard-backend-628169335141.us-east1.run.app/api/annual_championship?year=2026&includeInProgress=true"
```

**Staging:**
```bash
# Include in-progress tournaments
curl "https://leaderboard-backend-staging-1056126670188.us-east1.run.app/api/annual_championship?year=2026&includeInProgress=true"
```

## Frontend Behavior (Already Implemented ✅)

When the backend returns in-progress tournament data:
- ✅ Tournament headers show "● Live" badge
- ✅ Scores displayed in blue italic text
- ✅ Hover tooltip: "Position: X (Provisional - Live Tournament)"
- ✅ Info notice at bottom: "ℹ️ Includes provisional scores from live tournaments"

When tournament completes:
- ✅ Backend sets `isComplete: true` (using existing status detection)
- ✅ Frontend removes provisional styling
- ✅ Scores appear as normal (black, not italic)
- ✅ No "Live" badge shown

## Related Files

**Frontend (this repository - COMPLETED ✅):**
- `/src/components/AnnualChampionship.js` - Updated ✅
- `/README.md` - Updated ✅
- `/BACKEND_IMPLEMENTATION_GUIDE.md` - Updated ✅

**Backend (socrbot/leaderboard-backend - NEEDS DEPLOYMENT):**
- `app.py` - `/api/annual_championship` endpoint (minor update needed)
- Existing functions to reuse:
  - `get_tournament_status_from_api()` - status detection
  - Team calculation logic from `/api/leaderboard?calculateTeams=true`
  - Caching infrastructure
  - Firebase tournament queries

## Key Takeaways

1. **Backend changes ARE required** - cannot be done frontend-only without major complexity
2. **Changes are MINIMAL** (~20-30 lines) - mostly wiring together existing functions
3. **No new endpoints needed** - just add one query parameter
4. **No new logic needed** - reuse existing status detection and team calculation
5. **Backward compatible** - default behavior unchanged
6. **Already cached** - existing cache infrastructure handles it
7. **Already tested** - reusing battle-tested functions from `/api/leaderboard`

## Questions or Issues?

If you encounter any issues during backend implementation, refer to:
- Existing `/api/leaderboard?calculateTeams=true` endpoint implementation
- `get_tournament_status_from_api()` function for status detection
- Team calculation logic for round scoring
- Firebase tournament data structure
- RapidAPI integration for live leaderboard data
