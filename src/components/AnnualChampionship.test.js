import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AnnualChampionship from './AnnualChampionship';

describe('AnnualChampionship', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete global.fetch;
  });

  test('requests annual data with current tournament included', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        standings: [],
        tournaments: [],
        metadata: {}
      })
    });

    render(<AnnualChampionship selectedYear="2026" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/annual_championship?year=2026&includeCurrent=true')
      );
    });
  });

  test('shows live indicators for in-progress annual tournament scores', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        standings: [
          {
            teamName: 'Team A',
            totalScore: 4,
            tournaments: [
              { tournamentId: 'masters-2026', score: 4, position: 1, scoreStatus: 'live' }
            ]
          }
        ],
        tournaments: [
          { tournamentId: 'masters-2026', name: 'Masters', isLive: true }
        ],
        metadata: {}
      })
    });

    render(<AnnualChampionship selectedYear="2026" />);

    expect(await screen.findByText(/includes current live tournament scores/i)).toBeTruthy();
    expect(screen.getByText('LIVE')).toBeTruthy();
    expect(screen.getByText(/^Live$/)).toBeTruthy();
    expect(screen.getAllByText(/provisional/i).length).toBeGreaterThan(0);
  });

  test('preserves existing completed tournament display when no live tournament exists', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        standings: [
          {
            teamName: 'Team A',
            totalScore: 2,
            tournaments: [
              { tournamentId: 'masters-2026', score: 2, position: 1 }
            ]
          }
        ],
        tournaments: [
          { tournamentId: 'masters-2026', name: 'Masters' }
        ],
        metadata: {}
      })
    });

    render(<AnnualChampionship selectedYear="2026" />);

    expect(await screen.findByText('Masters')).toBeTruthy();
    expect(screen.queryByText(/includes current live tournament scores/i)).toBeNull();
    expect(screen.queryByText('LIVE')).toBeNull();
    expect(screen.queryByText(/^Live$/)).toBeNull();
  });
});
