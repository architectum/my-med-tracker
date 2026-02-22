import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { getStartOfDay } from "../utils/time";

/**
 * CalendarView — horizontal scrollable calendar strip with macOS-dock magnification.
 *
 * The card closest to the centre of the viewport gets the largest scale;
 * neighbours fall off smoothly using a Gaussian curve.
 */
const CARD_W = 72;          // px, collapsed card width
const CARD_GAP = 4;         // px gap between cards
const CARD_STRIDE = CARD_W + CARD_GAP;
const MAX_SCALE = 1.6;      // centre card scale
const INFLUENCE = 2.5;      // how many card-widths the magnification spreads
const TRAIL_CARDS = 5;      // empty spacer cards at the end

const CalendarView = ({ onMonthChange, scrollToNextMonth, scrollToPrevMonth }) => {
  const [intakes, setIntakes] = useState([]);
  const scrollRef = useRef(null);
  const [expandedDays, setExpandedDays] = useState({});   // key → "detail"
  const [pressedKey, setPressedKey] = useState(null);

  // scroll position → drives magnification
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "intakes"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snapshot) => {
      setIntakes(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }))
      );
    });
  }, []);

  // Observe container width
  useEffect(() => {
    if (!scrollRef.current) return;
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width));
    ro.observe(scrollRef.current);
    setContainerWidth(scrollRef.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Group intakes by day key (skip LOST)
  const intakesByKey = useMemo(() => {
    const map = new Map();
    intakes.forEach((intake) => {
      if (intake.patientId === "NO" || intake.subtype === "LOST") return;
      const dayDate = getStartOfDay(intake.timestamp);
      const key = dayDate.toLocaleDateString("uk-UA");
      if (!map.has(key)) map.set(key, { date: dayDate, intakes: [] });
      map.get(key).intakes.push(intake);
    });
    return map;
  }, [intakes]);

  // Full day range: first intake → today
  const allDays = useMemo(() => {
    if (intakesByKey.size === 0) return [];
    const today = getStartOfDay(new Date());
    const dates = Array.from(intakesByKey.values()).map((d) => d.date.getTime());
    const firstMs = Math.min(...dates);
    const days = [];
    let cur = new Date(firstMs);
    while (cur <= today) {
      const key = cur.toLocaleDateString("uk-UA");
      const hasIntakes = intakesByKey.has(key);
      days.push({
        date: new Date(cur),
        key,
        hasIntakes,
        intakes: hasIntakes ? intakesByKey.get(key).intakes : [],
      });
      cur = new Date(cur.getTime() + 86400000);
    }
    return days;
  }, [intakesByKey]);

  // Card refs
  const cardRefs = useRef([]);
  useEffect(() => {
    cardRefs.current = allDays.map((_, i) => cardRefs.current[i] || { current: null });
  }, [allDays]);

  // ── Month heading ─────────────────────────────────────────────────────────
  const updateMonthHeading = useCallback(() => {
    if (!scrollRef.current || !allDays.length) return;
    const containerLeft = scrollRef.current.getBoundingClientRect().left;
    let activeIndex = 0;
    cardRefs.current.forEach((ref, idx) => {
      if (!ref?.current) return;
      const rect = ref.current.getBoundingClientRect();
      if (rect.left - containerLeft <= 36) activeIndex = idx;
    });
    const activeDay = allDays[activeIndex];
    if (activeDay && onMonthChange) {
      const label = activeDay.date.toLocaleDateString("uk-UA", {
        month: "long", year: "numeric",
      });
      onMonthChange(label.charAt(0).toUpperCase() + label.slice(1));
    }
  }, [allDays, onMonthChange]);

  useEffect(() => { updateMonthHeading(); }, [updateMonthHeading, allDays]);

  // ── Scroll handlers ───────────────────────────────────────────────────────
  const handleScroll = useCallback((e) => {
    setScrollLeft(e.currentTarget.scrollLeft);
    updateMonthHeading();
  }, [updateMonthHeading]);

  // ── Scroll to next/prev month ─────────────────────────────────────────────
  const getActiveIndex = useCallback(() => {
    if (!scrollRef.current || !allDays.length) return 0;
    const cl = scrollRef.current.getBoundingClientRect().left;
    let ai = 0;
    cardRefs.current.forEach((ref, idx) => {
      if (!ref?.current) return;
      const rect = ref.current.getBoundingClientRect();
      if (rect.left - cl <= 36) ai = idx;
    });
    return ai;
  }, [allDays]);

  const handleScrollToNextMonth = useCallback(() => {
    const ai = getActiveIndex();
    const cm = allDays[ai]?.date.getMonth();
    const cy = allDays[ai]?.date.getFullYear();
    let nextStart = -1;
    for (let i = ai + 1; i < allDays.length; i++) {
      const d = allDays[i].date;
      if (d.getMonth() !== cm || d.getFullYear() !== cy) { nextStart = i; break; }
    }
    if (nextStart < 0) return;
    const nm = allDays[nextStart].date.getMonth();
    const ny = allDays[nextStart].date.getFullYear();
    let lastIdx = nextStart;
    for (let i = nextStart; i < allDays.length; i++) {
      const d = allDays[i].date;
      if (d.getMonth() === nm && d.getFullYear() === ny) lastIdx = i; else break;
    }
    cardRefs.current[lastIdx]?.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
  }, [allDays, getActiveIndex]);

  const handleScrollToPrevMonth = useCallback(() => {
    const ai = getActiveIndex();
    const cm = allDays[ai]?.date.getMonth();
    const cy = allDays[ai]?.date.getFullYear();
    let ti = -1;
    for (let i = ai - 1; i >= 0; i--) {
      const d = allDays[i].date;
      if (d.getMonth() !== cm || d.getFullYear() !== cy) { ti = i; break; }
    }
    if (ti < 0) return;
    cardRefs.current[ti]?.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
  }, [allDays, getActiveIndex]);

  useEffect(() => { if (scrollToNextMonth) scrollToNextMonth.current = handleScrollToNextMonth; }, [scrollToNextMonth, handleScrollToNextMonth]);
  useEffect(() => { if (scrollToPrevMonth) scrollToPrevMonth.current = handleScrollToPrevMonth; }, [scrollToPrevMonth, handleScrollToPrevMonth]);

  // ── Scroll to end on first data ───────────────────────────────────────────
  const scrolledOnce = useRef(false);
  useEffect(() => {
    if (allDays.length > 0 && !scrolledOnce.current && scrollRef.current) {
      scrolledOnce.current = true;
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
      }, 80);
    }
  }, [allDays.length]);

  // ── Magnification: Gaussian scale for each card ───────────────────────────
  const viewCentre = scrollLeft + containerWidth / 2;

  const scales = useMemo(() => {
    return allDays.map((_, i) => {
      const cardCentre = 16 + i * CARD_STRIDE + CARD_W / 2;
      const dist = Math.abs(cardCentre - viewCentre) / CARD_STRIDE;
      const t = Math.exp(-(dist * dist) / (2 * INFLUENCE * INFLUENCE));
      return 1 + (MAX_SCALE - 1) * t;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollLeft, containerWidth, allDays.length]);

  // ── Stats helpers ─────────────────────────────────────────────────────────
  const toMg = (intake) => {
    const d = parseFloat(intake.dosage) || 0;
    return intake.unit === "ml" ? d * 20 : d;
  };
  const computeStats = (dayIntakes) => {
    const ah = dayIntakes.filter((i) => i.patientId === "AH");
    const ei = dayIntakes.filter((i) => i.patientId === "EI");
    return {
      totalMg:  Math.round(dayIntakes.reduce((s, i) => s + toMg(i), 0)),
      ahMg:     Math.round(ah.reduce((s, i) => s + toMg(i), 0)),
      eiMg:     Math.round(ei.reduce((s, i) => s + toMg(i), 0)),
      ahCount:  ah.length,
      eiCount:  ei.length,
      avgCount: Math.round((ah.length + ei.length) / 2),
    };
  };

  // ── Toggle expanded ───────────────────────────────────────────────────────
  const toggleDay = (key) =>
    setExpandedDays((prev) => ({ ...prev, [key]: prev[key] === "detail" ? undefined : "detail" }));

  const todayKey = getStartOfDay(new Date()).toLocaleDateString("uk-UA");
  const totalContentW = 16 + allDays.length * CARD_STRIDE + TRAIL_CARDS * CARD_STRIDE + 16;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={scrollRef}
      className="flex-grow overflow-x-auto overflow-y-hidden"
      onScroll={handleScroll}
      style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
    >
      <style>{`
        .cal-scroll-inner::-webkit-scrollbar { display: none; }
        @keyframes calFadeIn {
          from { opacity:0; transform:translateY(3px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes calPing {
          0%,100% { transform:scale(1); opacity:0.4; }
          50%     { transform:scale(1.5); opacity:0; }
        }
      `}</style>

      <div
        className="cal-scroll-inner relative flex items-center h-full"
        style={{ width: `${totalContentW}px`, minWidth: "100%", padding: "0 16px" }}
      >
        {/* Continuous horizontal line through dots */}
        {allDays.length > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: "calc(50% - 14px)",
              left: 16,
              width: `${allDays.length * CARD_STRIDE}px`,
              height: "2px",
              background: "var(--timeline-line)",
              opacity: 0.4,
            }}
          />
        )}

        {allDays.map((day, index) => {
          const { key, hasIntakes, intakes: dayIntakes, date } = day;
          const isToday = key === todayKey;
          const isExpanded = expandedDays[key] === "detail";
          const isPressed = pressedKey === key;
          const scale = scales[index] ?? 1;
          const stats = hasIntakes ? computeStats(dayIntakes) : null;
          const dayLabel = date.toLocaleDateString("uk-UA", { day: "numeric", month: "numeric" });

          if (!hasIntakes) {
            // Inactive grey day
            return (
              <div
                key={key}
                ref={(el) => { cardRefs.current[index] = { current: el }; }}
                className="relative flex flex-col items-center flex-shrink-0"
                style={{
                  width: `${CARD_W}px`,
                  marginRight: `${CARD_GAP}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "center bottom",
                  transition: "transform 0.15s ease-out",
                  willChange: "transform",
                }}
              >
                <span
                  className="text-[8px] font-semibold text-center select-none"
                  style={{ color: "var(--text-secondary)", opacity: 0.22, marginBottom: 6 }}
                >
                  {dayLabel}
                </span>
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--text-secondary)",
                    opacity: 0.15,
                  }}
                />
              </div>
            );
          }

          // Active day card
          return (
            <div
              key={key}
              ref={(el) => { cardRefs.current[index] = { current: el }; }}
              className="relative flex flex-col items-center flex-shrink-0 cursor-pointer select-none"
              style={{
                width: `${CARD_W}px`,
                marginRight: `${CARD_GAP}px`,
                transform: `scale(${isPressed ? scale * 0.91 : scale})`,
                transformOrigin: "center bottom",
                transition: isPressed
                  ? "transform 0.08s ease-out"
                  : "transform 0.18s cubic-bezier(0.34,1.4,0.64,1)",
                willChange: "transform",
                zIndex: Math.round(scale * 10),
              }}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setPressedKey(key); }}
              onPointerUp={() => { setPressedKey(null); toggleDay(key); }}
              onPointerLeave={() => setPressedKey(null)}
              onPointerCancel={() => setPressedKey(null)}
            >
              {/* Date label */}
              <span
                className="text-[9px] font-black text-center select-none leading-tight"
                style={{
                  color: isToday ? "var(--accent-ah)" : "var(--text-primary)",
                  opacity: isToday ? 1 : 0.85,
                  marginBottom: 4,
                  textShadow: isToday ? "0 0 10px var(--accent-ah)" : "none",
                  transition: "text-shadow 0.3s ease",
                }}
              >
                {dayLabel}
              </span>

              {/* Dot */}
              <div
                style={{
                  position: "relative",
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: isToday ? "var(--accent-ah)" : "var(--accent-primary)",
                  boxShadow: isToday
                    ? "0 0 12px var(--accent-ah), 0 0 24px var(--accent-ah)"
                    : "0 0 7px var(--accent-primary)",
                  zIndex: 10,
                  flexShrink: 0,
                  transition: "box-shadow 0.3s ease",
                }}
              >
                {/* Pulse ring on today */}
                {isToday && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -3,
                      borderRadius: "50%",
                      border: "1.5px solid var(--accent-ah)",
                      opacity: 0,
                      animation: "calPing 2s ease-in-out infinite",
                    }}
                  />
                )}
              </div>

              {/* Stats */}
              <div
                className="flex flex-col items-center"
                style={{ marginTop: 5, minHeight: 52 }}
              >
                {!isExpanded ? (
                  <div style={{ animation: "calFadeIn 0.18s ease both" }} className="flex flex-col items-center">
                    <span
                      className="text-[10px] font-black text-center leading-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {stats.totalMg}&thinsp;mg
                    </span>
                    <span
                      className="text-[8px] font-semibold text-center leading-tight mt-0.5"
                      style={{ color: "var(--text-secondary)", opacity: 0.6 }}
                    >
                      ~{stats.avgCount}&thinsp;пр.
                    </span>
                  </div>
                ) : (
                  <div style={{ animation: "calFadeIn 0.18s ease both" }} className="flex flex-col items-center">
                    <span
                      className="text-[9px] font-black text-center leading-tight"
                      style={{ color: "var(--accent-ah)" }}
                    >
                      AH&thinsp;{stats.ahMg}&thinsp;mg
                    </span>
                    <span
                      className="text-[8px] font-semibold text-center"
                      style={{ color: "var(--accent-ah)", opacity: 0.65 }}
                    >
                      {stats.ahCount}&thinsp;пр.
                    </span>
                    <span
                      className="text-[9px] font-black text-center leading-tight mt-1"
                      style={{ color: "var(--accent-ei)" }}
                    >
                      EI&thinsp;{stats.eiMg}&thinsp;mg
                    </span>
                    <span
                      className="text-[8px] font-semibold text-center"
                      style={{ color: "var(--accent-ei)", opacity: 0.65 }}
                    >
                      {stats.eiCount}&thinsp;пр.
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Trailing spacer so last day can reach viewport centre */}
        {Array.from({ length: TRAIL_CARDS }).map((_, i) => (
          <div
            key={`trail-${i}`}
            className="flex-shrink-0"
            style={{ width: CARD_W, marginRight: CARD_GAP }}
          />
        ))}

        {allDays.length === 0 && (
          <div
            className="flex items-center justify-center w-full text-xs"
            style={{ color: "var(--text-secondary)", opacity: 0.35 }}
          >
            Немає даних
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
