// src/components/TournamentCreation.js
import React, { useEffect, useRef, useState } from 'react';
import { BACKEND_BASE_URL } from '../apiConfig';
import '../App.css';

const TournamentCreation = ({ onTournamentCreated, activeLeagueId }) => {
  const currentYear = new Date().getFullYear().toString();

  const [year] = useState(currentYear);

  // Season config (pre-configured tournament list)
  const [seasonConfig, setSeasonConfig] = useState([]);
  const [selectedConfigEntry, setSelectedConfigEntry] = useState(null);
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [showSeasonConfigMenu, setShowSeasonConfigMenu] = useState(false);
  const seasonConfigRef = useRef(null);

  useEffect(() => {
    fetch(`${BACKEND_BASE_URL}/season_config?year=${year}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setSeasonConfig(Array.isArray(data) ? data : []))
      .catch(() => setSeasonConfig([]));
  }, [year]);

  useEffect(() => {
    if (seasonConfig.length === 0) {
      setSelectedConfigEntry(null);
      return;
    }

    if (!selectedConfigEntry) {
      setSelectedConfigEntry(seasonConfig[0]);
      return;
    }

    const stillExists = seasonConfig.some((t) => t.tournId === selectedConfigEntry.tournId);
    if (!stillExists) {
      setSelectedConfigEntry(seasonConfig[0]);
    }
  }, [seasonConfig, selectedConfigEntry]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (seasonConfigRef.current && !seasonConfigRef.current.contains(event.target)) {
        setShowSeasonConfigMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          leagueId: activeLeagueId || '',
          startDate: selectedConfigEntry.startDate || '',
          endDate: selectedConfigEntry.endDate || '',
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
      

      <div className="tournament-form">
        {/* Quick Create from Season Config */}
        {seasonConfig.length > 0 && (
          <div className="form-group tournament-dropdown-group">
            <label>SELECT TOURNAMENT</label>
            <div className="tournament-dropdown-row">
              <div className="tournament-dropdown-card" ref={seasonConfigRef}>
                <button
                  type="button"
                  className="tournament-dropdown-trigger"
                  onClick={() => setShowSeasonConfigMenu(prev => !prev)}
                  aria-expanded={showSeasonConfigMenu}
                >
                  <div>
                    <p className="tournament-dropdown-title">{selectedConfigEntry?.name || ''}</p>
                    <p className="tournament-dropdown-meta">
                      {selectedConfigEntry?.startDate ? selectedConfigEntry.startDate.slice(0, 10) : ''}
                    </p>
                  </div>
                  <span className="tournament-dropdown-arrow" aria-hidden="true">▾</span>
                </button>
                {showSeasonConfigMenu && (
                  <div className="tournament-dropdown-menu">
                    {seasonConfig.map(t => (
                      <button
                        key={t.tournId}
                        type="button"
                        className={`tournament-dropdown-item${selectedConfigEntry?.tournId === t.tournId ? ' active' : ''}`}
                        onClick={() => {
                          setSelectedConfigEntry(t);
                          setShowSeasonConfigMenu(false);
                        }}
                      >
                        <span>
                          <strong>{t.name}</strong>
                          {t.startDate ? <small>{t.startDate.slice(0, 10)}</small> : null}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleQuickCreate}
                disabled={!selectedConfigEntry || isQuickCreating}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {isQuickCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
            
          </div>
        )}

        {seasonConfig.length === 0 && (
          <p className="form-help">No available tournaments found for {year}.</p>
        )}
      </div>
    </div>
  );
};

export default TournamentCreation;
