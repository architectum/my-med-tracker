import { useState } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { formatTime, getStartOfDay } from '../utils/time';

const UNIT_CONFIG = {
  mg: { min: 1, max: 250, step: 1, default: 50, label: 'мг' },
  ml: { min: 0.1, max: 5.0, step: 0.1, default: 0.5, label: 'мл' }
};

const SUBTYPE_OPTIONS = [
  { value: 'IV', label: 'IV', icon: '💧', color: '#4FC3F7' },
  { value: 'IM', label: 'IM', icon: '💉', color: '#BA68C8' },
  { value: 'PO', label: 'PO', icon: '💊', color: '#FFB74D' },
  { value: 'IV+PO', label: 'IV+PO', icon: '💧💊', color: '#81C784' }
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
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="flex-1 backdrop-blur-md rounded-[2rem] p-3 shadow-lg border border-[var(--border)] relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--card-bg-start), var(--card-bg-end))' }}
    >
      <div
        className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${
          title === 'AH' ? 'bg-[var(--accent-ah)]' : 'bg-[var(--accent-ei)]'
        }`}
      >
        {title}
      </div>

      <div className="flex flex-col items-center mt-3">
        <div className="flex gap-2 mb-2">
          {['mg', 'ml'].map((u) => (
            <button
              key={u}
              onClick={() => handleUnitChange(u)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                unit === u
                  ? u === 'mg'
                    ? 'bg-[var(--accent-ah)] text-white'
                    : 'bg-[var(--accent-ei)] text-white'
                  : 'bg-black/5 text-[var(--text-secondary)]'
              }`}
            >
              {u.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-1.5 w-full mb-3">
          {SUBTYPE_OPTIONS.map((option) => {
            const isActive = subtype === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSubtype(option.value)}
                className={`flex flex-col items-center justify-center rounded-xl border text-[9px] font-bold leading-tight transition-all ${
                  isActive ? 'text-white' : 'text-[var(--text-secondary)]'
                }`}
                style={
                  isActive
                    ? { backgroundColor: option.color, borderColor: option.color }
                    : {
                        background: 'linear-gradient(135deg, var(--card-bg-start), var(--card-bg-end))',
                        borderColor: 'var(--border)'
                      }
                }
              >
                <span className="text-sm leading-none">{option.icon}</span>
                <span className="text-[8px] font-black tracking-wide">{option.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between w-full px-2 mb-4">
          <button
            onClick={() => adjustDosage(-1)}
            className="w-9 h-9 rounded-full bg-black/5 text-[var(--text-primary)] text-lg flex items-center justify-center"
          >
            -
          </button>
          <div className="text-center">
            <span className="text-3xl font-black text-[var(--text-primary)] leading-none">{currentDosage}</span>
            <span className="text-sm font-bold text-[var(--text-secondary)] ml-1">{UNIT_CONFIG[unit].label}</span>
          </div>
          <button
            onClick={() => adjustDosage(1)}
            className="w-9 h-9 rounded-full bg-black/5 text-[var(--text-primary)] text-lg flex items-center justify-center"
          >
            +
          </button>
        </div>

        <input
          type="range"
          min={UNIT_CONFIG[unit].min}
          max={UNIT_CONFIG[unit].max}
          step={UNIT_CONFIG[unit].step}
          value={currentDosage}
          onChange={(e) => setCurrentDosage(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer mb-6"
          style={{ background: 'linear-gradient(90deg, var(--accent-ah) 0%, var(--accent-ei) 100%)' }}
        />

        <div className="w-full space-y-2">
          <button
            onClick={() => (isSelectingTime ? onCancelTimeSelection(title) : onStartTimeSelection(title))}
            className="w-full py-2 rounded-xl text-[var(--text-secondary)] text-xs font-semibold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--card-bg-start), var(--card-bg-end))' }}
          >
            {isSelectingTime ? (
              selectedTime ? (
                <span className="flex items-center gap-2">
                  {`${formatTime(selectedTime)}${selectedDateLabel}`}
                  <span className="text-red-500 text-base leading-none">✕</span>
                </span>
              ) : (
                'Відміна'
              )
            ) : (
              'Вказати час'
            )}
          </button>

          <button
            onClick={handleAddIntake}
            disabled={isAddDisabled}
            className={`w-full py-3 rounded-2xl bg-gradient-to-r from-[var(--accent-ah)] to-[var(--accent-ei)] text-white font-bold text-lg shadow-md transition-transform ${
              isAddDisabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
            }`}
          >
            + Додати
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedTrackerCard;
