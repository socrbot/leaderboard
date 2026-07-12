# Link Hills Prototype Context File

## Scope snapshot
- Primary goal: Strategy B prototype for a unified digital clubhouse experience (public marketing + member portal + fantasy engine) built from Stitch capture and tokenization.
- Isolation goal: no impact to V2 leaderboard runtime behavior.
- Reuse goal: use existing backend APIs/projects where possible with no contract or behavior changes.

## Canonical control docs
- Requirements: [PROTOTYPE_REQUIREMENTS.md](PROTOTYPE_REQUIREMENTS.md)
- GTM strategy: [GTM_STRATEGY_SUMMARY.md](GTM_STRATEGY_SUMMARY.md)
- Stitch handoff: [README.md](README.md)
- URL coverage: [url-extraction-coverage.json](url-extraction-coverage.json)
- Snapshot map: [page-layout-snapshots.json](page-layout-snapshots.json)

## Guardrails to apply on every change
- Keep V2 runtime untouched during prototype phase.
- Prefer read-only use of shared backend endpoints.
- Use prototype-only namespace for any writes.
- Keep all prototype code/config/docs in prototype-scoped paths.

## Working assumptions
- Existing backend API is sufficient for most read paths.
- Any data shape gaps are handled in prototype adapter code first.
- Production workflows remain unchanged.
- Unified navigation experiments happen only in prototype routes/surfaces.
- Domain cutover and production replacement of legacy club site are out of scope for this phase.
- Prototype outputs should support both commercial packaging modes:
	- Strategy A integrated add-on
	- Strategy B full digital clubhouse

## Open decisions
- Exact prototype app folder path and framework choice.
- Exact prototype namespace names in Firestore/storage.
- Whether additive prototype-only backend endpoints are needed.

## Promotion criteria
- Approved token set and asset package.
- Explicit sign-off for each V2 file touched.
- Regression check on auth, league, tournament, draft flows before merge.

## Change log
- 2026-05-31: Created context and requirements baseline to prevent drift and preserve no-impact rule.
- 2026-05-31: Updated context to align with Strategy B (Digital Clubhouse Takeover) objective and boundaries.
- 2026-05-31: Added GTM strategy source doc and aligned context with phased launch and commercial mode support.
