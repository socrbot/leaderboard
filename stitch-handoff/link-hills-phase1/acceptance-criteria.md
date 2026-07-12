# Extraction Acceptance Criteria (Phase 1)

## Coverage thresholds
- Navigation styles: captured on at least 2 distinct pages (home plus one of events/membership/contact)
- Button styles: primary and secondary variants captured with normal and hover/active visual intent
- Card styles: at least 2 card families captured (content/event, membership tier)
- Form styles: text input, textarea/select, label, and submit button captured
- Table/structured row styles: at least 1 membership or booking structured row/table pattern captured
- Footer styles: captured on at least 1 long-form page

## Token extractability checks
- Color palette provides at least:
  - 1 primary brand color
  - 1 accent color
  - 3 neutral/surface values
  - text/outline values
- Typography map provides at least:
  - headline family and scale
  - body family and size
  - label/utility style
- Spacing/radius map provides base spacing unit, gutters, margins, and radius scale

## Quality gates for Phase 2 handoff
- All five key pages have a designated primary Stitch reference screen
- At least one design system asset is attached to the project and references extracted colors and typography
- Handoff package includes:
  - component inventory
  - color palette file
  - typography map
  - spacing scale
  - page snapshot registry
- No blocker-level missing primitive among nav, button, card, form, table/structured row

## Current status
- Status: PASS
- Notes: Five key pages were generated as reference screens and mapped into this handoff package for tokenization.
- Rerun status: PASS for explicit URL extraction on membership, calendar, contact, clubhouse-dining, golf, swimming, tennis/pickleball, children, plan-an-event, trackman-suite, and palmer-advantage.
- Evidence: `url-extraction-coverage.json` and `page-layout-snapshots.json` (`extractedUrlScreens`).
