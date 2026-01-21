import React, { useState, useEffect } from 'react';
import Notification from './components/Notification';
import ThemeSelector from './components/ThemeSelector';
import IntakeDetailsModal from './components/IntakeDetailsModal';
import MedTrackerCard from './components/MedTrackerCard';
import TimelineHistory from './components/TimelineHistory';
import { TIMELINE_TITLE_DEFAULT } from './utils/time';

// --- THEME LOADING ---
const themeModules = import.meta.glob('./themes/*.json', { eager: true });
const themes = Object.values(themeModules).map(m => m.default);

export default function App() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return themes.find(t => t.name === saved) || themes[0];
  });
  const [notification, setNotification] = useState(null);
  const [timelineHeading, setTimelineHeading] = useState(TIMELINE_TITLE_DEFAULT);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedIntakeId, setSelectedIntakeId] = useState(null);
  const [activeIntake, setActiveIntake] = useState(null);
  const [activeTimeSelection, setActiveTimeSelection] = useState(null);
  const [selectedTimeMap, setSelectedTimeMap] = useState({});

  const handleSelectIntake = (intake) => {
    if (!intake) {
      setSelectedIntakeId(null);
      setActiveIntake(null);
      return;
    }
    setSelectedIntakeId(intake.id);
    setActiveIntake(intake);
  };

  const handleStartTimeSelection = (patientId) => {
    setActiveTimeSelection(patientId);
    setSelectedTimeMap((prev) => ({ ...prev, [patientId]: null }));
  };

  const handleCancelTimeSelection = (patientId) => {
    setActiveTimeSelection((prev) => (prev === patientId ? null : prev));
    setSelectedTimeMap((prev) => ({ ...prev, [patientId]: null }));
  };

  const handleResetTimeSelection = (patientId) => {
    setSelectedTimeMap((prev) => ({ ...prev, [patientId]: null }));
    setActiveTimeSelection((prev) => (prev === patientId ? null : prev));
  };

  const handleTimeSelected = (date) => {
    if (!activeTimeSelection) return;
    setSelectedTimeMap((prev) => ({ ...prev, [activeTimeSelection]: date }));
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-gradient-start', currentTheme.backgroundGradient[0]);
    root.style.setProperty('--bg-gradient-end', currentTheme.backgroundGradient[1]);
    root.style.setProperty('--card-bg-start', currentTheme.cardBackground[0]);
    root.style.setProperty('--card-bg-end', currentTheme.cardBackground[1]);
    root.style.setProperty('--text-primary', currentTheme.textPrimary);
    root.style.setProperty('--text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--accent-ah', currentTheme.accentAH);
    root.style.setProperty('--accent-ei', currentTheme.accentEI);
    root.style.setProperty('--border', currentTheme.border);
    root.style.setProperty('--timeline-line', currentTheme.timelineLine);
    root.style.setProperty('--marker-color', currentTheme.markerColor);
    root.style.setProperty('--timeline-bg-start', currentTheme.timelineBackground[0]);
    root.style.setProperty('--timeline-bg-end', currentTheme.timelineBackground[1]);
    root.style.setProperty('--timeline-bg-alt-start', currentTheme.timelineSecondaryBackground[0]);
    root.style.setProperty('--timeline-bg-alt-end', currentTheme.timelineSecondaryBackground[1]);
    root.style.setProperty('--success-color', currentTheme.success);
    localStorage.setItem('theme', currentTheme.name);
  }, [currentTheme]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col transition-colors duration-500" style={{ background: `linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end))` }}>
      {notification && <Notification message={notification} onClose={() => setNotification(null)} />}

      {/* Header */}
      <header className="p-3 flex justify-end items-center">
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-full border border-[var(--border)] text-[var(--text-primary)] shadow-md hover:scale-105 transition-transform"
          style={{ background: 'linear-gradient(135deg, var(--card-bg-start), var(--card-bg-end))' }}
          aria-label="Open settings"
        >
          <span className="text-lg">⚙️</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col gap-4 max-w-lg mx-auto w-full px-4 overflow-hidden">
        <div className="flex gap-3">
          <MedTrackerCard
            title="AH"
            onAddSuccess={setNotification}
            isSelectingTime={activeTimeSelection === 'AH'}
            selectedTime={selectedTimeMap.AH}
            onStartTimeSelection={handleStartTimeSelection}
            onCancelTimeSelection={handleCancelTimeSelection}
            onResetTimeSelection={handleResetTimeSelection}
          />
          <MedTrackerCard
            title="EI"
            onAddSuccess={setNotification}
            isSelectingTime={activeTimeSelection === 'EI'}
            selectedTime={selectedTimeMap.EI}
            onStartTimeSelection={handleStartTimeSelection}
            onCancelTimeSelection={handleCancelTimeSelection}
            onResetTimeSelection={handleResetTimeSelection}
          />
        </div>

        <div
          className="flex-grow backdrop-blur-md rounded-t-[2.5rem] pt-6 shadow-2xl border-x border-t border-[var(--border)] flex flex-col overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--card-bg-start), var(--card-bg-end))' }}
        >
          <h2 className="text-center text-xs font-black text-[var(--text-secondary)] tracking-[0.3em] uppercase mb-2">{timelineHeading}</h2>
          {activeTimeSelection && (
            <div className="text-center text-[10px] font-semibold text-[var(--text-secondary)] mb-2">
              Оберіть час на таймлайні
            </div>
          )}
          <TimelineHistory
            onDayChange={(label) => setTimelineHeading(label || TIMELINE_TITLE_DEFAULT)}
            selectedId={selectedIntakeId}
            onSelectIntake={handleSelectIntake}
            isSelectingTime={Boolean(activeTimeSelection)}
            onTimeSelected={handleTimeSelected}
          />
        </div>
      </main>

      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="mt-16 w-[min(92vw,520px)] max-h-[80vh] overflow-y-auto rounded-3xl border border-[var(--border)] p-5 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, var(--card-bg-start), var(--card-bg-end))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">Settings</h3>
                <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">Current theme: {currentTheme.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full border border-[var(--border)] text-[var(--text-primary)] flex items-center justify-center"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <div className="mb-3">
              <h4 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Theme</h4>
            </div>

            <ThemeSelector
              themes={themes}
              currentTheme={currentTheme}
              onSelect={(theme) => setCurrentTheme(theme)}
            />
          </div>
        </div>
      )}

      {activeIntake && (
        <IntakeDetailsModal
          intake={activeIntake}
          onClose={() => handleSelectIntake(null)}
        />
      )}
    </div>
  );
}
