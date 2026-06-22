# V2 Production Migration Plan

**Goal:** Stand up a **V2 site inside the production Firebase project** and migrate current production users onto it, while keeping the **V1 site fully operational** so we can roll back to V1 with minimal effort and zero Firestore data restore.

**Guiding principle:** V1 and V2 run **side-by-side against the same production Firestore database**. The V2 data migration is **purely additive**, so V1 keeps working untouched. Rollback = redirect users back to the V1 URL. No data rollback required.

---

## 1. Current Environment & Architecture

### 1.1 Repositories

| Repo | Path | Role |
|------|------|------|
| Frontend | `c:\Users\russe\Projects\leaderboard` | React 19 SPA (Capacitor for mobile, currently web-first) |
| Backend | `c:\Users\russe\Projects\leaderboard-backend` | Flask API on Google Cloud Run (us-east1) |

### 1.2 Frontend — branches, workflows, hosting

| Workflow | Trigger branch | Builds | Firebase project | Hosting target → site | Backend URL |
|----------|----------------|--------|------------------|-----------------------|-------------|
| `firebase-hosting-merge.yml` | `master` | `npm run build` | `alumni-golf-tournament` (prod) | *default* → `alumni-golf-tournament` | prod backend |
| `firebase-hosting-v2.yml` | `v2` | `npm run build:staging` | `alumni-golf-tournament-staging` | `v2` → `aulmni-leaderboard-v2` | staging backend |
| `firebase-hosting-staging.yml` | `staging` | staging | `alumni-golf-tournament-staging` | default | staging backend |
| `firebase-hosting-pull-request.yml` | PRs | preview | prod | preview channel | prod |

- `firebase.json` defines two hosting targets: `production` and `v2`.
- `.firebaserc` maps: `production` → site `alumni-golf-tournament` (in **prod** project); `v2` → site `aulmni-leaderboard-v2` (in **staging** project).
- Production backend URL is hardcoded as a fallback in `src/apiConfig.js`; staging is injected via `.env.staging` (`env-cmd`).
- **Two separate Firebase projects today**: prod (`alumni-golf-tournament`) and staging (`alumni-golf-tournament-staging`).

### 1.3 Backend — branches, workflows, services

| Workflow | Trigger branch | Cloud Run service | GCP project | Image registry |
|----------|----------------|-------------------|-------------|----------------|
| `deploy-cloud-run.yml` | `main` | `leaderboard-backend` | `alumni-golf-tournament` | `gcr.io/alumni-golf-tournament` |
| `deploy-cloud-run-staging.yml` | `staging` | `leaderboard-backend-staging` | `alumni-golf-tournament-staging` | `us-east1-docker.pkg.dev/.../docker-repo` |

- Staging workflow supports `workflow_dispatch` with a `sync_firestore` input that runs `scripts/sync_prod_to_staging.py` (prod → staging copy of `tournaments`, `tournament_scores`, `global_teams`) before deploying.
- Both services: `us-east1`, `--allow-unauthenticated`, 512Mi / 1 vCPU, max 40 instances, gen2.
- Secrets via Google Secret Manager (separate names per environment; see `DEPLOYMENT.md`).

### 1.4 Deployment rule (from repo conventions)

Always deploy via `git push` to the relevant branch — never run `gcloud builds submit` / `gcloud run deploy` manually.

- Backend prod: `git push origin main`
- Backend staging: `git push origin staging`
- Frontend prod: `git push origin master`
- Frontend staging: `git push origin v2`

---

## 2. The Two Data Models

Both models live in the **same Firestore database per project**. V2 is a superset of V1.

### 2.1 V1 — single-league model

| Collection / doc | Key fields |
|------------------|-----------|
| `config/league` (single doc) | `name`, `inviteCode`, `adminUid`, `memberCount`, `createdAt` |
| `config/league/members/{uid}` | per-member data |
| `tournaments/{id}` | `name`, `orgId`, `tournId`, `year`, `oddsId`, `par`, `teams[]`, draft/status fields — **no `leagueId`** |
| `users/{uid}` | `uid`, `email`, `displayName`, `role`, `createdAt`, **`inLeague` (bool)** |
| `global_teams/{id}` | `name`, `golferNames[]`, `participatesInAnnual`, `draftOrder` — **no `year`** |
| `tournament_scores/{tournamentId}_latest` | cached team scores + leaderboard snapshot |

### 2.2 V2 — multi-league model (additive on top of V1)

| Collection / doc | Key fields (new/changed in **bold**) |
|------------------|--------------------------------------|
| `leagues/{id}` | `name`, `inviteCode`, `adminUid`, `memberCount`, `createdAt`, **`migratedFromLegacy`** |
| `leagues/{id}/members/{uid}` | per-member data (mirrors legacy members) |
| `tournaments/{id}` | …all V1 fields… + **`leagueId`**, + optional **`lifecycleState`** |
| `users/{uid}` | …all V1 fields… + **`leagueIds[]`** (array) |
| `global_teams/{id}` | …all V1 fields… + **`year`** (e.g. `"2025"`) |
| `tournament_scores/...` | unchanged |

