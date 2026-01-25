import { useState } from 'react';
import { GiWaterDrop } from 'react-icons/gi';
import { FaSyringe, FaPills, FaRegClock } from 'react-icons/fa6';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { formatTime, getStartOfDay } from '../utils/time';
import SyringeSlider from './SyringeSlider';
import AddIntakeButton from './AddIntakeButton';
import SubtypeSelector from './SubtypeSelector';

const UNIT_CONFIG = {
  mg: { min: 0, max: 100, step: 1, default: 0, label: 'мг' },
  ml: { min: 0, max: 5.0, step: 0.1, default: 0, label: 'мл' }
};

const SUBTYPE_OPTIONS = [
  { value: 'IV', label: 'IV', icon: GiWaterDrop },
  { value: 'IM', label: 'IM', icon: FaSyringe },
  { value: 'PO', label: 'PO', icon: FaPills },
  { value: 'IV+PO', label: 'IV+PO', icon: GiWaterDrop }
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

  const activeColor =
    subtype === 'IV'
      ? 'var(--subtype-iv)'
      : subtype === 'IM'
        ? 'var(--subtype-im)'
        : subtype === 'PO'
          ? 'var(--subtype-po)'
          : subtype === 'IV+PO'
            ? 'var(--subtype-ivpo)'
            : title === 'AH'
              ? 'var(--accent-ah)'
              : 'var(--accent-ei)';

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
        <SubtypeSelector value={subtype} onChange={setSubtype} options={SUBTYPE_OPTIONS} />
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
            style={{ background: `color-mix(in srgb, ${activeColor} 12%, transparent)` }}
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
        <AddIntakeButton onClick={handleAddIntake} disabled={isAddDisabled} />
      </div>
    </div>
  );
};

export default MedTrackerCard;
