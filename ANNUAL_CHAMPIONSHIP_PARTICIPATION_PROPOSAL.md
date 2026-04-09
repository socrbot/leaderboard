# Annual Championship Participation - Analysis & Proposal

**Date**: April 8, 2026  
**Issue**: Teams in annual championship don't respect global team settings

---

## Current Issues

### 1. **Stale Data Problem**
- Annual championship uses `participatesInAnnual` from tournament's `teams` array
- This value is **copied** from `global_teams` when tournament is created
- Changes to global team settings don't affect existing tournaments
- Results in teams showing in annual championship when they shouldn't

### 2. **Confusing UX**
- `participatesInAnnual` checkbox appears in **Draft Management** (TeamManagement.js)
- This edits the tournament-specific copy, not the global setting
- Users expect changes in Setup → Global Teams to be the source of truth
- Two places to edit same setting leads to confusion

### 3. **No Year-Specific Participation**
- Current design doesn't support "participate in 2025 but not 2026"
- `participatesInAnnual` is a simple boolean, not year-aware

---

## Current Architecture

### Data Flow
```
Tournament Creation
├─ Copies from global_teams.participatesInAnnual 
└─ Stores in tournament.teams[].participatesInAnnual

Annual Championship Calculation
├─ Reads tournament.teams[]
├─ Filters by teams[].participatesInAnnual
└─ Never checks global_teams (source of truth is ignored!)
```

### Data Structure
```javascript
// global_teams collection
{
  id: "team-abc",
  name: "Team Wittig",
  participatesInAnnual: true,  // ← Source of truth (but ignored!)
  golferNames: [...],
  draftOrder: 1
}

// tournaments collection
{
  id: "tournament-xyz",
  year: "2026",
  teamAssignments: [
    { globalTeamId: "team-abc" }  // ← Just a reference
  ],
  teams: [  // ← Legacy copy (USED by annual championship)
    {
      name: "Team Wittig",
      participatesInAnnual: true,  // ← Stale copy from creation time
      golferNames: [...],
      draftOrder: 1
    }
  ]
}
```

---

## Proposed Solution

### **Option A: Use Global Teams as Source of Truth** ⭐ RECOMMENDED

**Changes:**
1. Annual championship looks up `participatesInAnnual` from `global_teams` collection
2. Remove `participatesInAnnual` from tournament-specific `teams` array
3. Remove "Annual Championship Participant" checkbox from Draft Management
4. Keep checkbox only in Setup → Global Teams Management

**Benefits:**
- Single source of truth
- Changes to global teams immediately affect all tournaments
- Simpler, less confusing UX
- Backward compatible (can still read legacy data)

**Limitations:**
- Can't have year-specific participation (team is in/out for ALL years)

---

### **Option B: Add Year-Specific Exclusions** 

**Changes:**
1. Add `excludedYears` array to global_teams
2. Annual championship checks both `participatesInAnnual` AND if year is excluded
3. Add year selector in Global Teams Management for exclusions

**Data Structure:**
```javascript
// global_teams
{
  id: "team-abc",
  name: "Team Wittig",
  participatesInAnnual: true,
  excludedYears: ["2024", "2025"],  // ← New field
  golferNames: [...]
}
```

**Benefits:**
- Year-specific control
- Can say "participate in 2026 but not 2025"
- More flexible for future needs

**Complexity:**
- More complex UI
- More logic to maintain

---

### **Option C: Tournament-Level Overrides**

**Changes:**
1. Keep `participatesInAnnual` in global_teams as default
2. Add optional override in tournament's `teamAssignments`
3. Use override if present, otherwise use global setting

**Data Structure:**
```javascript
// tournaments
{
  teamAssignments: [
    { 
      globalTeamId: "team-abc",
      participatesInAnnual: false  // ← Optional override
    }
  ]
}
```

**Benefits:**
- Most flexible
- Can override per tournament

**Complexity:**
- Most complex to implement and maintain
- Users might not discover override feature

---

## Recommended Implementation: Option A

### Phase 1: Fix Annual Championship Backend

**File**: `leaderboard-backend/app.py`

```python
def get_annual_championship():
    # ... existing code ...
    
    for doc in tournaments_ref:
        tournament_data = doc.to_dict()
        tournament_id = doc.id
        
        # NEW: Get team participation from global_teams (source of truth)
        team_assignments = tournament_data.get('teamAssignments', [])
        annual_teams = []
        
        for assignment in team_assignments:
            global_team_id = assignment.get('globalTeamId')
            if global_team_id:
                # Look up current participatesInAnnual from global_teams
                team_doc = db.collection('global_teams').document(global_team_id).get()
                if team_doc.exists:
                    team_data = team_doc.to_dict()
                    if team_data.get('participatesInAnnual', True):
                        annual_teams.append({
                            'globalTeamId': global_team_id,
                            'name': team_data.get('name'),
                            'golferNames': team_data.get('golferNames', [])
                        })
        
        if not annual_teams:
            continue
        
        # ... rest of logic ...
```

### Phase 2: Remove from Draft Management

**File**: `leaderboard/src/components/TeamManagement.js`

Remove lines 440-450 (the participatesInAnnual checkbox)

### Phase 3: Update Tournament Creation

**File**: `leaderboard-backend/app.py`

Stop copying `participatesInAnnual` to legacy `teams` array (or keep for backward compat but ignore it)

---

## Migration Strategy

### Backward Compatibility
1. Keep reading legacy `teams` array if `teamAssignments` is empty
2. Gradually migrate old tournaments to use `teamAssignments`
3. Eventually deprecate `teams` array

### Testing Plan
1. Test with 2025 tournaments (should use legacy data)
2. Test with 2026 tournaments (should use global teams)
3. Test changing global team settings and verify annual championship updates
4. Test teams that don't participate still show in tournament but not annual championship

---

## Questions to Consider

1. **Do you need year-specific participation?**
   - If yes → Use Option B (excludedYears)
   - If no → Use Option A (simple global setting)

2. **Should changes to global teams affect past years?**
   - If yes → Use Option A (dynamic lookup)
   - If no → Keep current system (snapshot at creation)

3. **Where should the "source of truth" live?**
   - Global Teams (recommended) → Option A
   - Per Tournament → Option C
   - Hybrid → Option B

---

## My Recommendation

**Implement Option A** because:
1. ✅ Simplest to implement and maintain
2. ✅ Clearest UX - one place to manage participation
3. ✅ Fixes the immediate issue
4. ✅ Can add year-specific logic later if needed

**Next Steps:**
1. Confirm you agree with Option A
2. Remove participatesInAnnual checkbox from Draft Management
3. Update annual championship backend to query global_teams
4. Test thoroughly
5. Deploy to staging
6. Monitor and validate

---

Would you like me to implement Option A now?