**Frontend V2 differences:** per-league scoping (every tournament query carries `leagueId`), per-league admin gating, invite-code join flow, multi-round best-of-3 scoring, annual championship, lifecycle-state canonicalization, session caching/preloading, push-notification + invite-share scaffolding (in progress).

### 2.3 Migration scripts (all additive & idempotent)

- `migrate_to_multi_league.py`
  1. `config/league` → creates `leagues/{newId}` (skips if a league with the same `adminUid` exists).
  2. Adds `leagueId` to every tournament that lacks one.
  3. Sets `leagueIds=[newId]` on users with `inLeague=True` that lack the array.
  4. Copies `config/league/members/*` → `leagues/{newId}/members/*`.
- `migrate_teams_add_year.py` / `run_migration.py`: add `year="2025"` to `global_teams` docs missing it.
- `scripts/sync_prod_to_staging.py`: one-way prod → staging copy of `tournaments`, `tournament_scores`, `global_teams` (hash-compare; add/update only, never deletes).

**None of these delete or mutate V1 fields** (`config/league`, `inLeague`, legacy tournament fields all remain).

### 2.4 Auth & membership gating (backend `app.py`)

- Decorators: `require_auth`, `require_admin`, `require_league_admin`, `require_tournament_admin`, `require_any_league_admin`, `require_league_member`, `require_tournament_member`.
- Super-admin override: `users/{uid}.role == 'admin'` bypasses all league filters (developer-only).
- Membership source of truth: `leagues/{id}/members/{uid}` **plus** `users/{uid}.leagueIds[]` (denormalized) **plus** leagues where `adminUid == uid`.
- **Phase C gating risk:** per-tournament GETs, `GET /api/leagues/<id>`, and `GET /api/tournaments` require membership/auth. **Any existing user not backfilled with membership records gets 403 on their own data.**

---

## 3. Why Rollback Is Cheap (the core design)

1. The migration only **adds** fields/collections; it never removes V1 data.
2. The **V1 backend ignores** `leagueId` / `leagueIds` — it keeps serving the single `config/league` world.
3. Therefore V1 and V2 can read the **same production Firestore** simultaneously.
4. **Rollback = point users back to the V1 URL.** No Firestore export/import, no field reversal.

**Critical isolation decision:** the V2 membership gating (Phase C) can return 403 to un-backfilled users. To keep V1 *truly untouched*, **do not upgrade the existing prod backend in place.** Run a **separate V2 production backend service** so the gating changes never touch the V1 site.

---

## 4. Target Production Topology

```
Firebase project: alumni-golf-tournament  (PROD)
├── Hosting site: alumni-golf-tournament        → V1 site  (branch: master)      [UNCHANGED]
└── Hosting site: alumni-golf-tournament-v2      → V2 site  (NEW)                 [NEW]

Cloud Run (project alumni-golf-tournament, us-east1)
├── Service: leaderboard-backend                 → V1 API   (branch: main)        [UNCHANGED]
└── Service: leaderboard-backend-v2              → V2 API   (NEW prod service)     [NEW]

Firestore (project alumni-golf-tournament)        → SHARED by V1 + V2 (additive)
```

Both backends share one Firestore DB. V1 keeps working; V2 layers multi-league on top.

---

## 5. Migration Plan (step-by-step)

### Phase 0 — Pre-flight (no user impact)
1. **Backup production Firestore:** `gcloud firestore export gs://<backup-bucket>/pre-v2-$(date +%Y%m%d) --project=alumni-golf-tournament`.
2. Record baseline counts: `users`, `tournaments`, `global_teams`, `tournament_scores`, presence of `config/league`.
3. Confirm prod backup is restorable (note import command for emergencies).

### Phase 1 — Provision V2 production infrastructure (no user impact)
1. Create new prod hosting site: `firebase hosting:sites:create alumni-golf-tournament-v2 --project alumni-golf-tournament`.
2. Add a `production-v2` hosting target in `firebase.json` + `.firebaserc` mapping `production-v2` → `alumni-golf-tournament-v2`.
3. Create a new prod Cloud Run service `leaderboard-backend-v2` from the current `staging` backend code, using **production** secrets and **production** Firestore (project `alumni-golf-tournament`).
4. Add a backend workflow (e.g. `deploy-cloud-run-v2.yml`) triggered by a `v2-prod` (or `release/v2`) branch that deploys `leaderboard-backend-v2`.
5. Add a frontend workflow (e.g. `firebase-hosting-v2-prod.yml`) that builds with **prod** Firebase config + the **V2 prod backend URL** and deploys to the `production-v2` target.

