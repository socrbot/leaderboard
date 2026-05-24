# Stitch Design Briefs (V2)

Use these prompts in Google Stitch to iterate quickly while preserving the current product structure.

## Brief 1: Landing and Login Polish
### Goal
Improve first impression and login clarity without changing authentication flow.

### Prompt
"Update the unauthenticated landing screen for a golf leaderboard web app. Keep a dark visual theme with green brand accents and a clean, premium sports feel. Preserve a single primary action: Sign in with Google. Keep the current information architecture and copy hierarchy, but improve spacing, typography rhythm, and visual polish. Include an elegant hero illustration area and ensure mobile and desktop layouts are both clean and responsive."

### Must Keep
- Single CTA for login
- Existing dark + green brand direction
- Fast load and high contrast readability
- No join league flow on this screen yet

### Do Not
- Add extra auth options
- Replace with multi-step onboarding
- Introduce unrelated navigation links

## Brief 2: Leaderboard Readability Pass
### Goal
Enhance scanability of team standings and golfer details while preserving table workflow.

### Prompt
"Refine the main leaderboard screen visuals for readability and hierarchy. Preserve the existing table-based structure with expandable team rows and golfer rows beneath each team. Keep dark theme and green accents, and improve spacing, row contrast, status badge clarity, and column legibility for TOTAL/R1/R2/R3/R4. Keep profile avatar entry in header and keep mobile bottom navigation limited to Leaderboard, Scores, and Annual. Optimize for both desktop and mobile without replacing the table with card-only layouts."

### Must Keep
- Expand/collapse team rows
- Team-first visual hierarchy
- Golfer headshot + name + status in expanded rows
- Existing nav structure and feature flow

### Do Not
- Remove table columns
- Convert leaderboard to feed/cards only
- Change data semantics or score formatting conventions

## Brief 3: Settings and Admin Setup Cleanup
### Goal
Create clearer visual separation between user settings and admin setup tools.

### Prompt
"Improve the visual design of the My Settings and Admin Setup screens while preserving existing functionality and section structure. Keep the dark + green design language, improve section grouping, spacing, form control consistency, and action button hierarchy. For admin setup, emphasize operational clarity for league/team/tournament management tabs. For user settings, prioritize profile, annual participation toggle, and sign-out clarity. Keep interaction flow unchanged."

### Must Keep
- Existing tabs and controls
- Role-based behavior (admin setup vs user settings)
- Current backend/API assumptions

### Do Not
- Add new permissions models
- Merge admin and user panels into one screen
- Change business logic or workflow order

## Cross-Brief Constraints
- Preserve current information architecture and feature behavior.
- Keep sticky header behavior and avatar profile entry point.
- Maintain WCAG AA contrast targets.
- Keep mobile tap targets >= 44x44.
- Use concise motion (150-200ms transitions), no heavy animation.

## Export + Handoff Checklist
When exporting from Stitch, ensure output includes:
- Updated layout structure notes
- Component-level style decisions (buttons, tables, badges, cards)
- Mobile behavior notes
- Color/type/spacing token mapping
- Any suggested copy changes flagged explicitly

Then reconcile changes into VS Code incrementally by screen:
1. Landing/login
2. Leaderboard table and row styling
3. Settings/setup panel polish
