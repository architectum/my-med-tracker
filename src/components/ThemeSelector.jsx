const ThemeSelector = ({ themes, currentTheme, onSelect }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {themes.map((theme) => {
        const isSelected = currentTheme.name === theme.name;

        return (
          <button
            key={theme.name}
            type="button"
            onClick={() => onSelect(theme)}
            className={`rounded-2xl border px-3 py-3 text-left transition-all ${isSelected ? 'border-[var(--success-color)] shadow-lg' : 'border-[var(--border)] hover:-translate-y-0.5'}`}
          >
            <div
              className="rounded-xl p-3"
              style={{
                background: `linear-gradient(135deg, ${theme.backgroundGradient[0]}, ${theme.backgroundGradient[1]})`
              }}
            >
              <div
                className="rounded-lg p-2 mb-2"
                style={{
                  background: `linear-gradient(135deg, ${theme.cardBackground[0]}, ${theme.cardBackground[1]})`
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="h-2 w-10 rounded-full" style={{ background: theme.accentAH }} />
                  <div className="h-2 w-6 rounded-full" style={{ background: theme.accentEI }} />
                </div>
              </div>

              <div
                className="relative h-8 rounded-lg overflow-hidden"
                style={{
                  background: `linear-gradient(180deg, ${theme.timelineBackground[0]}, ${theme.timelineBackground[1]})`
                }}
              >
                <div
                  className="absolute left-1/2 top-0 bottom-0 w-1 opacity-90"
                  style={{ background: theme.timelineLine }}
                />
                <div
                  className="absolute left-2 right-2 top-2 h-1 rounded-full opacity-80"
                  style={{ background: theme.accentEI }}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
              <span className="capitalize">{theme.name}</span>
              {isSelected && <span className="text-[var(--success-color)] text-sm">✓</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSelector;
