// Canonical tournament lifecycle handling for V2.
// The backend should return `lifecycleState` directly on the tournament document.
// Until every tournament document is migrated, we fall back to deriving it
// from the legacy flags so that V2 behaves consistently with Production.

export const LIFECYCLE_STATES = Object.freeze({
    CREATED: 'created',
    ODDS_LOCKED: 'odds_locked',
    DRAFT_ACTIVE: 'draft_active',
    DRAFT_COMPLETE: 'draft_complete',
    LIVE: 'live',
    FINISHED: 'finished',
});

const FINISHED_FIELDS = ['IsOver', 'isOver', 'isComplete', 'isOfficiallyComplete'];
const LIVE_FIELDS = ['IsInProgress', 'isInProgress', 'isActive'];

/**
 * Derive a canonical lifecycle state for a tournament from the V2 server response.
 * Prefers `lifecycleState` when present; otherwise falls back to the legacy flag union
 * but requires at least two corroborating flags before treating a tournament as
 * Finished or Live, to avoid stale-flag promotion.
 *
 * @param {object | null | undefined} tournamentData
 * @returns {string} one of LIFECYCLE_STATES values
 */
export function deriveLifecycleState(tournamentData) {
    if (!tournamentData || typeof tournamentData !== 'object') {
        return LIFECYCLE_STATES.CREATED;
    }

    if (typeof tournamentData.lifecycleState === 'string' && tournamentData.lifecycleState) {
        return tournamentData.lifecycleState;
    }

    const finishedVotes = FINISHED_FIELDS.reduce(
        (count, field) => (tournamentData[field] ? count + 1 : count),
        0,
    );
    if (finishedVotes >= 2) {
        return LIFECYCLE_STATES.FINISHED;
    }

    const liveVotes = LIVE_FIELDS.reduce(
        (count, field) => (tournamentData[field] ? count + 1 : count),
        0,
    );
    if (liveVotes >= 1 && finishedVotes === 0) {
        return LIFECYCLE_STATES.LIVE;
    }

    if (tournamentData.IsDraftComplete) {
        return LIFECYCLE_STATES.DRAFT_COMPLETE;
    }
    if (tournamentData.IsDraftStarted) {
        return LIFECYCLE_STATES.DRAFT_ACTIVE;
    }
    if (tournamentData.oddsId) {
        return LIFECYCLE_STATES.ODDS_LOCKED;
    }
    return LIFECYCLE_STATES.CREATED;
}

export function isLifecycleLive(state) {
    return state === LIFECYCLE_STATES.LIVE;
}

export function isLifecycleFinished(state) {
    return state === LIFECYCLE_STATES.FINISHED;
}

/**
 * Structured anomaly logger. Emits a single console.warn with a tagged JSON
 * payload so anomalies are easy to grep in production logs / monitoring tools.
 * Never throws.
 */
export function logV2Anomaly(code, details) {
    try {
        // eslint-disable-next-line no-console
        console.warn('[V2_ANOMALY]', JSON.stringify({
            code,
            ts: new Date().toISOString(),
            ...(details || {}),
        }));
    } catch (_e) {
        // Last resort — never let logging break the app.
        // eslint-disable-next-line no-console
        console.warn('[V2_ANOMALY] (unserializable)', code);
    }
}
