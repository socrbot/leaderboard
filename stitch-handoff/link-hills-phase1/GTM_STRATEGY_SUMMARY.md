# Go-To-Market (GTM) Strategy Summary

## 1. Target Audience and Positioning

### Core problem
Traditional fantasy golf formats (salary-cap and tier pools) feel static and analytical, with limited real-time group engagement.

### Product solution
A dedicated, polished, mobile-first snake-draft platform that creates roster scarcity and live-scoring tension for private groups.

### Commercial pivot (B2B2C)
Primary buyer is not the individual player. Primary buyers are:
- league commissioners
- club general managers
- golf directors

Securing one club unlocks a high-value, pre-qualified member community.

## 2. Phased Launch Framework

### Phase 1: Pre-Launch Beta (T-minus 60 days)
- Build a Founding Commissioners program.
- Run closed beta with local groups and amateur leagues.
- Prioritize real-time draft UX stability and clarity.

### Phase 2: Soft Launch with a Major Hook
- Anchor acquisition around one high-interest tournament weekend (for example: Masters or Open Championship).
- Use low-commitment 4-day micro-leagues.
- Convert participants into season-long leagues.

### Phase 3: Hyper-Targeted Distribution
- Seed dedicated fantasy golf communities.
- Partner with local club pros and amateur tour organizers.
- Sponsor custom mini-tournaments as trial funnels.

### Phase 4: Product-Led Growth (PLG)
- Add frictionless SMS/WhatsApp invite flows.
- Generate shareable "rate my draft" graphics.
- Trigger live smack-talk notifications to increase retention.

## 3. Enterprise Sales Monetization

Regional focus: East Tennessee cluster (100+ courses within ~100 miles).

### Strategy A: Integrated Game Add-On
- Keep existing club website.
- Add custom-branded fantasy dashboard on subdomain (example: draft.clubname.com).
- Price model: about $150/month ($1,800/year per club).
- Positioning: low-friction, high-margin add-on.

### Strategy B: Digital Clubhouse Takeover
- Replace outdated/static club web stack.
- Deliver a unified mobile-first platform for:
  - public marketing site
  - member portal
  - fantasy draft and leaderboard engine
- Price model: about $450/month ($5,400/year) + one-time $1,500 migration/setup.
- Regional scenario target: ~60% local penetration can scale to >$324k ARR.

## 4. Sales Enablement and Technical Execution

### Reverse-build prototyping
- Use AI-assisted workflows in VS Code/GitHub Copilot to ingest target club sites.
- Extract brand signals (palette, typography, layout, imagery).
- Generate high-fidelity prototype matching production stack conventions.
- Embed a functional snake-draft preview inside a realistic member-dashboard flow.

### Value-add differentiators
- Native calendar integrations using club-managed Google Calendar feeds.
- Firebase Cloud Messaging (FCM) web push for:
  - draft turn alerts ("on the clock")
  - tournament-day re-engagement prompts
  - club conversion nudges (for example grill-room traffic on Sundays)

## 5. Execution guardrails for current prototype phase
- Protect V2 runtime behavior and API contracts.
- Reuse existing backend APIs and Leaderboard cloud projects where possible.
- Keep Strategy B unification work in prototype-only surfaces until promotion sign-off.
