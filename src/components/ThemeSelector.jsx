import { useMemo } from "react";

const ThemeSelector = ({ themes, currentTheme, onSelect }) => {
  const { lightThemes, darkThemes } = useMemo(() => {
    return {
      lightThemes: themes
        .filter((t) => !t.isDark)
        .sort((a, b) => a.name.localeCompare(b.name)),
      darkThemes: themes
        .filter((t) => t.isDark)
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [themes]);

  const renderThemeCard = (theme) => {
    const isSelected = currentTheme.name === theme.name;
    const isDark = theme.isDark;

    const imColor =
      theme.subtypeColors?.im || (isDark ? "#BA68C8" : "#a855f7");
    const ivColor =
      theme.subtypeColors?.iv || (isDark ? "#4FC3F7" : "#3b82f6");
    const btnBg =
      theme.addButton?.bg ||
      (isDark ? "#FFFFFF" : theme.accentPrimary || theme.accentAH);
    const border = theme.border || "rgba(255,255,255,0.1)";

    return (
      <button
        key={theme.name}
        type="button"
        onClick={() => onSelect(theme)}
        className={`flex flex-col rounded-2xl border p-2 text-left transition-all duration-250 ${
          isSelected
            ? "scale-[1.04] shadow-xl"
            : "hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
        }`}
        style={{
          borderColor: isSelected
            ? "var(--success-color)"
            : "var(--border)",
          background: isSelected
            ? `linear-gradient(135deg, ${theme.backgroundGradient[0]}22, ${theme.backgroundGradient[1]}11)`
            : "transparent",
          boxShadow: isSelected
            ? `0 0 0 2px var(--success-color), 0 8px 24px var(--shadow-color)`
            : undefined,
        }}
      >
        {/* Canvas Preview */}
        <div
          className="relative aspect-[1/1.1] w-full rounded-xl overflow-hidden flex flex-col items-center justify-center p-2 shadow-inner"
          style={{
            background: `linear-gradient(135deg, ${theme.backgroundGradient[0]}, ${theme.backgroundGradient[1]})`,
          }}
        >
          {/* Cards Row */}
          <div className="flex gap-1.5 mb-2 items-center w-full justify-center">
            {/* Left accent bar (IM) */}
            <div
              className="w-1.5 h-9 rounded-full"
              style={{ background: imColor, opacity: 0.85 }}
            />

            {/* AH Card */}
            <div
              className="w-12 h-14 rounded-lg border flex flex-col p-1"
              style={{
                background: `linear-gradient(145deg, ${theme.cardBackground[0]}, ${theme.cardBackground[1]})`,
                borderColor: border,
              }}
            >
              <div
                className="h-2 w-full rounded-sm mb-1"
                style={{ background: theme.accentAH }}
              />
              <div
                className="h-px w-8/12 rounded-full mb-0.5"
                style={{ background: theme.textPrimary, opacity: 0.8 }}
              />
              <div
                className="h-px w-5/12 rounded-full"
                style={{ background: theme.textSecondary, opacity: 0.5 }}
              />
              <div
                className="mt-auto h-2.5 w-full rounded-sm"
                style={{ background: btnBg, opacity: 0.9 }}
              />
            </div>

            {/* EI Card */}
            <div
              className="w-12 h-14 rounded-lg border flex flex-col p-1"
              style={{
                background: `linear-gradient(145deg, ${theme.cardBackground[0]}, ${theme.cardBackground[1]})`,
                borderColor: border,
              }}
            >
              <div
                className="h-2 w-full rounded-sm mb-1"
                style={{ background: theme.accentEI }}
              />
              <div
                className="h-px w-8/12 rounded-full mb-0.5"
                style={{ background: theme.textPrimary, opacity: 0.8 }}
              />
              <div
                className="h-px w-5/12 rounded-full"
                style={{ background: theme.textSecondary, opacity: 0.5 }}
              />
              <div
                className="mt-auto h-2.5 w-full rounded-sm"
                style={{ background: btnBg, opacity: 0.9 }}
              />
            </div>

            {/* Right accent bar (IV) */}
            <div
              className="w-1.5 h-9 rounded-full"
              style={{ background: ivColor, opacity: 0.85 }}
            />
          </div>

          {/* Timeline Preview */}
          <div
            className="w-28 h-10 rounded-lg relative flex justify-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${theme.timelineBackground[0]}, ${theme.timelineBackground[1]})`,
              borderColor: border,
              border: `1px solid ${border}`,
            }}
          >
            <div
              className="absolute left-1/2 top-0 bottom-0 w-px"
              style={{ background: theme.timelineLine, opacity: 0.6 }}
            />
            <div
              className="absolute right-[52%] top-2.5 w-5 h-2.5 rounded-sm"
              style={{ background: theme.accentAH, opacity: 0.9 }}
            />
            <div
              className="absolute left-[52%] top-5 w-5 h-2.5 rounded-sm"
              style={{ background: theme.accentEI, opacity: 0.9 }}
            />
          </div>
        </div>

        {/* Title & Status */}
        <div className="mt-1.5 px-0.5 flex items-center justify-between w-full">
          <span
            className="text-[9px] font-black uppercase tracking-wider truncate max-w-[80%]"
            style={{
              color: isSelected ? "var(--success-color)" : "var(--text-primary)",
            }}
          >
            {theme.name}
          </span>
          {isSelected && (
            <div
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--success-color)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="4"
                className="w-2 h-2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {lightThemes.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">
              Light
            </h5>
            <div
              className="flex-1 h-px"
              style={{ background: "var(--border)" }}
            />
            <span className="text-[10px] text-[var(--text-secondary)] opacity-50">
              {lightThemes.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {lightThemes.map(renderThemeCard)}
          </div>
        </div>
      )}

      {darkThemes.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h5 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">
              Dark
            </h5>
            <div
              className="flex-1 h-px"
              style={{ background: "var(--border)" }}
            />
            <span className="text-[10px] text-[var(--text-secondary)] opacity-50">
              {darkThemes.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {darkThemes.map(renderThemeCard)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
