import { useState } from 'react';
import { GiWaterDrop } from 'react-icons/gi';
import { FaSyringe, FaPills, FaRegClock } from 'react-icons/fa6';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { formatTime, getStartOfDay } from '../utils/time';
import SyringeSlider from './SyringeSlider';

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

const UNIT_CONFIG = {
  mg: { min: 0, max: 100, step: 1, default: 0, label: 'мг' },
  ml: { min: 0, max: 5.0, step: 0.1, default: 0, label: 'мл' }
};

const SUBTYPE_OPTIONS = [
  { value: 'IV', label: 'IV', icon: GiWaterDrop, color: '#3b82f6' }, // Blue
  { value: 'IM', label: 'IM', icon: FaSyringe, color: '#a855f7' },   // Purple
  { value: 'PO', label: 'PO', icon: FaPills, color: '#f59e0b' },     // Amber/Orange
  { value: 'IV+PO', label: 'IV+PO', icon: GiWaterDrop, color: '#22c55e' } // Green
];

const getDefaultSubtype = (title) => {
  if (title === 'AH') return 'IM';
  if (title === 'EI') return 'IV';
  return '';
};

const MedTrackerCard = ({
  title,
  onAddSuccess,
  isSelectingTime,
  selectedTime,
  onStartTimeSelection,
  onCancelTimeSelection,
  onResetTimeSelection
}) => {
  const [unit, setUnit] = useState('mg');
  const [currentDosage, setCurrentDosage] = useState(UNIT_CONFIG.mg.default);
  const [subtype, setSubtype] = useState(() => getDefaultSubtype(title));
  
  const isAddDisabled = isSelectingTime && !selectedTime;
  const isSelectedToday = selectedTime
    ? getStartOfDay(selectedTime).getTime() === getStartOfDay(new Date()).getTime()
    : false;
  const selectedDateLabel = selectedTime && !isSelectedToday
    ? ` ${selectedTime.toLocaleDateString('uk-UA')}`
    : '';

  const activeSubtypeConfig = SUBTYPE_OPTIONS.find(o => o.value === subtype);
  const activeColor = activeSubtypeConfig ? activeSubtypeConfig.color : (title === 'AH' ? '#22c55e' : '#3b82f6');

  const handleUnitChange = (newUnit) => {
    setUnit(newUnit);
    setCurrentDosage(UNIT_CONFIG[newUnit].default);
  };

  const adjustDosage = (delta) => {
    setCurrentDosage((prev) => {
      const config = UNIT_CONFIG[unit];
      const nextVal = Math.round((prev + delta * config.step) * 10) / 10;
      return Math.min(Math.max(nextVal, config.min), config.max);
    });
  };

  const handleAddIntake = async () => {
    const intakeTimestamp = isSelectingTime && selectedTime ? selectedTime : new Date();
    try {
      await addDoc(collection(db, 'intakes'), {
        patientId: title,
        dosage: currentDosage,
        unit: unit,
        subtype: subtype || null,
        timestamp: Timestamp.fromDate(intakeTimestamp),
        createdAt: Timestamp.now()
      });
      onAddSuccess(`${title}: Додано ${currentDosage} ${unit}`);
      onResetTimeSelection(title);
      setCurrentDosage(0);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 rounded-[2rem] overflow-hidden border border-[var(--border)] shadow-soft-strong">
      {/* Dark header like in screen.png */}
      <div
        className="p-4 pb-10"
        style={{ background: 'var(--header-overlay)' }}
      >
        <div className="flex items-center justify-between">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-[var(--action-bg)] font-extrabold text-lg"
            style={{
              background: 'var(--success-color)',
              boxShadow: '0 0 18px var(--success-color)'
            }}
          >
            {title}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/60">MG/ML</span>
            <div
              className="flex items-center rounded-full p-1 border"
              style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
            >
              {['mg', 'ml'].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => handleUnitChange(u)}
                  className="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide transition"
                  style={
                    unit === u
                      ? { background: 'rgba(255,255,255,0.14)', color: 'white' }
                      : { color: 'rgba(255,255,255,0.70)' }
                  }
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subtypes row */}
        <div className="mt-5 flex justify-between">
          {SUBTYPE_OPTIONS.map((option) => {
            const isActive = subtype === option.value;
            const Icon = option.icon;
            const glow = `0 0 18px ${hexToRgba(option.color, 0.35)}`;
            const chipBg = `linear-gradient(135deg, ${hexToRgba(option.color, 0.22)}, ${hexToRgba(option.color, 0.08)})`;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSubtype(option.value)}
                className="flex flex-col items-center gap-1 transition-opacity"
                style={{ opacity: isActive ? 1 : 0.45 }}
              >
                <div
                  className="w-12 h-12 rounded-xl border flex items-center justify-center"
                  style={
                    isActive
                      ? { borderColor: option.color, background: chipBg, boxShadow: glow, color: option.color }
                      : { borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.65)' }
                  }
                >
                  <span className="flex items-center gap-0.5">
                    <Icon className="text-xl" />
                    {option.value === 'IV+PO' && <FaPills className="text-[10px]" />}
                  </span>
                </div>
                <span className="text-[10px] font-bold" style={{ color: isActive ? option.color : 'rgba(255,255,255,0.50)' }}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Light body */}
      <div
        className="-mt-6 rounded-t-[2rem] p-5 pt-7 flex flex-col gap-6 shadow-soft"
        style={{ background: 'var(--surface-2)' }}
      >
        {/* Dosage Control */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => adjustDosage(-1)}
            className="w-12 h-12 rounded-2xl text-xl font-black flex items-center justify-center active:scale-95 transition"
            style={{ background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 10px 18px var(--shadow-color)' }}
            aria-label="Decrease dosage"
          >
            −
          </button>

          <div className="flex items-end gap-1">
            <span className="text-5xl font-black tracking-tight text-[var(--text-primary)]">{currentDosage}</span>
            <span className="text-lg font-extrabold mb-2" style={{ color: 'var(--text-secondary)', opacity: 0.55 }}>
              {UNIT_CONFIG[unit].label}
            </span>
          </div>

          <button
            type="button"
            onClick={() => adjustDosage(1)}
            className="w-12 h-12 rounded-2xl text-xl font-black flex items-center justify-center active:scale-95 transition"
            style={{ background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 10px 18px var(--shadow-color)' }}
            aria-label="Increase dosage"
          >
            +
          </button>
        </div>

        {/* Slider */}
        <div>
          <SyringeSlider
            value={currentDosage}
            onChange={setCurrentDosage}
            min={UNIT_CONFIG[unit].min}
            max={UNIT_CONFIG[unit].max}
            step={UNIT_CONFIG[unit].step}
            color={activeColor}
            className="h-16"
          />
        </div>

        {/* Time Selection */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => (isSelectingTime ? onCancelTimeSelection(title) : onStartTimeSelection(title))}
            className="text-[10px] font-black uppercase tracking-[0.22em] transition"
            style={{ color: 'var(--text-secondary)', opacity: 0.75 }}
          >
            {isSelectingTime ? (selectedTime ? 'Змінити час' : 'Скасувати') : 'Вказати час'}
          </button>

          <div
            className="px-4 py-2 rounded-xl"
            style={{ background: hexToRgba(activeColor, 0.10) }}
          >
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black" style={{ color: activeColor }}>
                {isSelectingTime && selectedTime ? formatTime(selectedTime) : formatTime(new Date())}
              </span>
              <FaRegClock className="text-base" style={{ color: activeColor, opacity: 0.75 }} />
            </div>
            {isSelectingTime && selectedTime && selectedDateLabel && (
              <div className="text-center text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                {selectedDateLabel}
              </div>
            )}
          </div>
        </div>

        {/* Add Button */}
        <button
          type="button"
          onClick={handleAddIntake}
          disabled={isAddDisabled}
          className="w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--action-bg)',
            color: 'var(--success-color)',
            border: '1px solid var(--action-border)',
            boxShadow: '0 18px 40px var(--shadow-color-strong), 0 0 18px var(--success-color)'
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <span className="text-2xl leading-none">+</span>
            Додати
          </span>
        </button>
      </div>
    </div>
  );
};

export default MedTrackerCard;
