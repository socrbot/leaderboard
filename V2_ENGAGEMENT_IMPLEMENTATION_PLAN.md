# V2 Engagement Build Checklist (File-Mapped)

## Goal
Ship two V2 engagement upgrades without changing core leaderboard behavior:
- Draft-turn web push notifications for existing draft workflows
- One-click invite sharing (Share, SMS, WhatsApp) using existing league invite code

## Guardrails
- Only use existing leaderboard workflows (draft, league join, invite code)
- No club/promotional campaign notifications
- Reuse existing backend routes where possible

## Task 0: Baseline and Safety

- [ ] 0.1 Confirm current behavior before changes
  - Files:
    - src/components/DraftPicker.js
    - src/components/LeagueManagement.js
    - src/components/UserSettings.js
    - app.py
  - Action:
    - Verify draft picks work end-to-end and invite code copy still works before starting
    - Capture one staging smoke test run for comparison after implementation
  - Done when:
    - You have a known-good baseline for draft pick flow and invite code flow

## Task 1: Web Push Foundation (Frontend)

- [ ] 1.1 Implement web push registration path (currently web no-op)
  - Files:
    - src/notifications/registerPush.js
  - Action:
    - Add browser path to request notification permission
    - Register and track a web token the same way native token path is tracked
    - Keep native path unchanged
  - Done when:
    - Signed-in web user can register token and call existing token endpoint

- [ ] 1.2 Keep auth-triggered registration for all platforms
  - Files:
    - src/contexts/AuthContext.js
  - Action:
    - Keep register on sign-in and unregister on sign-out
    - Ensure web path now runs through the same entry point
  - Done when:
    - Login triggers token registration; logout unregisters token

- [ ] 1.3 Add foreground handling hook for draft-turn notices
  - Files:
    - src/notifications/registerPush.js
    - src/App.js
  - Action:
    - Add a lightweight callback/event bridge from notification listener to app state
    - In App, show non-blocking in-app banner while user is active
  - Done when:
    - Foreground notification is visible in app without breaking navigation

- [ ] 1.4 Verify service worker registration path remains valid
  - Files:
    - src/index.js
  - Action:
    - Confirm current service worker registration is compatible with web messaging flow
    - Ensure production-only registration behavior is preserved
  - Done when:
    - Service worker still registers in production and no console startup regressions appear

## Task 2: Notification Preferences (Frontend + Backend)

- [ ] 2.1 Persist draft notification toggle in settings payload
  - Files:
    - src/components/UserSettings.js
    - app.py
  - Action:
    - Replace local-only push toggle behavior with persisted user setting field
    - Add draft notification preference to GET/PUT settings contract in app.py
  - Done when:
    - Toggle survives refresh and returns correctly from /api/user/settings

- [ ] 2.2 Keep API endpoint constants centralized
  - Files:
    - src/apiConfig.js
  - Action:
    - Add endpoint constants only if needed for new settings or link helpers
    - Avoid hardcoded route strings in components
  - Done when:
    - All new fetch calls use centralized constants

## Task 3: Draft-Turn Notification Reliability (Backend)

- [ ] 3.1 Enforce on-clock notification trigger at pick submission boundary
  - Files:
    - app.py
  - Action:
    - In /api/tournaments/<tournament_id>/picks (make_draft_pick), keep trigger after successful write
    - Ensure next picker notification runs only after draftPicks update is committed
  - Done when:
    - Next picker receives notification after each valid pick

- [ ] 3.2 Add dedupe key for turn notifications
  - Files:
    - app.py
  - Action:
    - Add dedupe guard keyed by tournamentId + nextPickNumber
    - Prevent duplicate send if endpoint is retried
  - Done when:
    - Repeated request/retry cannot emit duplicate on-clock notification for same pick state

- [ ] 3.3 Add simple throttle guardrail
  - Files:
    - app.py
  - Action:
    - Add minimal per-user/per-tournament cooldown for turn notifications
    - Keep cooldown short to avoid blocking legitimate next-turn sends
  - Done when:
    - Rapid repeated sends are limited while normal draft progression still notifies correctly

## Task 4: Draft Notification Routing in UI

