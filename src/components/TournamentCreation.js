// src/components/TournamentCreation.js
import React, { useState, useEffect, useCallback } from 'react';
import { BACKEND_BASE_URL, LEAGUES_API_ENDPOINT } from '../apiConfig';
import '../App.css';

// Normalize a tournament name for fuzzy matching (lowercase, strip punctuation/spacing)
const normalizeName = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

// Handle MongoDB extended JSON date fields: { $date: { $numberLong: "..." } } or plain strings
const parseDateField = (dateField) => {
  if (!dateField) return null;
  if (typeof dateField === 'string') return dateField.slice(0, 10) || null;
  if (dateField.$date) {
    const ms = parseInt(dateField.$date.$numberLong ?? dateField.$date, 10);
    if (!isNaN(ms)) return new Date(ms).toISOString().slice(0, 10);
  }
  return null;
};

const TournamentCreation = ({ onTournamentCreated, activeLeagueId }) => {
  const currentYear = new Date().getFullYear().toString();

  const [year, setYear] = useState(currentYear);
  const [leagueName, setLeagueName] = useState('');

  // Step 1: RapidAPI schedule
  const [scheduleItems, setScheduleItems] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);

  // Step 2: SportsData.io odds tournaments
  const [oddsItems, setOddsItems] = useState([]);
  const [oddsLoading, setOddsLoading] = useState(false);
  const [oddsError, setOddsError] = useState('');
  const [selectedOddsId, setSelectedOddsId] = useState('');

  // Derived / editable fields
  const [tournamentName, setTournamentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Season config (pre-configured tournament list)
  const [seasonConfig, setSeasonConfig] = useState([]);
  const [selectedConfigEntry, setSelectedConfigEntry] = useState(null);
  const [isQuickCreating, setIsQuickCreating] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_BASE_URL}/season_config?year=${year}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setSeasonConfig(Array.isArray(data) ? data : []))
      .catch(() => setSeasonConfig([]));
  }, [year]);

  useEffect(() => {
    if (!activeLeagueId) { setLeagueName(''); return; }
    fetch(`${LEAGUES_API_ENDPOINT}/${activeLeagueId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.name && setLeagueName(d.name))
      .catch(() => {});
  }, [activeLeagueId]);

  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true);
    setScheduleError('');
    setScheduleItems([]);
    setSelectedScheduleItem(null);
    setOddsItems([]);
    setSelectedOddsId('');
    setTournamentName('');
    try {
      const r = await fetch(`${BACKEND_BASE_URL}/schedule?year=${year}&orgId=1`);
      if (!r.ok) throw new Error('Failed to load schedule');
      const data = await r.json();
      const items = Array.isArray(data.schedule) ? data.schedule : [];
      setScheduleItems(items);
      if (items.length === 0) setScheduleError('No tournaments found for this year.');
    } catch (e) {
      setScheduleError(e.message || 'Error loading schedule');
    } finally {
      setScheduleLoading(false);
    }
  }, [year]);

  const loadOddsTournaments = useCallback(async (scheduleName) => {
    setOddsLoading(true);
    setOddsError('');
    setOddsItems([]);
    setSelectedOddsId('');
    try {
      const r = await fetch(`${BACKEND_BASE_URL}/odds_tournaments?year=${year}`);
      if (!r.ok) throw new Error('Failed to load odds tournaments');
      const items = await r.json();
      if (Array.isArray(items)) {
        setOddsItems(items);
        // Auto-match by name
        const norm = normalizeName(scheduleName);
        const match = items.find(t => normalizeName(t.name) === norm) ||
          items.find(t => normalizeName(t.name).includes(norm.slice(0, 8))) ||
          items.find(t => norm.includes(normalizeName(t.name).slice(0, 8)));
        if (match) setSelectedOddsId(match.oddsId);
      }
    } catch (e) {
      setOddsError(e.message || 'Error loading odds tournaments');
    } finally {
      setOddsLoading(false);
    }
  }, [year]);

  const handleScheduleSelect = (e) => {
    const tournId = e.target.value;
    if (!tournId) {
      setSelectedScheduleItem(null);
      setTournamentName('');
      setOddsItems([]);
      setSelectedOddsId('');
      return;
    }
    const item = scheduleItems.find(t => t.tournId === tournId);
    setSelectedScheduleItem(item || null);
    const name = item?.name || '';
    setTournamentName(name);
    if (name) loadOddsTournaments(name);
  };

  const handleCreateTournament = async () => {
    if (!selectedScheduleItem || !selectedOddsId || !tournamentName.trim()) {
      alert('Please select a tournament and confirm the odds match.');
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tournamentName.trim(),
          orgId: '1',
          tournId: selectedScheduleItem.tournId,
          year,
          oddsId: selectedOddsId,
          leagueId: activeLeagueId || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tournament');
      }

      const result = await response.json();

      // Reset form
      setSelectedScheduleItem(null);
      setTournamentName('');
      setOddsItems([]);
      setSelectedOddsId('');

      alert(`Tournament "${result.name}" created successfully!`);
      if (onTournamentCreated) onTournamentCreated();
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert(`Error creating tournament: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const canCreate = selectedScheduleItem && selectedOddsId && tournamentName.trim() && !isCreating;

  const handleQuickCreate = async () => {
    if (!selectedConfigEntry) return;
    setIsQuickCreating(true);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedConfigEntry.name,
          orgId: '1',
          tournId: selectedConfigEntry.tournId,
          year: selectedConfigEntry.year,
          oddsId: selectedConfigEntry.oddsId,
          leagueId: activeLeagueId || ''
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create tournament');
      }
      const result = await response.json();
      setSelectedConfigEntry(null);
      alert(`Tournament "${result.name}" created successfully!`);
      if (onTournamentCreated) onTournamentCreated();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsQuickCreating(false);
    }
  };

  return (
    <div className="tournament-creation">
      <h3>Create New Tournament</h3>
      {activeLeagueId ? (
        <p className="subtitle">
          Creating tournament for league: <strong>{leagueName || activeLeagueId}</strong>
        </p>
      ) : (
        <p className="subtitle">Set up a new tournament</p>
      )}

      <div className="tournament-form">
        {/* Quick Create from Season Config */}
        {seasonConfig.length > 0 && (
          <div className="form-group" style={{ borderBottom: '1px solid #444', paddingBottom: '1.25rem', marginBottom: '0.5rem' }}>
            <label htmlFor="season-config-select">Quick Create from Season Schedule</label>
            <div className="form-row-inline">
              <select
                id="season-config-select"
                className="form-input"
                value={selectedConfigEntry?.tournId || ''}
                onChange={e => {
                  const entry = seasonConfig.find(t => t.tournId === e.target.value) || null;
                  setSelectedConfigEntry(entry);
                }}
              >
                <option value="">— select a pre-configured tournament —</option>
                {seasonConfig.map(t => (
                  <option key={t.tournId} value={t.tournId}>
                    {t.name}{t.startDate ? ` (${t.startDate.slice(0, 10)})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleQuickCreate}
                disabled={!selectedConfigEntry || isQuickCreating}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {isQuickCreating ? 'Creating...' : 'Quick Create'}
              </button>
            </div>
            {selectedConfigEntry && (
              <small className="form-help">
                tournId: <strong>{selectedConfigEntry.tournId}</strong> · oddsId: <strong>{selectedConfigEntry.oddsId}</strong>
              </small>
            )}
            <p className="form-help" style={{ marginTop: '0.75rem', borderTop: '1px solid #333', paddingTop: '0.75rem' }}>
              Or configure manually below:
            </p>
          </div>
        )}

        {/* Year + Load */}
        <div className="form-group form-row-inline">
          <div>
            <label htmlFor="year">Season Year</label>
            <input
              id="year"
              type="number"
              value={year}
              min="2020"
              max="2030"
              onChange={(e) => setYear(e.target.value)}
              className="form-input form-input-narrow"
            />
          </div>
          <button
            onClick={loadSchedule}
            disabled={scheduleLoading}
            className="btn-secondary"
            style={{ alignSelf: 'flex-end' }}
          >
            {scheduleLoading ? 'Loading...' : 'Load Schedule'}
          </button>
        </div>

        {scheduleError && <p className="form-error">{scheduleError}</p>}

        {/* Step 1: Pick from schedule */}
        {scheduleItems.length > 0 && (
          <div className="form-group">
            <label htmlFor="schedule-select">Step 1 — Select Tournament</label>
            <select
              id="schedule-select"
              className="form-input"
              value={selectedScheduleItem?.tournId || ''}
              onChange={handleScheduleSelect}
            >
              <option value="">— choose a tournament —</option>
              {scheduleItems.map(t => (
                <option key={t.tournId} value={t.tournId}>
                  {t.name}{parseDateField(t.date?.start) ? ` (${parseDateField(t.date?.start)})` : ''}
                </option>
              ))}
            </select>
            {selectedScheduleItem && (
              <small className="form-help">
                tournId: <strong>{selectedScheduleItem.tournId}</strong>
                {parseDateField(selectedScheduleItem.date?.start) && ` · ${parseDateField(selectedScheduleItem.date?.start)}`}
              </small>
            )}
          </div>
        )}

        {/* Display name (editable) */}
        {selectedScheduleItem && (
          <div className="form-group">
            <label htmlFor="tournament-name">Display Name</label>
            <input
              id="tournament-name"
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              className="form-input"
            />
          </div>
        )}

        {/* Step 2: Odds match */}
        {selectedScheduleItem && (
          <div className="form-group">
            <label htmlFor="odds-select">Step 2 — Confirm Odds Source Match</label>
            {oddsLoading && <p className="form-help">Matching odds source...</p>}
            {oddsError && <p className="form-error">{oddsError}</p>}
            {!oddsLoading && oddsItems.length > 0 && (
              <>
                <select
                  id="odds-select"
                  className="form-input"
                  value={selectedOddsId}
                  onChange={(e) => setSelectedOddsId(e.target.value)}
                >
                  <option value="">— select odds tournament —</option>
                  {oddsItems.map(t => (
                    <option key={t.oddsId} value={t.oddsId}>
                      {t.name}{t.startDate ? ` (${t.startDate.slice(0, 10)})` : ''} · ID: {t.oddsId}
                    </option>
                  ))}
                </select>
                {selectedOddsId && (
                  <small className="form-help">
                    oddsId: <strong>{selectedOddsId}</strong>
                    {selectedOddsId && oddsItems.find(t => t.oddsId === selectedOddsId)?.name === tournamentName
                      ? ' ✓ exact name match'
                      : ' — verify this is correct'}
                  </small>
                )}
              </>
            )}
            {!oddsLoading && oddsItems.length === 0 && !oddsError && selectedScheduleItem && (
              <p className="form-help">No odds data available for this year.</p>
            )}
          </div>
        )}

        <div className="form-actions">
          <button
            onClick={handleCreateTournament}
            disabled={!canCreate}
            className="create-tournament-btn"
          >
            {isCreating ? 'Creating Tournament...' : 'Create Tournament'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentCreation;
