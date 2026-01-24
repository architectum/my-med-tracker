import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const SyringeSlider = forwardRef(({
  value = 0,
  onChange,
  min = 0,
  max = 100,
  accentColor = 'var(--accent-ah)',
  liquidColor = 'rgba(79, 195, 247, 0.8)',
  className = ''
}, ref) => {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(value);
  const [bubbles, setBubbles] = useState([]);
  const animationRef = useRef(null);

  // Expose animateToZero method to parent
  useImperativeHandle(ref, () => ({
    animateToZero: () => {
      return new Promise((resolve) => {
        const startValue = animatedValue;
        const startTime = performance.now();
        const duration = 600;

        const animate = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function for smooth animation
          const easeOutCubic = 1 - Math.pow(1 - progress, 3);
          const newValue = startValue * (1 - easeOutCubic);
          
          setAnimatedValue(newValue);
          onChange?.(Math.round(newValue));

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            setAnimatedValue(0);
            onChange?.(0);
            resolve();
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      });
    }
  }));

  // Sync animated value with prop when not dragging
  useEffect(() => {
    if (!isDragging) {
      setAnimatedValue(value);
    }
  }, [value, isDragging]);

  // Generate bubbles when value is high
  useEffect(() => {
    if (animatedValue >= 70) {
      const bubbleCount = Math.floor((animatedValue - 70) / 10) + 2;
      const newBubbles = Array.from({ length: bubbleCount }, (_, i) => ({
        id: `bubble-${i}-${Date.now()}`,
        x: 15 + Math.random() * 70,
        y: 20 + Math.random() * 60,
        size: 3 + Math.random() * 6,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2
      }));
      setBubbles(newBubbles);
    } else {
      setBubbles([]);
    }
  }, [animatedValue >= 70]);

  const calculateValue = useCallback((clientX) => {
    if (!containerRef.current) return value;
    
    const rect = containerRef.current.getBoundingClientRect();
    const plungerAreaStart = rect.width * 0.15; // After needle
    const plungerAreaEnd = rect.width * 0.92; // Before handle end
    const plungerAreaWidth = plungerAreaEnd - plungerAreaStart;
    
    const relativeX = clientX - rect.left - plungerAreaStart;
    const percentage = Math.max(0, Math.min(1, relativeX / plungerAreaWidth));
    
    return Math.round(min + percentage * (max - min));
  }, [min, max, value]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const newValue = calculateValue(e.clientX);
    setAnimatedValue(newValue);
    onChange?.(newValue);
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const newValue = calculateValue(e.clientX);
    setAnimatedValue(newValue);
    onChange?.(newValue);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const fillPercentage = ((animatedValue - min) / (max - min)) * 100;
  const plungerPosition = fillPercentage;

  return (
    <div 
      ref={containerRef}
      className={`syringe-slider ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '36px',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none'
      }}
    >
      {/* SVG Syringe */}
      <svg
        viewBox="0 0 200 40"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
        }}
      >
        <defs>
          {/* Liquid gradient */}
          <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={liquidColor} stopOpacity="0.9" />
            <stop offset="50%" stopColor={liquidColor} stopOpacity="1" />
            <stop offset="100%" stopColor={liquidColor} stopOpacity="0.8" />
          </linearGradient>

          {/* Barrel gradient for glass effect */}
          <linearGradient id="barrelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="20%" stopColor="rgba(240,240,240,0.9)" />
            <stop offset="80%" stopColor="rgba(220,220,220,0.85)" />
            <stop offset="100%" stopColor="rgba(200,200,200,0.9)" />
          </linearGradient>

          {/* Plunger gradient */}
          <linearGradient id="plungerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#666" />
            <stop offset="50%" stopColor="#888" />
            <stop offset="100%" stopColor="#555" />
          </linearGradient>

          {/* Rubber stopper gradient */}
          <linearGradient id="rubberGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#333" />
            <stop offset="50%" stopColor="#444" />
            <stop offset="100%" stopColor="#222" />
          </linearGradient>

          {/* Needle gradient */}
          <linearGradient id="needleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C0C0C0" />
            <stop offset="50%" stopColor="#E8E8E8" />
            <stop offset="100%" stopColor="#A0A0A0" />
          </linearGradient>

          {/* Clip path for liquid inside barrel */}
          <clipPath id="barrelClip">
            <rect x="30" y="10" width="130" height="20" rx="2" />
          </clipPath>

          {/* Animated wave pattern */}
          <pattern id="wavePattern" x="0" y="0" width="20" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M0 20 Q5 15, 10 20 T20 20"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            >
              <animate
                attributeName="d"
                values="M0 20 Q5 15, 10 20 T20 20;M0 20 Q5 25, 10 20 T20 20;M0 20 Q5 15, 10 20 T20 20"
                dur="2s"
                repeatCount="indefinite"
              />
            </path>
          </pattern>
        </defs>

        {/* Needle hub (connector) */}
        <rect x="20" y="12" width="12" height="16" rx="2" fill="#888" />
        <rect x="22" y="14" width="8" height="12" rx="1" fill="#999" />

        {/* Needle */}
        <polygon points="0,20 20,17 20,23" fill="url(#needleGradient)" />
        <line x1="0" y1="20" x2="20" y2="20" stroke="#D0D0D0" strokeWidth="0.5" />

        {/* Barrel (glass body) */}
        <rect
          x="30"
          y="8"
          width="132"
          height="24"
          rx="3"
          fill="url(#barrelGradient)"
          stroke="#CCC"
          strokeWidth="1"
        />

        {/* Barrel inner shadow */}
        <rect
          x="31"
          y="9"
          width="130"
          height="22"
          rx="2"
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
        />

        {/* Measurement marks on barrel */}
        {[0, 25, 50, 75, 100].map((mark, i) => {
          const x = 35 + (mark / 100) * 120;
          return (
            <g key={mark}>
              <line
                x1={x}
                y1="8"
                x2={x}
                y2="12"
                stroke="#999"
                strokeWidth="0.5"
              />
              <text
                x={x}
                y="7"
                fontSize="4"
                fill="#888"
                textAnchor="middle"
              >
                {mark}
              </text>
            </g>
          );
        })}

        {/* Liquid fill */}
        <g clipPath="url(#barrelClip)">
          <rect
            x="30"
            y="10"
            width={Math.max(0, (fillPercentage / 100) * 130)}
            height="20"
            fill="url(#liquidGradient)"
          >
            {/* Liquid fill animation */}
            <animate
              attributeName="opacity"
              values="0.85;0.95;0.85"
              dur="3s"
              repeatCount="indefinite"
            />
          </rect>

          {/* Wave overlay on liquid */}
          {fillPercentage > 5 && (
            <rect
              x="30"
              y="10"
              width={Math.max(0, (fillPercentage / 100) * 130)}
              height="20"
              fill="url(#wavePattern)"
              opacity="0.5"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0;-20,0;0,0"
                dur="3s"
                repeatCount="indefinite"
              />
            </rect>
          )}

          {/* Liquid surface highlight */}
          {fillPercentage > 5 && (
            <ellipse
              cx={30 + (fillPercentage / 100) * 130 - 3}
              cy="20"
              rx="2"
              ry="8"
              fill="rgba(255,255,255,0.4)"
            >
              <animate
                attributeName="opacity"
                values="0.3;0.5;0.3"
                dur="2s"
                repeatCount="indefinite"
              />
            </ellipse>
          )}

          {/* Air bubbles */}
          {bubbles.map((bubble) => (
            <circle
              key={bubble.id}
              cx={30 + (bubble.x / 100) * (fillPercentage / 100) * 130}
              cy={10 + (bubble.y / 100) * 20}
              r={bubble.size / 2}
              fill="rgba(255,255,255,0.6)"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="0.3"
            >
              <animate
                attributeName="cy"
                values={`${10 + (bubble.y / 100) * 20};${10 + ((bubble.y - 15) / 100) * 20};${10 + (bubble.y / 100) * 20}`}
                dur={`${bubble.duration}s`}
                begin={`${bubble.delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values={`${bubble.size / 2};${bubble.size / 2 + 0.5};${bubble.size / 2}`}
                dur={`${bubble.duration * 0.8}s`}
                begin={`${bubble.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>

        {/* Glass reflection */}
        <rect
          x="32"
          y="10"
          width="126"
          height="6"
          rx="1"
          fill="rgba(255,255,255,0.4)"
        />

        {/* Plunger rod */}
        <rect
          x={35 + (plungerPosition / 100) * 120}
          y="16"
          width={160 - 35 - (plungerPosition / 100) * 120}
          height="8"
          fill="url(#plungerGradient)"
        />

        {/* Rubber stopper (plunger head) */}
        <rect
          x={32 + (plungerPosition / 100) * 120}
          y="11"
          width="6"
          height="18"
          rx="1"
          fill="url(#rubberGradient)"
        />

        {/* Plunger handle (thumb rest) */}
        <g transform={`translate(${160 - (100 - plungerPosition) / 100 * 0}, 0)`}>
          <rect
            x="160"
            y="6"
            width="8"
            height="28"
            rx="2"
            fill="#666"
          />
          <rect
            x="168"
            y="10"
            width="25"
            height="20"
            rx="3"
            fill={accentColor}
            style={{
              filter: isDragging ? 'brightness(1.1)' : 'none',
              transition: 'filter 0.2s'
            }}
          />
          {/* Grip lines on handle */}
          <line x1="172" y1="14" x2="189" y2="14" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="172" y1="18" x2="189" y2="18" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="172" y1="22" x2="189" y2="22" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="172" y1="26" x2="189" y2="26" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        </g>

        {/* Finger flange */}
        <rect
          x="158"
          y="4"
          width="4"
          height="32"
          rx="1"
          fill="#777"
        />
      </svg>

    </div>
  );
});

SyringeSlider.displayName = 'SyringeSlider';

export default SyringeSlider;
