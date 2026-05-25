/**
 * Hook integration tests with fixture mocks.
 * Verifies that V2 trusts backend-supplied teamScores and never recomputes them,
 * and that it falls back to placeholder rows + structured anomaly logs when
 * backend data is missing.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGolfLeaderboard } from '../src/useGolfLeaderboard';
import { LIFECYCLE_STATES } from '../src/leaderboardLifecycle';

const TOURNAMENT_ID = 'tournament-xyz';

async function waitForFetchCount(expected) {
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(expected));
    // Allow trailing setState from the second fetch to flush.
    await act(async () => { await Promise.resolve(); });
}

const baseTournamentDoc = {
    id: TOURNAMENT_ID,
    orgId: '1',
    tournId: '014',
    year: '2025',
    par: 71,
    teams: [
        { name: 'Team A', golferNames: ['Player One', 'Player Two'] },
        { name: 'Team B', golferNames: ['Player Three', 'Player Four'] },
    ],
};

function buildFetchMock(handlers) {
    return jest.fn((url) => {
        for (const [pattern, response] of handlers) {
            if (url.includes(pattern)) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(response()),
                });
            }
        }
        return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: 'not found' }),
        });
    });
}

afterEach(() => {
    jest.restoreAllMocks();
});

describe('useGolfLeaderboard — backend-driven scoring', () => {
    test('Fixture 1: finished tournament with populated teamScores renders backend data verbatim', async () => {
        const teamScores = [
            { teamName: 'Team A', totalScore: -5, r1: -1, r2: -2, r3: -1, r4: -1, golfers: [] },
            { teamName: 'Team B', totalScore: 3, r1: 1, r2: 0, r3: 1, r4: 1, golfers: [] },
        ];

        global.fetch = buildFetchMock([
            [`/tournaments/${TOURNAMENT_ID}`, () => ({
                ...baseTournamentDoc,
                lifecycleState: 'finished',
                IsOver: true,
                isOfficiallyComplete: true,
            })],
            ['/leaderboard', () => ({ teamScores })],
        ]);

        const { result } = renderHook(() => useGolfLeaderboard(TOURNAMENT_ID, 0));

        await waitForFetchCount(2);
        await waitFor(() => expect(result.current.rawData).toEqual(teamScores));
        expect(result.current.lifecycleState).toBe(LIFECYCLE_STATES.FINISHED);
        expect(result.current.isTournamentOver).toBe(true);
        expect(result.current.isTournamentInProgress).toBe(false);
    });

    test('Fixture 2: missing teamScores triggers placeholder fallback and structured anomaly log', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        global.fetch = buildFetchMock([
            [`/tournaments/${TOURNAMENT_ID}`, () => ({
                ...baseTournamentDoc,
                lifecycleState: 'finished',
            })],
            ['/leaderboard', () => ({
                teamScores: [],
                leaderboardData: { leaderboardRows: [{ firstName: 'Player', lastName: 'One' }] },
            })],
        ]);

        const { result } = renderHook(() => useGolfLeaderboard(TOURNAMENT_ID, 0));
        await waitForFetchCount(2);
        await waitFor(() => expect(result.current.rawData).toHaveLength(2));

        // Two placeholder teams, all scores null (we do NOT recompute client-side).
        expect(result.current.rawData).toHaveLength(2);
        expect(result.current.rawData[0]).toMatchObject({
            teamName: 'Team A',
            totalScore: null,
            r1: null,
            r2: null,
            r3: null,
            r4: null,
        });
        expect(result.current.rawData[0].golfers).toHaveLength(2);
        expect(result.current.rawData[0].golfers[0]).toMatchObject({
            name: 'Player One',
            total: null,
            r1: { score: null, isLive: false },
        });

        const anomalyCalls = warnSpy.mock.calls.filter((c) => c[0] === '[V2_ANOMALY]');
        const codes = anomalyCalls.map((c) => JSON.parse(c[1]).code);
        expect(codes).toContain('team_scores_missing');
    });

    test('Fixture 3: live tournament uses lifecycleState and enables polling path', async () => {
        global.fetch = buildFetchMock([
            [`/tournaments/${TOURNAMENT_ID}`, () => ({
                ...baseTournamentDoc,
                lifecycleState: 'live',
                IsInProgress: true,
            })],
            ['/leaderboard', () => ({
                teamScores: [{ teamName: 'Team A', totalScore: -2, r1: -2 }],
            })],
        ]);

        const { result } = renderHook(() => useGolfLeaderboard(TOURNAMENT_ID, 0));
        await waitForFetchCount(2);
        await waitFor(() => expect(result.current.lifecycleState).toBe(LIFECYCLE_STATES.LIVE));

        expect(result.current.isTournamentInProgress).toBe(true);
        expect(result.current.isTournamentOver).toBe(false);
    });

    test('Fixture 4: missing lifecycleState falls back to flag union and emits lifecycle_missing anomaly', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        global.fetch = buildFetchMock([
            [`/tournaments/${TOURNAMENT_ID}`, () => ({
                ...baseTournamentDoc,
                // No lifecycleState. Two corroborating finished flags.
                isOfficiallyComplete: true,
                isComplete: true,
            })],
            ['/leaderboard', () => ({ teamScores: [{ teamName: 'Team A', totalScore: 0 }] })],
        ]);

        const { result } = renderHook(() => useGolfLeaderboard(TOURNAMENT_ID, 0));
        await waitForFetchCount(2);
        await waitFor(() => expect(result.current.lifecycleState).toBe(LIFECYCLE_STATES.FINISHED));

        const anomalyCodes = warnSpy.mock.calls
            .filter((c) => c[0] === '[V2_ANOMALY]')
            .map((c) => JSON.parse(c[1]).code);
        expect(anomalyCodes).toContain('lifecycle_missing');
    });

    test('Fixture 5: tournament with no teams yields empty rawData without anomaly', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        global.fetch = buildFetchMock([
            [`/tournaments/${TOURNAMENT_ID}`, () => ({
                ...baseTournamentDoc,
                teams: [],
                lifecycleState: 'created',
            })],
        ]);

        const { result } = renderHook(() => useGolfLeaderboard(TOURNAMENT_ID, 0));
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.rawData).toEqual([]);
        const anomalyCodes = warnSpy.mock.calls
            .filter((c) => c[0] === '[V2_ANOMALY]')
            .map((c) => JSON.parse(c[1]).code);
        expect(anomalyCodes).not.toContain('team_scores_missing');
    });
});
