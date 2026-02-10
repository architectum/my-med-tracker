import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GiWaterDrop } from 'react-icons/gi';
import { FaSyringe, FaPills } from 'react-icons/fa6';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { formatTime, formatViewedDate, getStartOfDay } from '../utils/time';

const SUBTYPE_COLORS = {
  IV: '#4FC3F7',
  IM: '#BA68C8',
  PO: '#FFB74D',
  'IV+PO': '#81C784'
};

const ZOOM_LEVELS = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 5, label: '5x' }
];

const DEFAULT_DAY_HEIGHT = 640; // Default 1 day height in pixels

const TimelineHistory = ({ onDayChange, selectedId, onSelectIntake, isSelectingTime, onTimeSelected }) => {
  const [intakes, setIntakes] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoverLine, setHoverLine] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [zoom, setZoom] = useState(1);
  const isPointerDown = useRef(false);
  const scrollRef = useRef(null);
  const dayRefs = useRef([]);

  useEffect(() => {
    const q = query(collection(db, 'intakes'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setIntakes(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }))
      );
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isSelectingTime) return;
    if (selectedLine) return;
    const now = new Date();
    setSelectedLine({ date: getStartOfDay(now), mins: now.getHours() * 60 + now.getMinutes() });
  }, [isSelectingTime, selectedLine]);

  const groupedByDay = useMemo(() => {
    const groups = {};
    const today = getStartOfDay(new Date());
    groups[today.toLocaleDateString('uk-UA')] = { date: today, intakes: [] };

    intakes.forEach((intake) => {
      const dateStr = getStartOfDay(intake.timestamp).toLocaleDateString('uk-UA');
      if (!groups[dateStr]) groups[dateStr] = { date: getStartOfDay(intake.timestamp), intakes: [] };
      groups[dateStr].intakes.push(intake);
    });

    return Object.values(groups).sort((a, b) => b.date - a.date);
  }, [intakes]);

  const sortedDays = useMemo(() => groupedByDay, [groupedByDay]);

  const dayHeight = DEFAULT_DAY_HEIGHT * zoom;

  useEffect(() => {
    dayRefs.current = sortedDays.map((_, idx) => dayRefs.current[idx] || { current: null });
  }, [sortedDays]);

  const updateCurrentDayHeading = useCallback(() => {
    if (!scrollRef.current || !sortedDays.length) return;
    const containerTop = scrollRef.current.getBoundingClientRect().top;
    const headerOffset = 48;
    let activeIndex = 0;

    dayRefs.current.forEach((ref, idx) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const topOffset = rect.top - containerTop;
      if (topOffset <= headerOffset) {
        activeIndex = idx;
      }
    });

    const activeDay = sortedDays[activeIndex];
    if (activeDay) {
      onDayChange(formatViewedDate(activeDay.date));
    }
  }, [onDayChange, sortedDays]);

  useEffect(() => {
    updateCurrentDayHeading();
  }, [updateCurrentDayHeading, sortedDays]);

  const getTimeTop = (date) => {
    const mins = date.getHours() * 60 + date.getMinutes();
    return ((1440 - mins) / 1440) * 100;
  };

  const getTopFromMins = (mins) => ((1440 - mins) / 1440) * 100;

  const getMinutesFromPointer = (rect, clientY) => {
    const relative = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    const ratio = 1 - relative / rect.height;
    return Math.round(ratio * 1440);
  };

  const getDayFromPointer = (clientY) => {
    if (!dayRefs.current.length) return null;
    for (let i = 0; i < dayRefs.current.length; i += 1) {
      const ref = dayRefs.current[i]?.current;
      if (!ref) continue;
      const rect = ref.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return { day: sortedDays[i], rect };
      }
    }
    return null;
  };

  const updateHoverFromPointer = (clientY) => {
    const target = getDayFromPointer(clientY);
    if (!target) return;
    const mins = getMinutesFromPointer(target.rect, clientY);
    setHoverLine({ date: target.day.date, mins });
  };

  const updateSelectionFromPointer = (clientY) => {
    const target = getDayFromPointer(clientY);
    if (!target) return;
    const mins = getMinutesFromPointer(target.rect, clientY);
    const selectedDate = new Date(target.day.date);
    selectedDate.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    setSelectedLine({ date: target.day.date, mins });
    onTimeSelected(selectedDate);
  };

  const handlePointerMove = (e) => {
    if (!e.clientY) return;
    updateHoverFromPointer(e.clientY);
    if (isPointerDown.current) {
      updateSelectionFromPointer(e.clientY);
    }
  };

  const handlePointerDown = (e) => {
    isPointerDown.current = true;
    updateSelectionFromPointer(e.clientY);
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
  };

  useEffect(() => {
    const handleWindowUp = () => {
      isPointerDown.current = false;
    };
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
    return () => {
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };
  }, []);

  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
  };

  return (
    <>
      {/* Zoom Controls */}
      <div className="flex justify-center gap-1 px-4 pb-2">
        {ZOOM_LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => handleZoomChange(level.value)}
            className={`px-2 py-1 text-xs font-bold rounded-lg transition-all duration-200 ${
              zoom === level.value
                ? 'bg-[var(--accent-ei)] text-white shadow-lg shadow-[var(--accent-ei)]/30'
                : 'bg-[var(--card-bg-start)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="flex-grow overflow-y-auto custom-scrollbar px-2 pb-20"
        onClick={() => onSelectIntake(null)}
        onScroll={updateCurrentDayHeading}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div className="relative">
          {sortedDays.map((day, index) => (
            <div
              key={day.date.getTime()}
              ref={(el) => {
                dayRefs.current[index] = { current: el };
              }}
              className="relative"
              style={{
                height: `${dayHeight}px`,
                background: `linear-gradient(180deg, ${
                  index % 2 === 0 ? 'var(--timeline-bg-start)' : 'var(--timeline-bg-alt-start)'
                }, ${index % 2 === 0 ? 'var(--timeline-bg-end)' : 'var(--timeline-bg-alt-end)'})`
              }}
            >
              {/* Markers - z-index 1 (lowest layer) */}
              {[...Array(24 * 6)].map((_, i) => {
                const mins = i * 10;
                const top = ((1440 - mins) / 1440) * 100;
                const isMajor = mins % 180 === 0;
                const markerSpacing = zoom >= 3 ? 12 : zoom >= 2 ? 8 : isMajor ? 6 : 3;
                return (
                  <div 
                    key={i} 
                    className="absolute left-1/2 flex items-center" 
                    style={{ top: `${top}%`, zIndex: 1 }}
                  >
                    <div className={`h-px bg-[var(--marker-color)] opacity-40`} style={{ width: `${markerSpacing}px` }} />
                    {isMajor && (
                      <span className={`text-[8px] font-bold text-[var(--marker-color)] opacity-70 ml-1`}>
                        {String(Math.floor(mins / 60)).padStart(2, '0')}:00
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Central Line - z-index 2 */}
              <div 
                className="absolute left-1/2 top-0 bottom-0 w-1 bg-[var(--timeline-line)] -translate-x-1/2 opacity-70 shadow-[0_0_8px_var(--timeline-line)]" 
                style={{ zIndex: 2 }}
              />

              {/* Current Time Line - z-index 30 */}
              {getStartOfDay(currentTime).getTime() === day.date.getTime() && (
                <div 
                  className="absolute left-0 right-0 pointer-events-none" 
                  style={{ top: `${getTimeTop(currentTime)}%`, zIndex: 30 }}
                >
                  <div className="w-full h-0.5 bg-[var(--accent-ah)] opacity-60 shadow-[0_0_12px_var(--accent-ah)]" />
                  <div className="absolute right-0 -top-3 px-2 py-0.5 bg-[var(--accent-ah)] text-white text-[10px] font-bold rounded-l-lg shadow-lg">
                    {formatTime(currentTime)}
                  </div>
                </div>
              )}

              {/* Hover Line - z-index 15 */}
              {hoverLine && hoverLine.date.getTime() === day.date.getTime() && (
                <div 
                  className="absolute left-0 right-0 pointer-events-none" 
                  style={{ top: `${getTopFromMins(hoverLine.mins)}%`, zIndex: 15 }}
                >
                  <div className="w-full h-px bg-[var(--marker-color)] opacity-30" />
                  <div className="absolute right-0 -top-3 px-2 py-0.5 bg-[var(--marker-color)] text-[var(--text-primary)] text-[10px] font-bold rounded-l-md shadow-sm opacity-70">
                    {formatTime(new Date(day.date.getTime() + hoverLine.mins * 60000))}
                  </div>
                </div>
              )}

              {/* Selected Time Line - z-index 25 */}
              {isSelectingTime && selectedLine && selectedLine.date.getTime() === day.date.getTime() && (
                <div 
                  className="absolute left-0 right-0 pointer-events-none" 
                  style={{ top: `${getTopFromMins(selectedLine.mins)}%`, zIndex: 25 }}
                >
                  <div className="w-full h-0.5 bg-[var(--accent-ei)] opacity-90 shadow-[0_0_12px_var(--accent-ei)]" />
                  <div className="absolute right-0 -top-3 px-2 py-0.5 bg-[var(--accent-ei)] text-white text-[10px] font-bold rounded-l-lg shadow-lg">
                    {formatTime(new Date(day.date.getTime() + selectedLine.mins * 60000))}
                  </div>
                </div>
              )}

              {/* Intakes - z-index 20 (above lines, below current time) */}
              {day.intakes.map((intake) => {
                const isAH = intake.patientId === 'AH';
                const isSelected = selectedId === intake.id;
                const top = getTimeTop(intake.timestamp);
                const subtypeColor = intake.subtype ? SUBTYPE_COLORS[intake.subtype] : null;

                return (
                  <div
                    key={intake.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIntake(isSelected ? null : intake);
                    }}
                    className={`absolute flex items-center transition-all duration-300 cursor-pointer ${
                      isAH ? 'right-1/2 pr-3 justify-end' : 'left-1/2 pl-3'
                    } ${selectedId && !isSelected ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}
                    style={{ 
                      top: `${top}%`, 
                      transform: 'translateY(-50%)', 
                      width: '45%',
                      zIndex: 20
                    }}
                  >
                    {/* Colored Frame with Glow */}
                    <div
                      className={`flex flex-col ${
                        isAH ? 'items-end' : 'items-start'
                      } ${
                        isSelected 
                          ? 'p-2 rounded-xl' 
                          : 'p-1 rounded-lg'
                      } transition-all`}
                      style={{
                        border: subtypeColor ? `2px solid ${subtypeColor}` : `2px solid ${isAH ? 'var(--accent-ah)' : 'var(--accent-ei)'}`,
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : 'transparent',
                        boxShadow: isSelected 
                          ? `0 0 20px ${subtypeColor || (isAH ? 'var(--accent-ah)' : 'var(--accent-ei)')}, 0 0 40px ${subtypeColor || (isAH ? 'var(--accent-ah)' : 'var(--accent-ei)')}40, inset 0 0 20px rgba(255,255,255,0.1)`
                          : `0 0 8px ${subtypeColor || (isAH ? 'var(--accent-ah)' : 'var(--accent-ei)')}40`,
                        backdropFilter: isSelected ? 'blur(8px)' : 'none'
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span 
                          className={`${zoom >= 2 ? 'text-base' : 'text-sm'} font-bold drop-shadow-sm ${
                            isAH ? 'text-[var(--accent-ah)]' : 'text-[var(--accent-ei)]'
                          }`}
                        >
                          {intake.dosage}
                        </span>
                        <span className="text-[8px] font-bold text-[var(--text-secondary)]">{intake.unit}</span>
                        <span className={`${zoom >= 2 ? 'text-[10px]' : 'text-[8px]'} font-bold text-[var(--text-primary)] opacity-70`}>
                          {formatTime(intake.timestamp)}
                        </span>
                      </div>
                      {intake.subtype && (
                        <div 
                          className="mt-0.5 text-[7px] font-bold px-1.5 py-0.25 rounded text-white"
                          style={{ backgroundColor: subtypeColor }}
                        >
                          {intake.subtype}
                        </div>
                      )}
                    </div>
                    
                    {/* Connector dot */}
                    <div
                      className={`absolute w-2.5 h-2.5 rounded-full border-2 border-white shadow-md ${
                        isAH ? '-right-1' : '-left-1'
                      }`}
                      style={{ 
                        zIndex: 21,
                        backgroundColor: subtypeColor || (isAH ? 'var(--accent-ah)' : 'var(--accent-ei)'),
                        boxShadow: `0 0 10px ${subtypeColor || (isAH ? 'var(--accent-ah)' : 'var(--accent-ei)')}`
                      }}
                    />
                  </div>
                );
              })}

              {/* Day label - z-index 35 (highest, always visible) */}
              <div 
                className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none"
                style={{ zIndex: 35 }}
              >
                <span className={`${zoom >= 3 ? 'px-3 py-1' : 'px-2 py-0.5'} rounded-full bg-black/10 backdrop-blur-md text-[var(--text-secondary)] font-bold uppercase tracking-wider shadow-sm border border-white/10 ${
                  zoom >= 3 ? 'text-[10px]' : 'text-[8px]'
                }`}>
                  {formatViewedDate(day.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default TimelineHistory;