- [ ] 4.1 Route notification taps into active draft context
  - Files:
    - src/App.js
    - src/components/DraftPicker.js
  - Action:
    - Handle notification payload target fields and set selected tournament/view accordingly
    - Ensure destination lands on draft picker when draft is active
  - Done when:
    - Tapping a draft-turn notification opens correct tournament draft flow

- [ ] 4.2 Add denied-permission fallback hint
  - Files:
    - src/components/UserSettings.js
    - src/App.js
  - Action:
    - If push permissions are denied, show concise in-app hint for manual draft polling
  - Done when:
    - Users without permission still get clear guidance and can continue drafting

## Task 5: Invite Flywheel (Frontend First)

- [ ] 5.1 Add one-click share actions near invite code
  - Files:
    - src/components/LeagueManagement.js
  - Action:
    - Add actions for Share, SMS, WhatsApp next to existing invite code UI
    - Keep existing copy button and behavior intact
  - Done when:
    - Admin can send invite via one click from League Management card

- [ ] 5.2 Add same share actions in members/admin league view
  - Files:
    - src/components/LeagueMembersTeams.js
  - Action:
    - Add consistent share actions where invite code is displayed
  - Done when:
    - Invite share options are available in both management surfaces

- [ ] 5.3 Implement channel fallback chain
  - Files:
    - src/components/LeagueManagement.js
    - src/components/LeagueMembersTeams.js
  - Action:
    - Try Web Share API first
    - Fallback to sms: and WhatsApp link templates
    - Fallback to clipboard copy if share target unavailable
  - Done when:
    - Share works across desktop and mobile browsers with graceful fallback

- [ ] 5.4 Standardize invite message template
  - Files:
    - src/components/LeagueManagement.js
    - src/components/LeagueMembersTeams.js
  - Action:
    - Prefill message with league name + invite code + join instruction text
    - Keep copy concise and workflow-focused
  - Done when:
    - All share channels produce consistent message content

## Task 6: Optional Backend Helper (Only If Needed)

- [ ] 6.1 Add canonical invite link helper endpoint (optional)
  - Files:
    - app.py
  - Action:
    - Add lightweight endpoint to return canonical join link format for a league
    - Keep league authorization and validation consistent with existing routes
  - Done when:
    - Frontend can request stable shareable URL without hardcoding

## Task 7: Tracking and Validation

- [ ] 7.1 Add frontend analytics hooks for share actions
  - Files:
    - src/components/LeagueManagement.js
    - src/components/LeagueMembersTeams.js
    - src/App.js
  - Action:
    - Track share clicked, channel selected, and share fallback used
  - Done when:
    - You can report invite share usage by channel

- [ ] 7.2 Add backend logging for push send decisions
  - Files:
    - app.py
  - Action:
    - Log notification decision outcomes (sent, deduped, throttled, skipped)
    - Include tournament and pick context (no sensitive payloads)
  - Done when:
    - Draft notification behavior is diagnosable from logs

## Task 8: Regression Checklist

- [ ] 8.1 Draft flow regressions
  - Files:
    - src/components/DraftPicker.js
    - src/App.js
    - app.py
  - Verify:
    - User whose turn it is can still pick
    - Non-turn user is still blocked
    - Draft completes normally

- [ ] 8.2 League/invite regressions
  - Files:
    - src/components/LeagueManagement.js
    - src/components/LeagueMembersTeams.js
    - src/components/UserSettings.js
    - app.py
  - Verify:
    - Create league, join by code, copy invite code still work
    - New share controls do not alter existing copy/join behavior

- [ ] 8.3 Settings regressions
  - Files:
    - src/components/UserSettings.js
    - app.py
  - Verify:
    - Existing annual/teamName saves still work
    - New draft notification preference persists correctly

## Suggested Build Order
1. Tasks 1 and 2 (foundation + persisted preferences)
2. Tasks 3 and 4 (reliable on-clock notifications + routing)
3. Task 5 (invite flywheel)
4. Tasks 7 and 8 (tracking + regression hardening)
5. Task 6 only if frontend needs canonical link support

## Definition of Done
- Web users can register for push and receive draft-turn notifications
- Notification tap opens the correct draft context in current workflows
- Invite sharing works in one click (Share, SMS, WhatsApp) from league screens
- Existing create/join/draft behavior is unchanged