### Phase 2 — Run additive data migration on production
> Order matters: backfill membership **before** flipping users to V2, or they hit 403s.
1. `migrate_teams_add_year.py` → ensure `global_teams` have `year`.
2. `migrate_to_multi_league.py` → create `leagues/{id}`, stamp `leagueId` on tournaments, set `leagueIds[]` on members, copy members subcollection.
3. **Membership backfill (must-do):** ensure **every** existing league member has **both** `leagues/{id}/members/{uid}` **and** `users/{uid}.leagueIds` populated (see §7 improvement #2). Verify no active user is missing membership.
4. Re-run baseline counts; confirm only additions, no deletions.

### Phase 3 — Validate V2 in production (internal only)
1. Point the new V2 prod site at the V2 prod backend.
2. Smoke test with admin + a few seeded internal accounts: login, league visibility, tournament list, leaderboard, draft, team management.
3. Confirm **V1 site still works unchanged** in parallel (it should — separate service).

### Phase 4 — Controlled user rollout
1. Invite a pilot cohort (5–15 current users) to the V2 URL.
2. Monitor backend logs for `403 League membership required` (indicates a missed backfill).
3. Expand in waves once stable. Keep the V1 URL active the whole time.

### Phase 5 — Cutover
1. When confident, make V2 the primary entry point (e.g. redirect V1 → V2, or swap the marketing/default link).
2. Keep V1 deployed and the legacy fields intact for a defined soak period (recommend ≥30 days).

---

## 6. Rollback Plan (minimal effort)

**Trigger:** V2 failure, data confusion, or unacceptable 403/error rate.

1. **Immediate:** send users back to the V1 URL (remove redirect / restore default link). V1 backend + V1 data are untouched, so this is instant.
2. **No Firestore restore needed** — the DB is a superset; V1 reads `config/league` and ignores V2 fields.
3. Net-new leagues/tournaments created by V2 users won't appear in V1's single-league view (acceptable trade-off). If you want those preserved in V1, see §7 improvement #5 (optional dual-write).
4. **Last-resort only:** if data was somehow corrupted, restore the Phase 0 export with `gcloud firestore import`.

Because V1 is never modified or undeployed during the rollout, rollback is a **routing change, not a data operation.**

---

## 7. Recommended Data-Structure Improvements

1. **Add an explicit `schemaVersion` field** to `tournaments`, `users`, and `leagues` (e.g. `1` or `2`). Makes forward/back detection deterministic instead of inferring from presence of `leagueId`/`leagueIds`.
2. **Make membership backfill atomic & complete.** Extend `migrate_to_multi_league.py` so that for **all** legacy members it writes **both** `leagues/{id}/members/{uid}` **and** `users/{uid}.leagueIds` (today the array is only set for `inLeague=True` users; align the two so nobody is half-migrated → prevents Phase C 403s).
3. **Cross-link legacy ↔ new league.** Store `legacyLeagueId` on the new `leagues/{id}` doc and a `migratedToLeagueId` pointer on `config/league` for traceability/auditing.
4. **Never destructively delete V1 fields** (`inLeague`, `config/league`, legacy tournament fields) until the V2 soak period passes and a backup is confirmed.
5. **(Optional) Dual-write during soak.** When V2 adds a member to the original migrated league, also write to `config/league/members` so a V1 rollback retains new members. Higher effort; only if V1 must stay current.
6. **Add audit fields** `migratedAt` / `migrationVersion` to migrated docs.
7. **Isolate V2 backend in production** (separate Cloud Run service) so membership gating never affects the V1 site — this is what makes rollback a no-op.
8. **Idempotency guards everywhere** so all migration/backfill scripts can be safely re-run (the existing scripts already skip already-migrated docs; keep this property for any new backfill).

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Existing users get 403 on V2 (missing membership) | Users blocked | Backfill `members` + `leagueIds` for everyone **before** rollout; monitor logs for 403 |
| Upgrading prod backend in place breaks V1 gating | V1 outage | Deploy a **separate** `leaderboard-backend-v2` service; leave V1 backend on `main` untouched |
| Net-new V2 data invisible to V1 after rollback | Minor UX gap | Accept, or enable optional dual-write (§7 #5) |
| Accidental destructive migration | Data loss | Phase 0 backup + additive-only scripts + idempotency |
| Shared Firestore write contention | Low | Same DB already handles V1 load; V2 adds reads mostly |
| URL typo `aulmni` vs `alumni` | Confusion | Use a clean `alumni-golf-tournament-v2` site name for the prod V2 site |

---

## 9. Pre-Cutover Checklist

- [ ] Phase 0 Firestore export taken and restore verified
- [ ] Baseline counts recorded
- [ ] New prod V2 hosting site created (`alumni-golf-tournament-v2`)
- [ ] New prod V2 backend service deployed (`leaderboard-backend-v2`) with prod secrets + prod Firestore
- [ ] V2 frontend prod build points at V2 prod backend + prod Firebase config
- [ ] `global_teams` year backfill complete
- [ ] `migrate_to_multi_league.py` run on prod
- [ ] Membership backfill complete for **all** active users (no half-migrated accounts)
- [ ] V1 site confirmed still working unchanged
- [ ] V2 internal smoke test passed
- [ ] Pilot cohort selected; feedback + log monitoring in place
- [ ] Rollback routing path documented and tested

---

*Architecture summary: V1 and V2 coexist on one production Firestore via additive migration and a separate V2 backend service. Forward = route to V2; rollback = route to V1. No data rollback required.*
