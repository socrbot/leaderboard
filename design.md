# Alumni Golf Leaderboard V2 Design System

## 1. Product Goals
- Make leaderboard status legible in under 5 seconds.
- Keep the flow simple for casual users: login, view leaderboard, check scores.
- Preserve existing tournament workflow while improving polish and consistency.
- Keep admin controls powerful but visually separate from standard user actions.

## 2. Audience and UX Priorities
- Primary users: alumni league participants checking team and golfer performance.
- Secondary users: admins managing setup, drafts, and league configuration.
- UX priorities:
  - Fast scan of team standings
  - Minimal friction mobile navigation
  - Clear state feedback (live, complete, not started, cut)

## 3. Visual Direction
- Tone: modern, competitive, calm, trustworthy.
- Style: dark interface with restrained green accents.
- Use contrast and spacing to communicate hierarchy, not heavy decoration.

## 4. Design Tokens
### Color
- `--bg-page`: #1e1e1e
- `--bg-surface`: #1a1a1a
- `--bg-elevated`: #2a2a2a
- `--brand-primary`: #143d14
- `--brand-primary-hover`: #1a5c1a
- `--text-primary`: #ffffff
- `--text-secondary`: rgba(255,255,255,0.7)
- `--text-muted`: rgba(255,255,255,0.45)
- `--status-live`: #4ade80
- `--status-danger`: #f87171
- `--border-subtle`: rgba(255,255,255,0.12)

### Typography
- Font family: Arial, sans-serif.
- Heading weight: 700.
- Body weight: 400-500.
- Table numeric values: 500-700 for quick scanning.

### Radius and Elevation
- Small controls: 6px radius.
- Cards/panels: 8-12px radius.
- Shadows: subtle only, avoid strong glow except active avatar ring.

### Spacing
- Base unit: 4px.
- Common increments: 8, 12, 16, 20, 24, 32.
- Keep table rows compact but tappable on mobile.

## 5. Navigation and Information Architecture
### Header
- Sticky top header on all breakpoints.
- Left: brand + active league context.
- Right: primary navigation links (desktop) and profile/avatar entry.

### Mobile
- Bottom nav reserved for core views:
  - Leaderboard
  - Scores
  - Annual
- Profile/settings access via avatar in header.

### Role Behavior
- Standard user avatar opens My Settings.
- Admin avatar opens Setup screens.

## 6. Core Component Specs
### Avatar Entry Point
- Circular profile control, 34px size.
- Uses Google profile image when available.
- Fallback: initial in circular badge.
- Active state ring for current panel context.

### Buttons
- Primary: green fill, white text, medium emphasis.
- Secondary: neutral/outline style.
- Destructive: red-accent style (sign out/removal).

### Leaderboard Table
- Team rows are expandable.
- Expanded golfer rows include:
  - Headshot (or fallback initial)
  - Golfer name
  - Status badge (CUT, Thru, Finished)
  - Round score cells
- Team score row remains dominant visual anchor.

### Status Bar
- Context-specific content:
  - Annual view controls
  - Setup tournament context
  - Tournament detail context
- Include clear tournament state badge:
  - Live
  - Draft Complete
  - Tournament Complete
  - Not started placeholders

## 7. State Design Rules
### Loading
- Keep concise copy and avoid full-page jumpiness.
- Prefer preserving shell/layout while data hydrates.

### Empty/Not Started
- Keep team rows visible with placeholder score dashes.
- Do not hide structure before tournament starts.

### Error
- Use inline, readable error blocks.
- Keep recovery path visible when possible.

## 8. Accessibility and Quality Bar
- Maintain WCAG AA color contrast.
- Preserve visible focus states for keyboard users.
- Minimum tap target: 44x44 on touch devices.
- Do not communicate status by color alone.

## 9. Stitch Prompting Guardrails
Use these requirements when generating or editing screens in Stitch:
- Preserve current information architecture and feature flow.
- Keep dark theme and green brand accents from this document.
- Keep scoreboard/table readability as top priority.
- Do not replace the compact leaderboard table with card-only layouts.
- Keep avatar as the primary profile/settings entry point.
- Keep mobile bottom nav limited to core views.

## 10. Ready-to-Use Stitch Prompt Snippet
"Apply this design system to the current leaderboard app screens. Preserve existing workflows and data structure. Improve visual polish, spacing consistency, and component clarity while keeping the dark theme, green accents, sticky header, avatar profile entry point, expandable leaderboard team rows, and mobile bottom navigation with Leaderboard/Scores/Annual only."

## 11. Versioning
- Version: v1
- Date: 2026-05-24
- Owner: Product + Engineering
- Update process: revise this file first, then apply changes in Stitch, then implement/refine in VS Code.
