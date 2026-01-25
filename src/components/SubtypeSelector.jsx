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
      className="mt-5 flex justify-between rounded-2xl px-2 py-2"
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
        const glow = computedHex ? `0 0 18px ${hexToRgba(computedHex, 0.35)}` : 'none';
        const chipBg = computedHex
          ? `linear-gradient(135deg, ${hexToRgba(computedHex, 0.22)}, ${hexToRgba(computedHex, 0.08)})`
          : 'rgba(255,255,255,0.04)';

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="flex flex-col items-center gap-1 transition-opacity"
            style={{ opacity: isActive ? 1 : 0.45 }}
          >
            <div
              className="w-12 h-12 rounded-xl border flex items-center justify-center"
              style={
                isActive
                  ? { borderColor: cssColor, background: chipBg, boxShadow: glow, color: cssColor }
                  : {
                      borderColor: 'rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.65)'
                    }
              }
            >
              <span className="flex items-center gap-0.5">
                <Icon className="text-xl" />
                {option.value === 'IV+PO' && <FaPills className="text-[10px]" />}
              </span>
            </div>
            <span
              className="text-[10px] font-bold"
              style={{ color: isActive ? cssColor : 'rgba(255,255,255,0.50)' }}
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

