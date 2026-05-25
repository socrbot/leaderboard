import {
    LIFECYCLE_STATES,
    deriveLifecycleState,
    isLifecycleLive,
    isLifecycleFinished,
    logV2Anomaly,
} from '../src/leaderboardLifecycle';

describe('deriveLifecycleState', () => {
    test('prefers explicit lifecycleState from server', () => {
        expect(deriveLifecycleState({ lifecycleState: 'finished', IsInProgress: true }))
            .toBe('finished');
        expect(deriveLifecycleState({ lifecycleState: 'live' }))
            .toBe('live');
    });

    test('requires 2 corroborating flags to promote to finished (prevents stale-flag promotion)', () => {
        // One stale flag should NOT be enough.
        expect(deriveLifecycleState({ isComplete: true, IsDraftStarted: true }))
            .toBe('draft_active');
        // Two flags agree -> finished.
        expect(deriveLifecycleState({ isComplete: true, isOfficiallyComplete: true }))
            .toBe(LIFECYCLE_STATES.FINISHED);
    });

    test('legacy IsOver + isOver counts as 2 votes -> finished', () => {
        expect(deriveLifecycleState({ IsOver: true, isOver: true }))
            .toBe(LIFECYCLE_STATES.FINISHED);
    });

    test('in-progress flags map to live when no finished flags present', () => {
        expect(deriveLifecycleState({ IsInProgress: true }))
            .toBe(LIFECYCLE_STATES.LIVE);
        expect(deriveLifecycleState({ isActive: true }))
            .toBe(LIFECYCLE_STATES.LIVE);
    });

    test('finished overrides live when both signals present', () => {
        expect(deriveLifecycleState({
            IsInProgress: true,
            isOfficiallyComplete: true,
            isComplete: true,
        })).toBe(LIFECYCLE_STATES.FINISHED);
    });

    test('draft lifecycle progression', () => {
        expect(deriveLifecycleState({})).toBe(LIFECYCLE_STATES.CREATED);
        expect(deriveLifecycleState({ oddsId: 'abc' })).toBe(LIFECYCLE_STATES.ODDS_LOCKED);
        expect(deriveLifecycleState({ IsDraftStarted: true })).toBe(LIFECYCLE_STATES.DRAFT_ACTIVE);
        expect(deriveLifecycleState({ IsDraftComplete: true })).toBe(LIFECYCLE_STATES.DRAFT_COMPLETE);
    });

    test('null / non-object inputs default to created', () => {
        expect(deriveLifecycleState(null)).toBe(LIFECYCLE_STATES.CREATED);
        expect(deriveLifecycleState(undefined)).toBe(LIFECYCLE_STATES.CREATED);
        expect(deriveLifecycleState('finished')).toBe(LIFECYCLE_STATES.CREATED);
    });

    test('isLifecycleLive / isLifecycleFinished helpers', () => {
        expect(isLifecycleLive(LIFECYCLE_STATES.LIVE)).toBe(true);
        expect(isLifecycleLive(LIFECYCLE_STATES.FINISHED)).toBe(false);
        expect(isLifecycleFinished(LIFECYCLE_STATES.FINISHED)).toBe(true);
        expect(isLifecycleFinished(LIFECYCLE_STATES.LIVE)).toBe(false);
    });
});

describe('logV2Anomaly', () => {
    let warnSpy;
    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    test('emits tagged JSON payload', () => {
        logV2Anomaly('team_scores_missing', { tournamentId: 'abc', teamAssignmentsCount: 3 });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const [tag, payload] = warnSpy.mock.calls[0];
        expect(tag).toBe('[V2_ANOMALY]');
        const parsed = JSON.parse(payload);
        expect(parsed.code).toBe('team_scores_missing');
        expect(parsed.tournamentId).toBe('abc');
        expect(parsed.teamAssignmentsCount).toBe(3);
        expect(typeof parsed.ts).toBe('string');
    });

    test('never throws on unserializable details', () => {
        const circular = {};
        circular.self = circular;
        expect(() => logV2Anomaly('circular', circular)).not.toThrow();
        expect(warnSpy).toHaveBeenCalled();
    });
});
