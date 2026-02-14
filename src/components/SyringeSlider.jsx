import React, { useRef, useEffect, useState, useCallback } from 'react';

const SyringeSlider = ({ value, max, min = 0, step = 1, onChange, color = '#22c55e', side = 'right' }) => {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);

  // We need to map screen Y coordinates to the barrel's internal value range.
  // The SVG viewBox is 0 0 120 480.
  // The interactive barrel area (where liquid moves) is roughly from Y=90 (top/needle end) to Y=380 (bottom/plunger end).
  // Needle is at top, so 100% is at Y=90, 0% is at Y=380.

  const handleMove = useCallback((clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Ratios based on SVG design below
    const svgHeight = 480;
    const barrelTopY = rect.top + (90 / svgHeight) * rect.height;
    const barrelBottomY = rect.top + (380 / svgHeight) * rect.height;
    const barrelHeight = barrelBottomY - barrelTopY;

    // Inverted logic: click at top (low Y) = max value, click at bottom (high Y) = min value.
    let pos = 1 - ((clientY - barrelTopY) / barrelHeight);
    pos = Math.min(Math.max(pos, 0), 1);

    const rawValue = min + pos * (max - min);
    // Align to step
    const steppedValue = Math.round(rawValue / step) * step;
    // Clean float precision
    const cleanValue = Number(steppedValue.toFixed(step < 1 ? 1 : 0));

    onChange(Math.min(Math.max(cleanValue, min), max));
  }, [min, max, step, onChange]);

  const onMouseDown = (e) => {
    // Prevent default to avoid text selection etc
    // e.preventDefault(); 
    setIsDragging(true);
    handleMove(e.clientY);
  };

  const onTouchStart = (e) => {
    // e.preventDefault(); // Taking care not to block scroll if not hitting the slider, but slider is big now.
    setIsDragging(true);
    handleMove(e.touches[0].clientY);
  };

  useEffect(() => {
    const onMouseMove = (e) => { if (isDragging) { e.preventDefault(); handleMove(e.clientY); } };
    const onTouchMove = (e) => { if (isDragging) { e.preventDefault(); handleMove(e.touches[0].clientY); } };
    const onEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove, { passive: false });
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, handleMove]);

  // --- SVG Layout Constants ---
  const barrelTop = 90;
  const barrelBottom = 380;
  const barrelHeight = barrelBottom - barrelTop;

  // Design: Syringe is vertical.
  // We want it "overflowing" the card.
  // The specific SVG width is 120, height 480.
  const barrelLeft = 20;
  const barrelRight = 100;
  const barrelWidth = barrelRight - barrelLeft;
  const barrelCenterX = (barrelLeft + barrelRight) / 2;

  // Visualizing the liquid level
  // value 0 -> liquid height 0 (at bottom)
  // value max -> liquid height max (at top)
  const liquidHeight = (percentage / 100) * barrelHeight;
  const liquidTop = barrelBottom - liquidHeight;

  // Plunger follows liquid
  const plungerY = liquidTop;

  // Animations
  const transitionClass = isDragging ? '' : 'transition-all duration-500 ease-out';

  // Graduations
  const graduations = [];
  const numMajor = 10;
  for (let i = 0; i <= numMajor; i++) {
    const val = min + (i / numMajor) * (max - min);
    // Y position: i=0 (min) is at bottom, i=max is at top.
    const y = barrelBottom - (i / numMajor) * barrelHeight;
    graduations.push({
      y,
      isMajor: i % 1 === 0, // All 10 are major in this loop? let's stick to simple logic
      label: Math.round(val * 10) / 10
    });
    // intermediate ticks could be added if needed
  }

  // Generate unique IDs for gradients based on side/color to prevent conflicts if multiple sliders exist
  const idSuffix = `${side}-${color.replace('#', '')}`;

  return (
    <div
      ref={containerRef}
      className="syringe-container-vertical relative w-full h-full select-none"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{ touchAction: 'none', cursor: 'grab' }} // 'none' is important for preventing scroll while dragging
    >
      <svg
        viewBox="0 0 120 480"
        className="w-full h-full drop-shadow-2xl"
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id={`barrel-sheen-${idSuffix}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="20%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0)" />
            <stop offset="70%" stopColor="rgba(0,0,0,0.1)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>

          <linearGradient id={`liquid-grad-${idSuffix}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="40%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id={`needle-grad-${idSuffix}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          <filter id={`glow-${idSuffix}`}>
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* --- NEEDLE SECTION (Top) --- */}
        <g transform="translate(0, 0)">
          {/* Needle Base/Hub */}
          <rect x={barrelCenterX - 8} y="60" width="16" height="30" fill="#cbd5e1" rx="2" />
          <rect x={barrelCenterX - 10} y="80" width="20" height="10" fill="#94a3b8" rx="1" />

          {/* The Needle Itself */}
          <rect x={barrelCenterX - 1} y="10" width="2" height="60" fill={`url(#needle-grad-${idSuffix})`} />
          {/* Tip */}
          <path d={`M ${barrelCenterX - 1.5} 10 L ${barrelCenterX} 0 L ${barrelCenterX + 1.5} 10`} fill="#94a3b8" />
        </g>

        {/* --- BARREL BODY --- */}
        {/* Background of barrel (empty part) - Glassy */}
        <path
          d={`
              M ${barrelLeft},${barrelTop} 
              L ${barrelRight},${barrelTop} 
              L ${barrelRight},${barrelBottom} 
              L ${barrelLeft},${barrelBottom} 
              Z
            `}
          fill="rgba(255,255,255,0.15)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />

        {/* --- LIQUID --- */}
        <rect
          x={barrelLeft + 1}
          y={liquidTop}
          width={barrelWidth - 2}
          height={liquidHeight}
          fill={`url(#liquid-grad-${idSuffix})`}
          className={transitionClass}
          // Add a small blur/glow for "radioactive"/medication look
          filter={`url(#glow-${idSuffix})`}
        />

        {/* Bubbles in liquid */}
        {percentage > 5 && (
          <g className={transitionClass}>
            <circle cx={barrelCenterX} cy={barrelBottom - liquidHeight * 0.5} r="2" fill="rgba(255,255,255,0.6)" className="bubble-float-1" />
            <circle cx={barrelCenterX + 10} cy={barrelBottom - liquidHeight * 0.2} r="1.5" fill="rgba(255,255,255,0.5)" className="bubble-float-2" />
            <circle cx={barrelCenterX - 15} cy={barrelBottom - liquidHeight * 0.8} r="1" fill="rgba(255,255,255,0.4)" className="bubble-float-3" />
          </g>
        )}

        {/* --- PLUNGER --- */}
        {/* The rubber stopper matches SVG y coordinates so it sits ON TOP of the liquid */}
        <rect
          x={barrelLeft + 2}
          y={plungerY - 8}
          width={barrelWidth - 4}
          height="12"
          fill="#475569"
          rx="2"
          className={transitionClass}
        />
        {/* The plunger rod (goes down from stopper) - Wait, in vertical syringe with needle UP, plunger is pulled DOWN to fill.
            So Rod extends from stopper DOWNWARDS.
        */}
        <rect
          x={barrelCenterX - 6}
          y={plungerY + 4}
          width={12}
          height={500} /* Long enough to go off screen */
          fill="rgba(255,255,255,0.5)"
          stroke="rgba(255,255,255,0.2)"
          className={transitionClass}
        />
        {/* Thumb rest (at the end of rod) - displayed relative to plungerY */}
        {/* We can put it fixed distance or dynamic. Let's make it look connected. */}
        <g
          transform={`translate(0, ${plungerY + 150})`}
          className={transitionClass}
          opacity={percentage < 5 ? 0.2 : 1} // Fade out if fully pushed in so it doesn't clutter?
        >
          {/* Just visual, maybe offscreen mostly */}
        </g>

        {/* --- GRADUATIONS --- */}
        {graduations.map(({ y, label }) => (
          <g key={y}>
            <line
              x1={barrelRight - 10} y1={y}
              x2={barrelRight} y2={y}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="2"
            />
            <text
              x={barrelRight - 15}
              y={y + 4}
              fill="rgba(255,255,255,0.8)"
              fontSize="10"
              textAnchor="end"
              fontWeight="bold"
            >
              {label}
            </text>
          </g>
        ))}

        {/* --- CYLINDRICAL SHINE OVERLAY --- */}
        <rect
          x={barrelLeft}
          y={barrelTop}
          width={barrelWidth}
          height={barrelHeight}
          fill={`url(#barrel-sheen-${idSuffix})`}
          pointerEvents="none"
        />

        {/* --- FLANGES (Finger grips at bottom of barrel) --- */}
        <rect x={barrelLeft - 10} y={barrelBottom} width={barrelWidth + 20} height="8" rx="2" fill="#cbd5e1" />

      </svg>

      <style>{`
        @keyframes bubble-float {
            0% { transform: translateY(0px); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(-10px); opacity: 0; }
        }
        .bubble-float-1 { animation: bubble-float 3s infinite ease-in; animation-delay: 0s; }
        .bubble-float-2 { animation: bubble-float 4s infinite ease-in; animation-delay: 1s; }
        .bubble-float-3 { animation: bubble-float 2.5s infinite ease-in; animation-delay: 2s; }
      `}</style>
    </div>
  );
};

export default SyringeSlider;
