import { useState, useRef } from 'react';
import { GiWaterDrop } from 'react-icons/gi';
import { FaSyringe, FaPills } from 'react-icons/fa6';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { formatTime, getStartOfDay } from '../utils/time';
import SyringeSlider from './SyringeSlider';

const UNIT_CONFIG = {
  mg: { min: 1, max: 250, step: 1, default: 50, label: 'мг' },
  ml: { min: 0.1, max: 5.0, step: 0.1, default: 0.5, label: 'мл' }
};

const SUBTYPE_OPTIONS = [
  { value: 'IV', label: 'IV', icon: GiWaterDrop, color: '#4FC3F7' },
  { value: 'IM', label: 'IM', icon: FaSyringe, color: '#BA68C8' },
  { value: 'PO', label: 'PO', icon: FaPills, color: '#FFB74D' },
  { value: 'IV+PO', label: 'IV+PO', icon: GiWaterDrop, color: '#81C784' }
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
  const [sliderValue, setSliderValue] = useState(0);
  const [subtype, setSubtype] = useState(() => getDefaultSubtype(title));
  const [isAdding, setIsAdding] = useState(false);
  const syringeRef = useRef(null);
  
  const isAddDisabled = isSelectingTime && !selectedTime;
  const isSelectedToday = selectedTime
    ? getStartOfDay(selectedTime).getTime() === getStartOfDay(new Date()).getTime()
    : false;
  const selectedDateLabel = selectedTime && !isSelectedToday
    ? ` ${selectedTime.toLocaleDateString('uk-UA')}`
    : '';

  // Calculate actual dosage from slider percentage
  const config = UNIT_CONFIG[unit];
  const currentDosage = Math.round((config.min + (sliderValue / 100) * (config.max - config.min)) * 10) / 10;

  const handleUnitChange = (newUnit) => {
    setUnit(newUnit);
    setSliderValue(0);
  };

  const handleSliderChange = (value) => {
    setSliderValue(value);
  };

  const adjustDosage = (delta) => {
    const config = UNIT_CONFIG[unit];
    const range = config.max - config.min;
    const stepPercent = (config.step / range) * 100;
    setSliderValue((prev) => {
      const nextVal = prev + delta * stepPercent;
      return Math.min(Math.max(nextVal, 0), 100);
    });
  };

  const handleAddIntake = async () => {
    if (isAdding || sliderValue === 0) return;
    
    const intakeTimestamp = isSelectingTime && selectedTime ? selectedTime : new Date();
    setIsAdding(true);
    
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
      
      // Animate slider back to 0
      if (syringeRef.current) {
        await syringeRef.current.animateToZero();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const accentColor = title === 'AH' ? 'var(--accent-ah)' : 'var(--accent-ei)';
  const liquidColor = title === 'AH' 
    ? 'rgba(255, 138, 101, 0.85)' 
    : 'rgba(255, 213, 79, 0.85)';

  return (
    <div
      className="flex-1 backdrop-blur-md rounded-[2rem] p-4 shadow-xl border border-[var(--border)] relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--card-bg-start), var(--card-bg-end))' }}
    >
      {/* Decorative background glow */}
      <div 
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: accentColor }}
      />
      
      <div
        className={`absolute top-3 left-3 px-3 py-1 rounded-lg text-xs font-black text-white shadow-lg ${
          title === 'AH' ? 'bg-[var(--accent-ah)]' : 'bg-[var(--accent-ei)]'
        }`}
      >
        {title}
      </div>

      <div className="flex flex-col items-center mt-6">
        {/* Unit selector */}
        <div className="flex gap-2 mb-3">
          {['mg', 'ml'].map((u) => (
            <button
              key={u}
              onClick={() => handleUnitChange(u)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                unit === u
                  ? 'text-white shadow-lg scale-105'
                  : 'bg-black/5 text-[var(--text-secondary)] hover:bg-black/10'
              }`}
              style={unit === u ? { 
                background: `linear-gradient(135deg, ${accentColor}, ${title === 'AH' ? 'var(--accent-ei)' : 'var(--accent-ah)'})` 
              } : {}}
            >
              {u.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Subtype selector */}
        <div className="grid grid-cols-4 gap-1.5 w-full mb-4">
          {SUBTYPE_OPTIONS.map((option) => {
            const isActive = subtype === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSubtype(option.value)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl border text-[9px] font-bold leading-tight transition-all duration-300 ${
                  isActive ? 'text-white shadow-md scale-105' : 'text-[var(--text-secondary)] hover:scale-102'
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
                <span className="flex items-center gap-0.5 text-sm leading-none">
                  <Icon className="text-[12px]" />
                  {option.value === 'IV+PO' && <FaPills className="text-[11px]" />}
                </span>
                <span className="text-[8px] font-black tracking-wide">{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dosage display with +/- buttons */}
        <div className="flex items-center justify-between w-full px-2 mb-4">
          <button
            onClick={() => adjustDosage(-1)}
            className="w-10 h-10 rounded-full bg-black/5 text-[var(--text-primary)] text-xl font-bold flex items-center justify-center hover:bg-black/10 active:scale-95 transition-all"
          >
            −
          </button>
          <div className="text-center">
            <span 
              className="text-4xl font-black leading-none transition-all duration-300"
              style={{ color: sliderValue > 0 ? accentColor : 'var(--text-primary)' }}
            >
              {currentDosage}
            </span>
            <span className="text-sm font-bold text-[var(--text-secondary)] ml-1">{UNIT_CONFIG[unit].label}</span>
          </div>
          <button
            onClick={() => adjustDosage(1)}
            className="w-10 h-10 rounded-full bg-black/5 text-[var(--text-primary)] text-xl font-bold flex items-center justify-center hover:bg-black/10 active:scale-95 transition-all"
          >
            +
          </button>
        </div>

        {/* Syringe Slider */}
        <div className="w-full mb-8 px-1">
          <SyringeSlider
            ref={syringeRef}
            value={sliderValue}
            onChange={handleSliderChange}
            min={0}
            max={100}
            accentColor={accentColor}
            liquidColor={liquidColor}
          />
        </div>

        {/* Action buttons */}
        <div className="w-full space-y-2">
          <button
            onClick={() => (isSelectingTime ? onCancelTimeSelection(title) : onStartTimeSelection(title))}
            className="w-full py-2.5 rounded-xl text-[var(--text-secondary)] text-xs font-semibold flex items-center justify-center gap-2 border border-[var(--border)] hover:bg-black/5 transition-all"
            style={{ background: 'linear-gradient(135deg, var(--card-bg-start), var(--card-bg-end))' }}
          >
            {isSelectingTime ? (
              selectedTime ? (
                <span className="flex items-center gap-2">
                  <span className="text-[var(--text-primary)] font-bold">
                    {`${formatTime(selectedTime)}${selectedDateLabel}`}
                  </span>
                  <span className="text-red-500 text-base leading-none hover:scale-110 transition-transform">✕</span>
                </span>
              ) : (
                <span className="text-red-400">Відміна</span>
              )
            ) : (
              <>
                <span className="text-base">🕐</span>
                Вказати час
              </>
            )}
          </button>

          <button
            onClick={handleAddIntake}
            disabled={isAddDisabled || isAdding || sliderValue === 0}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-lg shadow-lg transition-all duration-300 ${
              isAddDisabled || isAdding || sliderValue === 0
                ? 'opacity-40 cursor-not-allowed'
                : 'active:scale-95 hover:shadow-xl hover:brightness-110'
            }`}
            style={{ 
              background: `linear-gradient(135deg, var(--accent-ah), var(--accent-ei))`,
            }}
          >
            {isAdding ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Додаємо...
              </span>
            ) : (
              '+ Додати'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedTrackerCard;
