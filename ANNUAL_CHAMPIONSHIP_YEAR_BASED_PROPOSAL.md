# Annual Championship - Year-Based Global Teams Proposal

**Date**: April 8, 2026  
**Solution**: Year-specific global teams using banner year selector

---

## Concept

Global teams are managed **per year**, using the year from the header banner as the active season.

### Key Benefits
- ✅ Different teams can participate each year
- ✅ Team roster changes year-to-year (players graduate, new players join)
- ✅ participatesInAnnual is year-specific automatically
- ✅ Easy to copy previous year's teams to new year
- ✅ No stale data - teams for 2026 are separate from 2025 teams

---

## Data Architecture

### Option A1: Single Collection with Year Field ⭐ RECOMMENDED

**Structure:**
```javascript
// global_teams collection
{
  id: "2026-team-wittig",
  year: "2026",                    // ← Year field
  name: "Team Wittig",
  participatesInAnnual: true,
  golferNames: ["Player A", "..."],
  draftOrder: 1,
  createdAt: timestamp
}

{
  id: "2025-team-wittig",
  year: "2025",                    // ← Different year
  name: "Team Wittig",
  participatesInAnnual: true,
  golferNames: ["Old Player", "..."],  // Different roster
  draftOrder: 1,
  createdAt: timestamp
}
```

**Benefits:**
- All teams in one collection
- Easy to query: `.where('year', '==', selectedYear)`
- Can easily duplicate teams from previous year
- Simple to manage in Firestore console

---

### Option A2: Separate Collections Per Year

**Structure:**
```
global_teams_2025/
  ├─ team-wittig
  ├─ team-ash
  └─ ...

global_teams_2026/
  ├─ team-wittig
  ├─ team-ash
  └─ ...
```

**Benefits:**
- Clear separation by year
- No need to filter queries

**Drawbacks:**
- Collection proliferation
- Harder to copy teams year-to-year
- Complex migration when renaming

---

## Recommended Implementation: Option A1

### 1. Update Global Teams Data Model

**Migration Strategy:**
```javascript
// Existing global_teams (no year field)
{
  id: "team-wittig",
  name: "Team Wittig",
  participatesInAnnual: true,
  golferNames: [...]
}

// Migrate to:
{
  id: "2025-team-wittig",     // ← Add year prefix
  year: "2025",               // ← Add year field
  name: "Team Wittig",
  participatesInAnnual: true,
  golferNames: [...]
}
```

---

### 2. Backend Changes

#### A. Global Teams Endpoints (app.py)

**GET /api/global_teams**
```python
@app.route('/api/global_teams', methods=['GET'])
def get_global_teams():
    year = request.args.get('year', str(datetime.now().year))
    
    teams_ref = db.collection('global_teams')\
                   .where('year', '==', year)\
                   .order_by('name')\
                   .get()
    
    # ... return teams for specific year
```

**POST /api/global_teams**
```python
@app.route('/api/global_teams', methods=['POST'])
def create_global_team():
    data = request.json
    year = data.get('year')  # ← Required field
    
    new_team = {
        "name": data['name'],
        "year": year,  # ← Store year
        "participatesInAnnual": data.get('participatesInAnnual', True),
        "golferNames": data.get('golferNames', []),
        "draftOrder": data.get('draftOrder', 0),
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    # ...
```

**NEW: Copy Teams to New Year**
```python
@app.route('/api/global_teams/copy_year', methods=['POST'])
def copy_global_teams_year():
    """Copy all teams from one year to another"""
    data = request.json
    from_year = data.get('fromYear')
    to_year = data.get('toYear')
    
    # Fetch teams from source year
    source_teams = db.collection('global_teams')\
                     .where('year', '==', from_year)\
                     .get()
    
    # Create copies for new year
    for team_doc in source_teams:
        team_data = team_doc.to_dict()
        new_team = {
            **team_data,
            'year': to_year,
            'golferNames': [],  # Reset golfers for new year
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        db.collection('global_teams').add(new_team)
    
    return jsonify({"message": f"Copied {len(source_teams)} teams from {from_year} to {to_year}"})
```

#### B. Annual Championship (app.py)

