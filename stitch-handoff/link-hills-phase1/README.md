# Link Hills Stitch Capture - Phase 1 Handoff

This package contains Stitch-derived design capture artifacts for Link Hills pages.

## Stitch execution summary
- Stitch project: `projects/6254094080875130949`
- Primary design system: `assets/0ab0c14d266e4376954bb9bc8ecdac47`
- Capture date: 2026-05-31
- Target pages (initial reference set): home, membership, events, contact, booking
- Rerun coverage (explicit URL extraction):
	- https://linkhills.com/membership/
	- https://linkhills.com/calendar
	- https://linkhills.com/contact
	- https://linkhills.com/clubhouse-dining
	- https://linkhills.com/golf
	- https://linkhills.com/swimming
	- https://linkhills.com/tennis%2Fpickleball
	- https://linkhills.com/children
	- https://linkhills.com/plan-an-event
	- https://linkhills.com/trackman-suite
	- https://linkhills.com/palmer-advantage

## Files in this package
- `component-inventory.md` - reusable UI primitives and where they were observed
- `color-palette.json` - normalized palette extracted from Stitch design theme
- `typography-map.json` - normalized typography tokens from Stitch design theme
- `spacing-scale.json` - spacing, radius, and layout scale values
- `page-layout-snapshots.json` - key Stitch screen references and export links
- `url-extraction-coverage.json` - explicit URL-to-Stitch-document mapping for full-site coverage
- `acceptance-criteria.md` - extraction quality gates for Phase 1 completion

## Notes
- Stitch generated additional image and extracted-text helper screens. The missed URL set is now included in `url-extraction-coverage.json` and `page-layout-snapshots.json` under `extractedUrlScreens`.
- Artifacts are ready for Phase 2 tokenization and schema mapping.
