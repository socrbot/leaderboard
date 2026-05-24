// src/components/TeamManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const DEFAULT_DRAFT_STATUS = {
  IsDraftStarted: false,
  IsDraftLocked: false,
  IsDraftComplete: false,
};

const TeamManagement = ({ leagueId, onTournamentCreated, onTeamsSaved, onDraftStarted, hideHeader = false }) => {
  const { getIdToken } = useAuth();

  const [leagueTournaments, setLeagueTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [draftStatusByTournament, setDraftStatusByTournament] = useState({});
  const [teamsByTournament, setTeamsByTournament] = useState({});
  const [lockedOddsByTournament, setLockedOddsByTournament] = useState({});
  const [expandedByTournament, setExpandedByTournament] = useState({});
  const [addSearch, setAddSearch] = useState({});
  const [editLoading, setEditLoading] = useState({});
  const [draftActionLoading, setDraftActionLoading] = useState({});

  const formatDate = useCallback((value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const getTournamentName = useCallback((tournament) => {
    return tournament?.name || tournament?.Name || 'Tournament';
  }, []);

  const getTournamentVenue = useCallback((tournament) => {
    return (
      tournament?.venue ||
      tournament?.Venue ||
      tournament?.Tournament?.Venue ||
      tournament?.Tournament?.Courses?.[0]?.Name ||
      tournament?.Courses?.[0]?.Name ||
      ''
    );
  }, []);

  const getTournamentDateRange = useCallback((tournament) => {
    const startRaw =
      tournament?.startDate ||
      tournament?.StartDate ||
      tournament?.Tournament?.StartDate ||
      tournament?.date?.start ||
      '';
    const endRaw =
      tournament?.endDate ||
      tournament?.EndDate ||
      tournament?.Tournament?.EndDate ||
      tournament?.date?.end ||
      '';
    const start = formatDate(startRaw);
    const end = formatDate(endRaw);
    if (start && end) return `${start}-${end}`;
    return start || end;
  }, [formatDate]);

  const getDraftStatusLabel = useCallback((status) => {
    if (status.IsDraftComplete) return 'Draft Complete';
    if (status.IsDraftStarted) return 'Draft Active';
    if (status.IsDraftLocked) return 'Odds Locked';
    return 'Draft Pending';
  }, []);

  const fetchDraftStatusForTournament = useCallback(async (tournamentId) => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/draft_status`);
      if (!res.ok) throw new Error('Failed draft status fetch');
      const status = await res.json();
      setDraftStatusByTournament((prev) => ({ ...prev, [tournamentId]: status }));
      return status;
    } catch {
      setDraftStatusByTournament((prev) => ({ ...prev, [tournamentId]: DEFAULT_DRAFT_STATUS }));
      return DEFAULT_DRAFT_STATUS;
    }
  }, []);

  const loadTeamsForTournament = useCallback(async (tournamentId) => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}`);
      if (!res.ok) throw new Error('Failed tournament fetch');
      const tournament = await res.json();
      setTeamsByTournament((prev) => ({ ...prev, [tournamentId]: tournament.teams || [] }));
      setLockedOddsByTournament((prev) => ({ ...prev, [tournamentId]: tournament.DraftLockedOdds || [] }));
    } catch {
      setTeamsByTournament((prev) => ({ ...prev, [tournamentId]: [] }));
      setLockedOddsByTournament((prev) => ({ ...prev, [tournamentId]: [] }));
    }
  }, []);

  const loadLeagueTournaments = useCallback(async () => {
    if (!leagueId) {
      setLeagueTournaments([]);
      setDraftStatusByTournament({});
      setTeamsByTournament({});
      setLockedOddsByTournament({});
      setExpandedByTournament({});
      return;
    }

    setLoadingTournaments(true);
    try {
      const url = `${BACKEND_BASE_URL}/tournaments?leagueId=${encodeURIComponent(leagueId)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed tournaments fetch');

      const tournaments = await res.json();
      const normalized = Array.isArray(tournaments) ? tournaments : [];

      const enriched = await Promise.all(
        normalized.map(async (tournament) => {
          try {
            const detailRes = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournament.id}`);
            if (!detailRes.ok) return tournament;
            const detail = await detailRes.json();

            return {
              ...tournament,
              ...detail,
              name: tournament.name || detail.name || detail.Name,
              startDate:
                tournament.startDate ||
                detail.startDate ||
                detail.StartDate ||
                detail?.Tournament?.StartDate ||
                '',
              endDate:
                tournament.endDate ||
                detail.endDate ||
                detail.EndDate ||
                detail?.Tournament?.EndDate ||
                '',
              venue:
                tournament.venue ||
                detail.venue ||
                detail.Venue ||
                detail?.Tournament?.Venue ||
                '',
              Tournament: detail?.Tournament || tournament?.Tournament || null,
            };
          } catch {
            return tournament;
          }
        })
      );

      const getStartTimestamp = (tournament) => {
        const raw =
          tournament?.startDate ||
          tournament?.StartDate ||
          tournament?.Tournament?.StartDate ||
          0;
        const ts = new Date(raw).getTime();
        return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
      };

      const chronological = [...enriched].sort((a, b) => getStartTimestamp(a) - getStartTimestamp(b));

      setLeagueTournaments(chronological);

      await Promise.all(
        chronological.map((t) => fetchDraftStatusForTournament(t.id))
      );
    } catch {
      setLeagueTournaments([]);
      setDraftStatusByTournament({});
    } finally {
      setLoadingTournaments(false);
    }
  }, [fetchDraftStatusForTournament, leagueId]);

  useEffect(() => {
    loadLeagueTournaments();
  }, [loadLeagueTournaments]);

  const toggleTournamentExpand = async (tournamentId) => {
    const shouldOpen = !expandedByTournament[tournamentId];
    setExpandedByTournament((prev) => ({ ...prev, [tournamentId]: shouldOpen }));

    if (shouldOpen) {
      await loadTeamsForTournament(tournamentId);
      await fetchDraftStatusForTournament(tournamentId);
    }
  };

  const refreshTournamentData = useCallback(async (tournamentId) => {
    await Promise.all([
      fetchDraftStatusForTournament(tournamentId),
      loadTeamsForTournament(tournamentId),
    ]);
  }, [fetchDraftStatusForTournament, loadTeamsForTournament]);

  const handleDraftAction = async (tournamentId) => {
    const status = draftStatusByTournament[tournamentId] || DEFAULT_DRAFT_STATUS;
    let endpoint = '';
    let confirmMsg = '';
    let successMsg = '';

    if (!status.IsDraftLocked) {
      endpoint = `/tournaments/${tournamentId}/lock_draft_odds`;
      confirmMsg = 'Are you sure you want to lock the draft odds?';
      successMsg = 'Draft odds locked.';
    } else if (!status.IsDraftStarted) {
      endpoint = `/tournaments/${tournamentId}/start_draft_flag`;
      confirmMsg = 'Are you sure you want to start the draft?';
      successMsg = 'Draft started.';
    } else if (!status.IsDraftComplete) {
      endpoint = `/tournaments/${tournamentId}/complete_draft`;
      confirmMsg = 'Are you sure you want to complete the draft?';
      successMsg = 'Draft completed.';
    } else {
      return;
    }

    if (!window.confirm(confirmMsg)) return;

    setDraftActionLoading((prev) => ({ ...prev, [tournamentId]: true }));
    try {
      const res = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Draft action failed');

      await refreshTournamentData(tournamentId);
      if (onDraftStarted) onDraftStarted();
      if (onTeamsSaved) onTeamsSaved();
      if (onTournamentCreated) onTournamentCreated();
      alert(successMsg);
    } catch (error) {
      alert(`Draft action failed: ${error.message}`);
    } finally {
      setDraftActionLoading((prev) => ({ ...prev, [tournamentId]: false }));
    }
  };

  const handleAdminRemove = async (tournamentId, ownerUid, playerName) => {
    if (!window.confirm(`Remove ${playerName} from this team?`)) return;

    const key = `${tournamentId}:${ownerUid}:remove:${playerName}`;
    setEditLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const token = await getIdToken();
      const res = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/admin_edit_pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'remove', ownerUid, playerName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove golfer');

      await loadTeamsForTournament(tournamentId);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setEditLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleAdminAdd = async (tournamentId, ownerUid) => {
    const searchKey = `${tournamentId}:${ownerUid}`;
    const playerName = (addSearch[searchKey] || '').trim();
    if (!playerName) return;

    const key = `${tournamentId}:${ownerUid}:add`;
    setEditLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const token = await getIdToken();
      const res = await fetch(`${BACKEND_BASE_URL}/tournaments/${tournamentId}/admin_edit_pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'add', ownerUid, playerName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add golfer');

      setAddSearch((prev) => ({ ...prev, [searchKey]: '' }));
      await loadTeamsForTournament(tournamentId);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setEditLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (!leagueId) {
    return (
      <div className="team-management-container">
        <p className="form-help">Select a league to manage tournament drafts.</p>
      </div>
    );
  }

  return (
    <div className="team-management-container">
      {!hideHeader && (
        <h1 className="team-management-title" style={{ textAlign: 'center' }}>Draft Management</h1>
      )}

      {loadingTournaments && <p className="form-help">Loading tournaments for this league...</p>}

      {!loadingTournaments && leagueTournaments.length === 0 && (
        <p className="form-help">No tournaments found for this league yet.</p>
      )}

      {!loadingTournaments && leagueTournaments.length > 0 && (
        <div className="tournament-management-stack">
          {leagueTournaments.map((tournament) => {
            const tournamentId = tournament.id;
            const status = draftStatusByTournament[tournamentId] || DEFAULT_DRAFT_STATUS;
            const teams = teamsByTournament[tournamentId] || [];
            const lockedOdds = lockedOddsByTournament[tournamentId] || [];
            const isExpanded = !!expandedByTournament[tournamentId];
            const draftLabel = getDraftStatusLabel(status);

            return (
              <div key={tournamentId} className={`tournament-card draft-board-card ${isExpanded ? 'expanded' : ''}`}>
                <button
                  className="tournament-card-summary"
                  onClick={() => toggleTournamentExpand(tournamentId)}
                  type="button"
                >
                  <div className="tournament-card-summary-left">
                    <div>
                      <h2 className="tournament-card-title">{getTournamentName(tournament)}</h2>
                      <p className="tournament-card-meta">
                        {[getTournamentVenue(tournament), getTournamentDateRange(tournament)].filter(Boolean).join(' • ') || 'Date and location unavailable'}
                      </p>
                      <p className="tournament-card-kicker" style={{ marginTop: '10px' }}>{draftLabel}</p>
                    </div>
                  </div>
                  <span className={`league-v2-chevron${isExpanded ? ' expanded' : ''}`} aria-hidden="true">▾</span>
                </button>

                {isExpanded && (
                  <div className="expand-content">
                    <div className="overflow-hidden bg-surface-container-low">
                      <div className="tournament-card-body">
                        {!status.IsDraftComplete && (
                          <button
                            onClick={() => handleDraftAction(tournamentId)}
                            disabled={!!draftActionLoading[tournamentId]}
                            className="draft-action-btn"
                          >
                            {draftActionLoading[tournamentId]
                              ? 'Processing...'
                              : !status.IsDraftLocked
                                ? 'Lock Draft Odds'
                                : !status.IsDraftStarted
                                  ? 'Start Draft'
                                  : 'Complete Draft'}
                          </button>
                        )}

                        {status.IsDraftComplete && (
                          <p className="draft-status-line draft-status-complete">Draft is complete.</p>
                        )}

                        <h2 className="team-management-section-title" style={{ textAlign: 'center' }}>Enrolled Teams</h2>
                        {teams.length === 0 ? (
                          <p style={{ textAlign: 'center', color: '#aaa' }}>
                            No teams yet. Teams are created from enrolled league members when you lock draft odds.
                          </p>
                        ) : (
                          <div className="teams-flex-container">
                            {[...teams]
                              .sort((a, b) => (a.draftOrder ?? 999) - (b.draftOrder ?? 999))
                              .map((team) => {
                                const ownerUid = team.ownerUid || team.uid || team.owner_id || team.owner;
                                const filledPicks = (team.golferNames || []).filter(Boolean);
                                const canAdd = status.IsDraftLocked && filledPicks.length < 4 && lockedOdds.length > 0;
                                const searchKey = `${tournamentId}:${ownerUid}`;
                                const searchText = addSearch[searchKey] || '';
                                const suggestions = searchText.length >= 2
                                  ? lockedOdds
                                      .map((p) => p.name)
                                      .filter((n) => n && n.toLowerCase().includes(searchText.toLowerCase()) && !filledPicks.includes(n))
                                      .slice(0, 8)
                                  : [];

                                return (
                                  <div key={`${tournamentId}:${ownerUid || team.name}`} className="team-card">
                                    <div className="team-card-header">
                                      <h3 style={{ margin: '0', color: 'white' }}>
                                        {status.IsDraftStarted ? `${team.draftOrder}. ` : ''}{team.name}
                                      </h3>
                                      <span style={{ fontSize: '0.8em', color: '#aaa' }}>{filledPicks.length} / 4 picks</span>
                                    </div>

                                    <ul className="team-golfer-list">
                                      {filledPicks.length === 0 && (
                                        <li style={{ padding: '8px 15px', fontStyle: 'italic', color: '#ccc', backgroundColor: '#4A4A4A' }}>
                                          No golfers picked yet.
                                        </li>
                                      )}
                                      {filledPicks.map((golfer) => {
                                        const removeKey = `${tournamentId}:${ownerUid}:remove:${golfer}`;
                                        return (
                                          <li key={golfer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{golfer}</span>
                                            {status.IsDraftLocked && ownerUid && (
                                              <button
                                                onClick={() => handleAdminRemove(tournamentId, ownerUid, golfer)}
                                                disabled={!!editLoading[removeKey]}
                                                style={{
                                                  background: 'none',
                                                  border: 'none',
                                                  color: '#e57373',
                                                  cursor: 'pointer',
                                                  fontSize: '1rem',
                                                  padding: '0 4px',
                                                  lineHeight: 1,
                                                }}
                                                title="Remove golfer"
                                              >
                                                x
                                              </button>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>

                                    {canAdd && ownerUid && (
                                      <div style={{ padding: '8px 12px', borderTop: '1px solid #555', position: 'relative' }}>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                          <input
                                            type="text"
                                            placeholder="Search golfer..."
                                            value={searchText}
                                            onChange={(e) => setAddSearch((prev) => ({ ...prev, [searchKey]: e.target.value }))}
                                            style={{
                                              flex: 1,
                                              padding: '5px 8px',
                                              borderRadius: '4px',
                                              border: '1px solid #555',
                                              background: '#2a2a2a',
                                              color: '#fff',
                                              fontSize: '0.85rem',
                                            }}
                                          />
                                          <button
                                            onClick={() => handleAdminAdd(tournamentId, ownerUid)}
                                            disabled={!searchText.trim() || !!editLoading[`${tournamentId}:${ownerUid}:add`]}
                                            style={{
                                              padding: '5px 12px',
                                              borderRadius: '4px',
                                              border: 'none',
                                              background: '#2d6a2d',
                                              color: '#fff',
                                              cursor: 'pointer',
                                              fontSize: '0.85rem',
                                            }}
                                          >
                                            {editLoading[`${tournamentId}:${ownerUid}:add`] ? '...' : 'Add'}
                                          </button>
                                        </div>

                                        {suggestions.length > 0 && (
                                          <ul
                                            style={{
                                              position: 'absolute',
                                              left: '12px',
                                              right: '12px',
                                              top: '100%',
                                              background: '#333',
                                              border: '1px solid #555',
                                              borderRadius: '4px',
                                              margin: 0,
                                              padding: 0,
                                              listStyle: 'none',
                                              zIndex: 100,
                                              maxHeight: '180px',
                                              overflowY: 'auto',
                                            }}
                                          >
                                            {suggestions.map((name) => (
                                              <li
                                                key={name}
                                                onClick={() => setAddSearch((prev) => ({ ...prev, [searchKey]: name }))}
                                                style={{
                                                  padding: '7px 12px',
                                                  cursor: 'pointer',
                                                  fontSize: '0.85rem',
                                                  color: '#eee',
                                                  borderBottom: '1px solid #444',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#444'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                                              >
                                                {name}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
