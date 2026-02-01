import { FaPills } from 'react-icons/fa6';

const SUBTYPE_CSS_COLOR = {
  IV: 'var(--subtype-iv)',
  IM: 'var(--subtype-im)',
  PO: 'var(--subtype-po)',
  'IV+PO': 'var(--subtype-ivpo)'
};

const hexToRgba = (hex, alpha) => {
  if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Reads CSS var color (hex) to build glow/gradient.
const getComputedCssColor = (cssVar) => {
  if (typeof window === 'undefined') return null;
  try {
    const root = document.documentElement;
    const computed = getComputedStyle(root).getPropertyValue(cssVar.replace('var(', '').replace(')', '')).trim();
    return computed || null;
  } catch {
    return null;
  }
};

const SubtypeSelector = ({ value, onChange, options }) => {
  return (
    <div
      className="mt-3 flex justify-center items-center gap-3 rounded-xl px-3 py-2"
      style={{
        background: 'var(--subtype-panel-bg)',
        border: '1px solid var(--subtype-panel-border)'
      }}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const Icon = option.icon;

        const cssColor = SUBTYPE_CSS_COLOR[option.value] || 'var(--text-secondary)';
        // Try to read actual hex from the var so we can keep the existing glow/gradient look.
        const computedHex = getComputedCssColor(cssColor);
        const glow = computedHex ? `0 0 12px ${hexToRgba(computedHex, 0.35)}` : 'none';
        const chipBg = computedHex
          ? `linear-gradient(135deg, ${hexToRgba(computedHex, 0.22)}, ${hexToRgba(computedHex, 0.08)})`
          : 'var(--surface)';

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="flex flex-col items-center gap-1 transition-opacity"
            style={{ opacity: isActive ? 1 : 0.45 }}
          >
            <div
              className="w-9 h-9 rounded-lg border flex items-center justify-center"
              style={
                isActive
                  ? { borderColor: cssColor, background: chipBg, boxShadow: glow, color: cssColor }
                  : {
                      borderColor: 'var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text-secondary)'
                    }
              }
            >
              <span className="flex items-center gap-0.5">
                <Icon className="text-base" />
                {option.value === 'IV+PO' && <FaPills className="text-[8px]" />}
              </span>
            </div>
            <span
              className="text-[9px] font-bold"
              style={{ color: isActive ? cssColor : 'var(--text-secondary)' }}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SubtypeSelector;