```python
@app.route('/api/annual_championship', methods=['GET'])
def get_annual_championship():
    year = request.args.get('year', str(datetime.now().year))
    
    # Get tournaments for this year
    tournaments_ref = db.collection('tournaments')\
                        .where('year', '==', year)\
                        .get()
    
    for doc in tournaments_ref:
        tournament_data = doc.to_dict()
        team_assignments = tournament_data.get('teamAssignments', [])
        annual_teams = []
        
        # NEW: Look up participation from global_teams for THIS YEAR
        for assignment in team_assignments:
            global_team_id = assignment.get('globalTeamId')
            if global_team_id:
                # Query global_teams for this specific year
                team_doc = db.collection('global_teams').document(global_team_id).get()
                if team_doc.exists:
                    team_data = team_doc.to_dict()
                    # Verify team belongs to this year
                    if team_data.get('year') == year and \
                       team_data.get('participatesInAnnual', True):
                        annual_teams.append(team_data)
        
        # ... rest of logic
```

#### C. Tournament Creation (app.py)

```python
@app.route('/api/tournaments', methods=['POST'])
def create_tournament():
    data = request.json
    year = data.get('year', '')
    
    # ... create tournament ...
    
    # Auto-assign global teams FOR THIS YEAR
    global_teams_ref = db.collection('global_teams')\
                         .where('year', '==', year)\
                         .order_by('name')\
                         .get()
    
    team_assignments = []
    for team_doc in global_teams_ref:
        team_assignments.append({
            "globalTeamId": team_doc.id
        })
    
    # Update tournament with year-specific teams
    db.collection('tournaments').document(tournament_id).update({
        "teamAssignments": team_assignments
    })
```

---

### 3. Frontend Changes

#### A. Global Teams Management (GlobalTeamsManagement.js)

```javascript
const GlobalTeamsManagement = ({ selectedYear }) => {  // ← Get year from parent
  const [teams, setTeams] = useState([]);
  
  useEffect(() => {
    fetchGlobalTeams();
  }, [selectedYear]);  // ← Refetch when year changes
  
  const fetchGlobalTeams = async () => {
    const response = await fetch(
      `${BACKEND_BASE_URL}/global_teams?year=${selectedYear}`
    );
    // ...
  };
  
  const handleCreateTeam = async (teamData) => {
    const response = await fetch(`${BACKEND_BASE_URL}/global_teams`, {
      method: 'POST',
      body: JSON.stringify({
        ...teamData,
        year: selectedYear  // ← Include year from banner
      })
    });
  };
  
  // NEW: Copy teams from previous year
  const handleCopyFromPreviousYear = async () => {
    const previousYear = (parseInt(selectedYear) - 1).toString();
    const confirmed = window.confirm(
      `Copy all teams from ${previousYear} to ${selectedYear}? ` +
      `Golfer assignments will be cleared.`
    );
    
    if (confirmed) {
      const response = await fetch(`${BACKEND_BASE_URL}/global_teams/copy_year`, {
        method: 'POST',
        body: JSON.stringify({
          fromYear: previousYear,
          toYear: selectedYear
        })
      });
      
      if (response.ok) {
        alert('Teams copied successfully!');
        fetchGlobalTeams();
      }
    }
  };
  
  return (
    <div>
      <h2>Global Teams - {selectedYear} Season</h2>
      
      {/* NEW: Copy from previous year button */}
      <button onClick={handleCopyFromPreviousYear}>
        📋 Copy Teams from {parseInt(selectedYear) - 1}
      </button>
      
      {/* ... rest of UI */}
    </div>
  );
};
```

#### B. Remove from Draft Management (TeamManagement.js)

```javascript
// REMOVE these lines (440-450):
// <div className="team-card-option">
//   <label className="checkbox-label">
//     <input
//       type="checkbox"
//       checked={team.participatesInAnnual !== false}
//       onChange={(e) => handleAnnualParticipationChange(teamIndex, e.target.checked)}
//     />
//     Annual Championship Participant
//   </label>
// </div>
```

---

### 4. User Experience Flow

#### Creating Teams for New Season (2026)

1. **User selects 2026 in banner**
2. **Goes to Setup → Global Teams**
3. **Sees empty list or button to copy from 2025**
4. **Clicks "Copy Teams from 2025"**
5. **System creates 2026 teams with:**
   - Same team names
   - Same participatesInAnnual setting
   - Empty golfer lists (to be filled during draft)
