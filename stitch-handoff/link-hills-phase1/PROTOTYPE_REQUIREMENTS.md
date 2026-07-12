# Link Hills Prototype Requirements (No-Impact on V2)

## Objective
Build a Link Hills prototype that reuses existing backend APIs and existing Leaderboard cloud projects where possible, while guaranteeing zero behavior and UI impact to the V2 leaderboard app. The goal is to investigate how to integrate the current leaderboard website into an existing private member golf club site to drive digital engagement for the club.

Strategy B (The Digital Clubhouse Takeover):
The pitch is to replace outdated or static legacy web hosts (like generic GoDaddy setups) with a premium, mobile-first web presence. This completely merges the club's public marketing site, member portals, and interactive fantasy draft engine into one unified system.

## GTM source of truth
- Commercial and launch strategy reference: [GTM_STRATEGY_SUMMARY.md](GTM_STRATEGY_SUMMARY.md).
- If implementation choices conflict with GTM and no-impact constraints, no-impact constraints win during prototype phase.

## Non-negotiable constraints
- Do not modify runtime behavior in the existing V2 app.
- Do not change existing API contracts on shared backend endpoints.
- Do not change Firestore schema or existing collection behavior used by V2.
- Do not change production deployment workflows for existing frontend/backend branches.

## Strategy B scope boundaries
- Prototype target: a single premium, mobile-first "digital clubhouse" experience that combines:
  - public marketing content
  - member portal utilities
  - fantasy draft and leaderboard engagement features
- This merge happens in prototype-only surfaces first; it does not replace or mutate the existing V2 app during prototype phase.
- Information architecture experiments (navigation, page composition, cross-linking) are allowed only inside prototype code paths.

## Strategy B integration principles
- Reuse existing Leaderboard backend capabilities as a services layer for engagement features.
- Treat legacy/static club-site content as ingestable content blocks that can be re-skinned and restructured in prototype UI.
- Keep the prototype experience mobile-first by default and desktop-complete as a second pass.
- Separate "experience integration" from "platform migration":
  - experience integration is in scope
  - production domain cutover is out of scope for this phase

## Commercial mode support (A and B)
- Strategy A support requirement:
  - prototype must support subdomain-style integration assumptions (`draft.clubname.com`) without requiring replacement of existing club site architecture.
- Strategy B support requirement:
  - prototype must support a full unified experience that combines public marketing, member tools, and fantasy engagement in one navigation model.
- Shared requirement:
  - both strategies must reuse existing backend APIs/projects where possible and avoid V2 runtime impact.

## Reuse-first rule set

### Rule 1: Reuse existing APIs in read-only compatible mode
- Reuse existing endpoints from the current backend where the prototype can consume current payloads as-is.
- Any transformation for Link Hills must happen in prototype client code, not backend endpoint contract changes.
- If an endpoint is missing required data, add a prototype-only adapter layer in the prototype app before proposing backend changes.

### Rule 2: Reuse existing projects with strict namespace isolation
- Same cloud project is allowed only when all prototype writes are scoped under a dedicated prototype namespace.
- Approved namespace pattern: `prototype_linkhills_*` for collections/documents/storage paths.
- No writes to existing V2 collections unless explicitly approved in writing.

### Rule 3: Zero shared config mutation
- Existing files in the V2 app remain unchanged unless a promotion decision is approved.
- Prototype must have its own env/config files.
- Existing `apiConfig` in V2 remains untouched during prototype phase.

### Rule 4: Feature-flag all shared backend interactions
- Any prototype path that could call shared backend write endpoints must be gated by a prototype-only flag.
- Default mode for shared API usage is GET/read operations only.

### Rule 4a: Unified navigation must remain prototype-only
- Any merged navigation model (public + member + fantasy engine) is implemented only in prototype routes.
- Existing V2 navigation and entry points remain unchanged.

### Rule 5: Promotion by artifact, not by direct merge
- Promote only approved artifacts from prototype to V2:
  - token files
  - approved assets
  - mapping config
- No direct copy of prototype app screens/components into V2 without review.

## Allowed changes during prototype phase
- New prototype-only frontend app/folder.
- New prototype-only docs, scripts, token files, and adapters.
- New prototype-only data paths and feature flags.
- New prototype-only IA and page composition that unify marketing, member, and fantasy experiences.
- Prototype-only content mapping for legacy club pages into reusable sections/components.

## Disallowed changes during prototype phase
- Changes to existing V2 routing, providers, or core state flow.
- Backend API contract changes that affect existing consumers.
- Any production deployment or config changes for existing workflows.
- Production DNS/domain cutover or replacement of existing club site in this phase.

## API compatibility contract
- Shared endpoint request/response shapes are treated as immutable for prototype scope.
- Prototype handles fallback/defaulting locally.
- If backend extension is needed, create additive endpoints only (new route, no existing route edits), and mark as prototype-only.

## Verification gates (must pass)
1. Existing V2 app build and smoke paths unchanged.
2. No file diffs in core V2 runtime files unless explicitly approved.
3. Prototype reads shared APIs successfully in compatibility mode.
4. Prototype writes only to prototype namespace paths.
5. Existing deployment workflows unaffected.
6. Prototype demonstrates a unified mobile-first journey across public content, member portal tasks, and fantasy engagement flows.
7. Prototype-specific navigation and content composition are isolated from V2 runtime.

## Strategy B success criteria
1. A user can enter from a club-marketing page and reach fantasy/leaderboard engagement without leaving the prototype experience.
2. Member-relevant tasks and fantasy features share one coherent design system and navigation model in prototype.
3. Shared backend API reuse is maximized without contract changes.
4. V2 behavior remains unchanged and deployable throughout prototype work.
5. The same prototype architecture can be packaged as either Strategy A (integrated add-on) or Strategy B (full digital clubhouse) without backend contract breakage.

## Decision log (initial)
- Reuse shared backend API where possible: YES.
- Reuse cloud project where possible: YES, with strict namespace isolation.
- Modify existing V2 app during prototype: NO.
- Promotion mechanism: approved artifact handoff only.
