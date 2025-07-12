import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ teams: [], orgId: '1', tournId: '033', year: '2025', par: 71 }),
    })
  );
});

afterAll(() => {
  global.fetch.mockClear();
  delete global.fetch;
});

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