6. **User can then:**
   - Add new teams
   - Remove teams not participating
   - Adjust draft order

#### Creating a Tournament

1. **User selects 2026 in banner**
2. **Creates "The Masters 2026" tournament**
3. **System automatically assigns all 2026 global teams**
4. **During draft, golfers are assigned to teams**
5. **After completion, tournament counts toward 2026 annual championship**

#### Viewing Annual Championship

1. **User selects 2025 in banner**
2. **Clicks "Annual Championship"**
3. **Sees 2025 championship standings**
4. **Only includes 2025 teams with participatesInAnnual=true**
5. **Switches to 2026 → sees separate 2026 championship**

---

### 5. Migration Plan

#### Phase 1: Add Year Field to Existing Teams
```javascript
// Migration script (run once)
const existingTeams = await db.collection('global_teams').get();

for (const teamDoc of existingTeams) {
  // Assign existing teams to 2025
  await db.collection('global_teams').document(teamDoc.id).update({
    year: "2025"
  });
}
```

#### Phase 2: Update All Endpoints
- Add year parameter to global_teams endpoints
- Update annual championship to filter by year
- Update tournament creation to use year-specific teams

#### Phase 3: Update Frontend
- Pass selectedYear to GlobalTeamsManagement
- Add "Copy from Previous Year" button
- Show year in UI headings

#### Phase 4: Test Thoroughly
- Create 2026 teams
- Create 2026 tournament
- Verify annual championship shows correct year data
- Verify 2025 data still works

---

### 6. Database Structure Example

```
global_teams/
├─ 2025-team-wittig (year: "2025", participates: true)
├─ 2025-team-ash (year: "2025", participates: true)
├─ 2025-team-brooks (year: "2025", participates: false)
├─ 2026-team-wittig (year: "2026", participates: true)
├─ 2026-team-ash (year: "2026", participates: true)
├─ 2026-team-newbie (year: "2026", participates: true)  ← New team
└─ ... (no 2026-team-brooks - graduated/not participating)

tournaments/
├─ 2025-masters (year: "2025", teamAssignments: [2025-team-wittig, ...])
├─ 2025-us-open (year: "2025", teamAssignments: [2025-team-wittig, ...])
├─ 2026-masters (year: "2026", teamAssignments: [2026-team-wittig, ...])
└─ ...
```

---

## Benefits of This Approach

### ✅ Year Isolation
- 2025 teams completely separate from 2026 teams
- No risk of affecting previous year's data

### ✅ Natural Evolution
- Teams change: players graduate, new players join
- Easy to add/remove teams each year
- participatesInAnnual is naturally year-specific

### ✅ Easy Setup
- Copy previous year's teams with one click
- Modify as needed for new season
- Clear which teams are active for which year

### ✅ Clean Annual Championship
- Automatically uses correct teams for selected year
- No stale data issues
- Source of truth is clear

### ✅ Backward Compatible
- Can migrate existing 2025 data easily
- Keep tournament structure unchanged
- Only add year filtering

---

## Implementation Checklist

- [ ] Add year field to global_teams collection
- [ ] Migrate existing teams to 2025
- [ ] Update GET /api/global_teams to filter by year
- [ ] Update POST /api/global_teams to require year
- [ ] Update PUT /api/global_teams/{id} to maintain year
- [ ] Create POST /api/global_teams/copy_year endpoint
- [ ] Update annual championship to query year-specific teams
- [ ] Update tournament creation to use year-specific teams
- [ ] Pass selectedYear to GlobalTeamsManagement component
- [ ] Add "Copy from Previous Year" button to UI
- [ ] Remove participatesInAnnual from TeamManagement.js
- [ ] Update UI headings to show year
- [ ] Test migration with 2025 data
- [ ] Test creating 2026 teams
- [ ] Test annual championship with both years
- [ ] Deploy to staging
- [ ] Verify on staging
- [ ] Deploy to production

---

## Next Steps

Would you like me to:
1. Start implementing this year-based global teams system?
2. Begin with the backend changes (add year field, update endpoints)?
3. Create the migration script for existing 2025 data?

This approach gives you complete flexibility for each season while keeping the data clean and manageable!
