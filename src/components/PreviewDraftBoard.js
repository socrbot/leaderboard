// src/components/PreviewDraftBoard.js
// Pre-lock-in draft board. Shown for tournaments that exist but whose draft odds
// have not been locked yet. Renders odds as a simple list (no tiers, no teams)
// along with the timestamp the odds were last fetched. Backend refreshes the
// underlying preview odds automatically every 7 days.
import React, { useEffect, useState, useCallback } from 'react';
import { TOURNAMENTS_API_ENDPOINT } from '../apiConfig';
import { useAuth } from '../contexts/AuthContext';

const formatUpdatedAt = (iso) => {
  if (!iso) return 'Not yet available';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
};

const formatOdds = (value) => {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num > 0 ? `+${Math.round(num)}` : `${Math.round(num)}`;
};

const PreviewDraftBoard = ({ tournamentId, tournamentName, isAdmin, onRefreshed }) => {
  const { getIdToken } = useAuth();
  const [odds, setOdds] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${tournamentId}/preview_odds`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setOdds(Array.isArray(data.odds) ? data.odds : []);
      setUpdatedAt(data.updatedAt || null);
    } catch (e) {
      setError(e.message || 'Failed to load odds');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    if (!tournamentId) return;
    setRefreshing(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`${TOURNAMENTS_API_ENDPOINT}/${tournamentId}/refresh_preview_odds`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Refresh failed (${res.status})`);
      }
      await load();
      if (onRefreshed) onRefreshed();
    } catch (e) {
      setError(e.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.8rem' }}>
          {tournamentName ? `${tournamentName} — Draft Board` : 'Draft Board'}
        </h2>
        <p style={{ margin: 0, color: '#bbb', fontSize: '0.95rem' }}>
          Odds as of {formatUpdatedAt(updatedAt)}
        </p>
        {isAdmin && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              marginTop: '12px',
              padding: '6px 14px',
              background: '#2c5282',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: refreshing ? 'wait' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh odds now'}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>Loading odds…</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#f88' }}>{error}</div>
      ) : odds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>
          Odds are not yet available for this tournament.
        </div>
      ) : (
        <div className="leaderboard-container" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>Player</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Odds</th>
              </tr>
            </thead>
            <tbody>
              {odds.map((p, idx) => (
                <tr key={`${p.name}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td>{p.name}</td>
                  <td style={{ textAlign: 'right' }}>{formatOdds(p.averageOdds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default React.memo(PreviewDraftBoard);
