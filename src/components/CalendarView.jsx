import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { getStartOfDay } from "../utils/time";

/**
 * CalendarView — horizontal scrollable calendar strip.
 *
 * • All days from the first intake to today are shown.
 * • Days with intakes: colored dot on the line, date above, stats below.
 * • Days without intakes: grey, non-interactive, date only.
 * • A continuous horizontal line runs through all dots.
 * • Click on an active day card to toggle total ↔ AH/EI detail.
 * • Scrolling updates the header month/year label.
 * • Left/right arrows scroll to the last day of prev/next month.
 */
const CalendarView = ({ onMonthChange, scrollToNextMonth, scrollToPrevMonth }) => {
  const [intakes, setIntakes] = useState([]);
  const scrollRef = useRef(null);
  // key → "detail" | undefined (total is default)
  const [expandedDays, setExpandedDays] = useState({});

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

  // Group meaningful intakes by day key
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

  // Build full range: every day from first intake day to today
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

  // cardRefs indexed by allDays
  const cardRefs = useRef([]);
  useEffect(() => {
    cardRefs.current = allDays.map((_, i) => cardRefs.current[i] || { current: null });
  }, [allDays]);

  // ── Month heading ─────────────────────────────────────────────────────────
  const updateMonthHeading = useCallback(() => {
    if (!scrollRef.current || !allDays.length) return;
    const containerRect = scrollRef.current.getBoundingClientRect();
    const containerLeft = containerRect.left;
    let activeIndex = 0;
    cardRefs.current.forEach((ref, idx) => {
      if (!ref?.current) return;
      const rect = ref.current.getBoundingClientRect();
      if (rect.left - containerLeft <= 32) activeIndex = idx;
    });
    const activeDay = allDays[activeIndex];
    if (activeDay && onMonthChange) {
      const label = activeDay.date.toLocaleDateString("uk-UA", {
        month: "long",
        year: "numeric",
      });
      onMonthChange(label.charAt(0).toUpperCase() + label.slice(1));
    }
  }, [allDays, onMonthChange]);

  useEffect(() => {
    updateMonthHeading();
  }, [updateMonthHeading, allDays]);

  // ── Scroll to next/prev month ─────────────────────────────────────────────
  const getActiveIndex = useCallback(() => {
    if (!scrollRef.current || !allDays.length) return 0;
    const containerLeft = scrollRef.current.getBoundingClientRect().left;
    let activeIndex = 0;
    cardRefs.current.forEach((ref, idx) => {
      if (!ref?.current) return;
      const rect = ref.current.getBoundingClientRect();
      if (rect.left - containerLeft <= 32) activeIndex = idx;
    });
    return activeIndex;
  }, [allDays]);

  const handleScrollToNextMonth = useCallback(() => {
    const activeIndex = getActiveIndex();
    const currentMonth = allDays[activeIndex]?.date.getMonth();
    const currentYear = allDays[activeIndex]?.date.getFullYear();
    // Find first day of next month, then find the last day of that next month
    let nextMonthStart = -1;
    for (let i = activeIndex + 1; i < allDays.length; i++) {
      const d = allDays[i].date;
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
        nextMonthStart = i;
        break;
      }
    }
    if (nextMonthStart < 0) return;
    const nextMonth = allDays[nextMonthStart].date.getMonth();
    const nextYear = allDays[nextMonthStart].date.getFullYear();
    // Find last day of that month
    let lastIdx = nextMonthStart;
    for (let i = nextMonthStart; i < allDays.length; i++) {
      const d = allDays[i].date;
      if (d.getMonth() === nextMonth && d.getFullYear() === nextYear) lastIdx = i;
      else break;
    }
    cardRefs.current[lastIdx]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "end",
    });
  }, [allDays, getActiveIndex]);

  const handleScrollToPrevMonth = useCallback(() => {
    const activeIndex = getActiveIndex();
    const currentMonth = allDays[activeIndex]?.date.getMonth();
    const currentYear = allDays[activeIndex]?.date.getFullYear();
    // Find last day of previous month
    let targetIdx = -1;
    for (let i = activeIndex - 1; i >= 0; i--) {
      const d = allDays[i].date;
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx < 0) return;
    cardRefs.current[targetIdx]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "end",
    });
  }, [allDays, getActiveIndex]);

  useEffect(() => {
    if (scrollToNextMonth) scrollToNextMonth.current = handleScrollToNextMonth;
  }, [scrollToNextMonth, handleScrollToNextMonth]);

  useEffect(() => {
    if (scrollToPrevMonth) scrollToPrevMonth.current = handleScrollToPrevMonth;
  }, [scrollToPrevMonth, handleScrollToPrevMonth]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toMg = (intake) => {
    const d = parseFloat(intake.dosage) || 0;
    return intake.unit === "ml" ? d * 20 : d;
  };

  const computeStats = (dayIntakes) => {
    const ahIntakes = dayIntakes.filter((i) => i.patientId === "AH");
    const eiIntakes = dayIntakes.filter((i) => i.patientId === "EI");
    return {
      totalMg: Math.round(dayIntakes.reduce((s, i) => s + toMg(i), 0)),
      ahMg: Math.round(ahIntakes.reduce((s, i) => s + toMg(i), 0)),
      eiMg: Math.round(eiIntakes.reduce((s, i) => s + toMg(i), 0)),
      ahCount: ahIntakes.length,
      eiCount: eiIntakes.length,
      avgCount: Math.round((ahIntakes.length + eiIntakes.length) / 2),
    };
  };

  // Scroll to today on first data load
  const scrolledToEnd = useRef(false);
  useEffect(() => {
    if (allDays.length > 0 && !scrolledToEnd.current) {
      const lastRef = cardRefs.current[allDays.length - 1];
      if (lastRef?.current) {
        scrolledToEnd.current = true;
        setTimeout(() => {
          lastRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "end",
          });
        }, 80);
      }
    }
  }, [allDays.length]);

  // ── Toggle expanded ───────────────────────────────────────────────────────
  const toggleDay = (key) => {
    setExpandedDays((prev) => ({
      ...prev,
      [key]: prev[key] === "detail" ? undefined : "detail",
    }));
  };

  // Card width and layout constants
  const CARD_W = 72;
  const todayKey = getStartOfDay(new Date()).toLocaleDateString("uk-UA");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={scrollRef}
      className="flex-grow overflow-x-auto overflow-y-hidden"
      onScroll={updateMonthHeading}
      style={{
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}
    >
      <style>{`.cal-scroll::-webkit-scrollbar{display:none}`}</style>
      <div
        className="relative flex items-center h-full"
        style={{
          width: `${allDays.length * CARD_W + 32}px`,
          minWidth: "100%",
          padding: "0 16px",
        }}
      >
        {/* Continuous horizontal line through all dots */}
        {allDays.length > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: "calc(50% - 12px)", // align with dot center
              left: "16px",
              right: "16px",
              height: "2px",
              background: "var(--timeline-line)",
              opacity: 0.45,
            }}
          />
        )}

        {allDays.map((day, index) => {
          const { key, hasIntakes, intakes: dayIntakes, date } = day;
          const isToday = key === todayKey;
          const isExpanded = expandedDays[key] === "detail";
          const stats = hasIntakes ? computeStats(dayIntakes) : null;

          const dayLabel = date.toLocaleDateString("uk-UA", {
            day: "numeric",
            month: "numeric",
          });

          if (!hasIntakes) {
            // ── Inactive / grey day ──────────────────────────────────────
            return (
              <div
                key={key}
                ref={(el) => { cardRefs.current[index] = { current: el }; }}
                className="relative flex flex-col items-center flex-shrink-0"
                style={{ width: `${CARD_W}px` }}
              >
                {/* Date label above the line */}
                <span
                  className="text-[8px] font-semibold text-center mb-1"
                  style={{ color: "var(--text-secondary)", opacity: 0.3 }}
                >
                  {dayLabel}
                </span>

                {/* Small grey dot on the line */}
                <div
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: "6px",
                    height: "6px",
                    background: "var(--text-secondary)",
                    opacity: 0.2,
                  }}
                />
              </div>
            );
          }

          // ── Active day ────────────────────────────────────────────────
          return (
            <div
              key={key}
              ref={(el) => { cardRefs.current[index] = { current: el }; }}
              className="relative flex flex-col items-center flex-shrink-0 cursor-pointer select-none active:opacity-70 transition-opacity"
              style={{ width: `${CARD_W}px` }}
              onClick={() => toggleDay(key)}
            >
              {/* Date above dot */}
              <span
                className="text-[9px] font-black text-center mb-1"
                style={{
                  color: isToday ? "var(--accent-ah)" : "var(--text-primary)",
                  opacity: isToday ? 1 : 0.8,
                }}
              >
                {dayLabel}
              </span>

              {/* Filled dot on the line */}
              <div
                className="relative z-10 rounded-full flex-shrink-0"
                style={{
                  width: "14px",
                  height: "14px",
                  background: isToday
                    ? "var(--accent-ah)"
                    : "var(--accent-primary)",
                  boxShadow: isToday
                    ? "0 0 8px var(--accent-ah)"
                    : "0 0 5px var(--accent-primary)",
                }}
              />

              {/* Stats below dot */}
              <div
                className="mt-1.5 flex flex-col items-center"
                style={{ minHeight: "48px" }}
              >
                {!isExpanded ? (
                  <>
                    <span
                      className="text-[10px] font-black text-center leading-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {stats.totalMg} mg
                    </span>
                    <span
                      className="text-[8px] font-semibold text-center leading-tight mt-0.5"
                      style={{ color: "var(--text-secondary)", opacity: 0.65 }}
                    >
                      ~{stats.avgCount} прийомів
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="text-[9px] font-black text-center leading-tight"
                      style={{ color: "var(--accent-ah)" }}
                    >
                      AH {stats.ahMg} mg
                    </span>
                    <span
                      className="text-[8px] font-semibold text-center leading-tight"
                      style={{ color: "var(--accent-ah)", opacity: 0.7 }}
                    >
                      {stats.ahCount} пр.
                    </span>
                    <span
                      className="text-[9px] font-black text-center leading-tight mt-0.5"
                      style={{ color: "var(--accent-ei)" }}
                    >
                      EI {stats.eiMg} mg
                    </span>
                    <span
                      className="text-[8px] font-semibold text-center leading-tight"
                      style={{ color: "var(--accent-ei)", opacity: 0.7 }}
                    >
                      {stats.eiCount} пр.
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {allDays.length === 0 && (
          <div
            className="flex items-center justify-center w-full text-xs"
            style={{ color: "var(--text-secondary)", opacity: 0.4 }}
          >
            Немає даних
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
