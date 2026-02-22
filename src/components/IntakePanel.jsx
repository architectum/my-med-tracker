import { useState } from "react";
import { GiWaterDrop } from "react-icons/gi";
import { FaSyringe, FaPills, FaGhost } from "react-icons/fa";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import SyringeSlider from "./SyringeSlider";
import SubtypeSelector from "./SubtypeSelector";
import { formatDateInput, formatTimeInput } from "../utils/time";

const UNIT_CONFIG = {
  mg: { min: 0, max: 100, step: 1, default: 0, label: "мг" },
  ml: { min: 0, max: 5.0, step: 0.1, default: 0, label: "мл" },
};

const SUBTYPE_OPTIONS = [
  { value: "IV",    label: "IV",    icon: GiWaterDrop },
  { value: "IM",    label: "IM",    icon: FaSyringe   },
  { value: "PO",    label: "PO",    icon: FaPills     },
  { value: "IV+PO", label: "IV+PO", icon: GiWaterDrop },
  { value: "VTRK",  label: "VTRK",  icon: GiWaterDrop },
  { value: "LOST",  label: "LOST",  icon: FaGhost     },
];

const PATIENT_DEFAULTS = {
  AH: { subtype: "IM", unit: "mg" },
  EI: { subtype: "IV", unit: "mg" },
};

const getActiveColor = (subtype, patient) => {
  if (subtype === "IV")    return "var(--subtype-iv)";
  if (subtype === "IM")    return "var(--subtype-im)";
  if (subtype === "PO")    return "var(--subtype-po)";
  if (subtype === "IV+PO") return "var(--subtype-po)";
  if (subtype === "VTRK")  return "var(--subtype-vtrk)";
  return patient === "AH" ? "var(--accent-ah)" : "var(--accent-ei)";
};

const makePatientState = (patient) => ({
  unit:    PATIENT_DEFAULTS[patient].unit,
  dosage:  UNIT_CONFIG[PATIENT_DEFAULTS[patient].unit].default,
  subtype: PATIENT_DEFAULTS[patient].subtype,
});

// Confirm step: "idle" | "confirm" | "pick-time"
export default function IntakePanel({ onAddSuccess }) {
  const [activePatient, setActivePatient] = useState("AH");
  const [stateAH, setStateAH] = useState(() => makePatientState("AH"));
  const [stateEI, setStateEI] = useState(() => makePatientState("EI"));
  // inline confirm step
  const [confirmStep, setConfirmStep] = useState("idle"); // "idle"|"confirm"|"pick-time"
  const [dateValue, setDateValue] = useState(formatDateInput(new Date()));
  const [timeValue, setTimeValue] = useState(formatTimeInput(new Date()));
  const [isAdding, setIsAdding] = useState(false);

  const getState   = (p) => (p === "AH" ? stateAH : stateEI);
  const patchState = (p, patch) => {
    if (p === "AH") setStateAH((s) => ({ ...s, ...patch }));
    else            setStateEI((s) => ({ ...s, ...patch }));
  };

  const active      = getState(activePatient);
  const activeColor = getActiveColor(active.subtype, activePatient);
  const isAHActive  = activePatient === "AH";
  const ahState     = getState("AH");
  const eiState     = getState("EI");

  const handleUnitChange = (newUnit) => {
    const prev = active.dosage;
    let newDosage = newUnit === "mg"
      ? Math.round(prev * 20)
      : Math.round((prev / 20) * 10) / 10;
    const cfg = UNIT_CONFIG[newUnit];
    newDosage = Math.min(Math.max(newDosage, cfg.min), cfg.max);
    patchState(activePatient, { unit: newUnit, dosage: newDosage });
  };

  const adjustDosage = (delta) => {
    const cfg  = UNIT_CONFIG[active.unit];
    const next = Math.round((active.dosage + delta * cfg.step) * 10) / 10;
    patchState(activePatient, { dosage: Math.min(Math.max(next, cfg.min), cfg.max) });
  };

  const handleAddIntake = async (intakeTime) => {
    const finalPatientId = active.subtype === "LOST" ? "NO" : activePatient;
    setIsAdding(true);
    try {
      await addDoc(collection(db, "intakes"), {
        patientId: finalPatientId,
        dosage:    active.dosage,
        unit:      active.unit,
        subtype:   active.subtype || null,
        timestamp: Timestamp.fromDate(intakeTime),
        createdAt: Timestamp.now(),
      });
      onAddSuccess(
        `${finalPatientId}: Додано ${active.dosage} ${active.unit}${
          active.subtype === "LOST" ? " (LOST)" : ""
        }`
      );
      patchState(activePatient, { dosage: 0 });
      setConfirmStep("idle");
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const openConfirm = () => {
    setDateValue(formatDateInput(new Date()));
    setTimeValue(formatTimeInput(new Date()));
    setConfirmStep("confirm");
  };

  const handleAddWithTime = () => {
    const date = new Date(`${dateValue}T${timeValue}`);
    handleAddIntake(date);
  };

  const finalPatient = active.subtype === "LOST" ? "NO" : activePatient;

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(145deg, var(--card-bg-start), var(--card-bg-end))",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px var(--shadow-color)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{
          background: isAHActive
            ? "radial-gradient(ellipse 70% 100% at 0% 50%, var(--accent-ah) 0%, transparent 65%)"
            : "radial-gradient(ellipse 70% 100% at 100% 50%, var(--accent-ei) 0%, transparent 65%)",
          opacity: 0.09,
        }}
      />

      {/* Patient edge labels */}
      <PatientEdgeLabel label="AH" side="left"  isActive={isAHActive}  accentVar="var(--accent-ah)" onClick={() => setActivePatient("AH")} />
      <PatientEdgeLabel label="EI" side="right" isActive={!isAHActive} accentVar="var(--accent-ei)" onClick={() => setActivePatient("EI")} />

      <div className="relative flex items-stretch" style={{ minHeight: 340 }}>

        {/* LEFT SYRINGE: AH */}
        <SyringeColumn
          patient="AH"
          state={ahState}
          isActive={isAHActive}
          accentVar="var(--accent-ah)"
          side="right"
          onActivate={() => setActivePatient("AH")}
          onChange={(v) => { if (!isAHActive) setActivePatient("AH"); patchState("AH", { dosage: v }); }}
        />

        {/* CENTER CONTROLS */}
        <div className="flex flex-col flex-1 min-w-0 px-3 pt-3 pb-3 gap-2">

          {/* Active patient indicator bar */}
          <div className="relative h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="absolute top-0 bottom-0 rounded-full"
              style={{
                width: "50%",
                left: isAHActive ? 0 : "50%",
                background: isAHActive ? "var(--accent-ah)" : "var(--accent-ei)",
                transition: "left 0.35s cubic-bezier(0.34,1.56,0.64,1), background 0.35s ease",
                boxShadow: `0 0 6px ${isAHActive ? "var(--accent-ah)" : "var(--accent-ei)"}`,
              }}
            />
          </div>

          {/* ── MAIN STATE: idle dosage controls ─────────────────── */}
          <div
            className="flex flex-col flex-1 gap-2 transition-all duration-300"
            style={{
              opacity: confirmStep !== "idle" ? 0 : 1,
              pointerEvents: confirmStep !== "idle" ? "none" : "auto",
              position: "relative",
            }}
          >
            {/* Unit toggle */}
            <div className="flex justify-center">
              <div
                className="flex rounded-lg overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
              >
                {["mg", "ml"].map((u) => (
                  <button
                    key={u}
                    onClick={() => handleUnitChange(u)}
                    className="px-3 py-1 text-[10px] font-bold transition-all"
                    style={{
                      background: active.unit === u ? "rgba(255,255,255,0.15)" : "transparent",
                      color:      active.unit === u ? "var(--text-primary)"    : "var(--text-secondary)",
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtype selector */}
            <SubtypeSelector
              value={active.subtype}
              onChange={(v) => patchState(activePatient, { subtype: v })}
              options={SUBTYPE_OPTIONS}
            />

            {/* Dosage display */}
            <div className="flex flex-col items-center justify-center flex-1 py-1">
              <div className="relative">
                <span
                  key={activePatient}
                  className="text-4xl leading-none font-black tracking-tighter tabular-nums"
                  style={{ color: activeColor }}
                >
                  {active.dosage}
                </span>
                <span
                  className="absolute -top-1.5 -right-5 text-[10px] font-bold"
                  style={{ color: "var(--text-secondary)", opacity: 0.6 }}
                >
                  {UNIT_CONFIG[active.unit].label}
                </span>
              </div>

              <div className="flex gap-2.5 mt-2">
                {[{ d: -1, sym: "−" }, { d: 1, sym: "+" }].map(({ d, sym }) => (
                  <button
                    key={d}
                    onClick={() => adjustDosage(d)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-black transition-all hover:scale-110 active:scale-90"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Add button */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <button
                type="button"
                onClick={openConfirm}
                className="w-full py-3 rounded-xl font-black text-sm transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] group relative overflow-hidden"
                style={{
                  background:  "var(--add-btn-bg)",
                  color:       "var(--add-btn-text)",
                  border:      "1px solid var(--add-btn-border)",
                  boxShadow:   "0 10px 24px var(--shadow-color-strong), 0 0 14px var(--add-btn-glow)",
                }}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="inline-flex items-center justify-center gap-2 relative z-10">
                  <span className="text-xl leading-none">+</span>
                  Додати
                </span>
              </button>
            </div>
          </div>

          {/* ── CONFIRM OVERLAY ──────────────────────────────────── */}
          {confirmStep !== "idle" && (
            <div
              className="absolute inset-0 flex flex-col justify-between"
              style={{
                animation: "fadeSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
                padding: "4px 0 0",
              }}
            >
              <style>{`
                @keyframes fadeSlideUp {
                  from { opacity:0; transform:translateY(12px) scale(0.97); }
                  to   { opacity:1; transform:translateY(0) scale(1); }
                }
              `}</style>

              {/* Summary pill */}
              <div className="flex items-center gap-2 px-1 pt-1">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0"
                  style={{
                    background: `${activeColor}22`,
                    border: `1px solid ${activeColor}55`,
                    color: activeColor,
                  }}
                >
                  {finalPatient}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-lg font-black tracking-tighter leading-none"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {active.dosage}{" "}
                    <span className="text-xs font-bold opacity-50">{active.unit}</span>
                  </div>
                  {active.subtype && (
                    <div
                      className="text-[9px] font-black uppercase tracking-wider"
                      style={{ color: activeColor, opacity: 0.8 }}
                    >
                      {active.subtype}
                    </div>
                  )}
                </div>
                {/* Cancel */}
                <button
                  type="button"
                  onClick={() => setConfirmStep("idle")}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-70 active:scale-90 flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-secondary)" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Time picker (pick-time step) */}
              {confirmStep === "pick-time" && (
                <div className="grid grid-cols-2 gap-2 px-1">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider mb-1 px-0.5" style={{ color: "var(--text-secondary)" }}>Дата</label>
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                      className="w-full rounded-xl border px-2 py-2 text-xs font-semibold focus:outline-none transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider mb-1 px-0.5" style={{ color: "var(--text-secondary)" }}>Час</label>
                    <input
                      type="time"
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      className="w-full rounded-xl border px-2 py-2 text-xs font-semibold focus:outline-none transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-1.5 px-0" style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                {confirmStep === "confirm" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { handleAddIntake(new Date()); }}
                      disabled={isAdding}
                      className="w-full py-3 rounded-xl font-black text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] relative overflow-hidden group"
                      style={{
                        background: "var(--add-btn-bg)",
                        color: "var(--add-btn-text)",
                        border: "1px solid var(--add-btn-border)",
                        boxShadow: "0 8px 20px var(--shadow-color-strong), 0 0 12px var(--add-btn-glow)",
                        opacity: isAdding ? 0.6 : 1,
                      }}
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 inline-flex items-center justify-center gap-2">
                        {isAdding ? (
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="text-xl leading-none">+</span>
                        )}
                        Додати зараз
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmStep("pick-time")}
                      className="w-full py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-80 active:scale-[0.97]"
                      style={{
                        background: "transparent",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Вказати час
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmStep("confirm")}
                      className="flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all active:scale-95"
                      style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "transparent" }}
                    >
                      Назад
                    </button>
                    <button
                      type="button"
                      onClick={handleAddWithTime}
                      disabled={isAdding}
                      className="flex-[2] rounded-xl px-3 py-2.5 text-xs font-black text-white shadow-lg transition-all active:scale-95 hover:opacity-90"
                      style={{ background: activeColor, opacity: isAdding ? 0.6 : 1 }}
                    >
                      {isAdding ? "..." : "Додати"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SYRINGE: EI */}
        <SyringeColumn
          patient="EI"
          state={eiState}
          isActive={!isAHActive}
          accentVar="var(--accent-ei)"
          side="left"
          onActivate={() => setActivePatient("EI")}
          onChange={(v) => { if (isAHActive) setActivePatient("EI"); patchState("EI", { dosage: v }); }}
        />
      </div>
    </div>
  );
}

/* ─── AH / EI edge label strip ─────────────────────────────────────────────── */
function PatientEdgeLabel({ label, side, isActive, accentVar, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Switch to ${label}`}
      className="absolute top-0 bottom-0 z-10 flex items-center justify-center select-none"
      style={{
        width: 18,
        left:  side === "left"  ? 0 : undefined,
        right: side === "right" ? 0 : undefined,
        writingMode: "vertical-rl",
        cursor: isActive ? "default" : "pointer",
        background: isActive
          ? `linear-gradient(${side === "left" ? "to right" : "to left"}, ${accentVar}28, transparent)`
          : "transparent",
        borderRight: side === "left"  ? "1px solid var(--border)" : "none",
        borderLeft:  side === "right" ? "1px solid var(--border)" : "none",
        transition: "background 0.35s ease",
      }}
    >
      <span
        className="text-[9px] font-black tracking-[0.2em] uppercase"
        style={{
          color:   isActive ? accentVar : "var(--text-secondary)",
          opacity: isActive ? 1 : 0.35,
          transition: "color 0.35s ease, opacity 0.35s ease",
          textShadow: isActive ? `0 0 8px ${accentVar}` : "none",
        }}
      >
        {label}
      </span>
    </button>
  );
}

/* ─── Syringe column ────────────────────────────────────────────────────────── */
function SyringeColumn({ patient, state, isActive, accentVar, side, onActivate, onChange }) {
  const color = getActiveColor(state.subtype, patient);
  return (
    <div
      className="relative flex-shrink-0 flex flex-col"
      style={{
        width: 64,
        paddingLeft:  side === "right" ? 18 : 0,
        paddingRight: side === "left"  ? 18 : 0,
        borderRight: side === "right" ? "1px solid var(--border)" : "none",
        borderLeft:  side === "left"  ? "1px solid var(--border)" : "none",
        opacity:    isActive ? 1 : 0.5,
        transition: "opacity 0.35s ease",
      }}
    >
      <div className="flex-1 relative" style={{ minHeight: 280 }}>
        <div className="absolute inset-0" style={{ top: -10, bottom: -20 }}>
          <SyringeSlider
            value={state.dosage}
            onChange={onChange}
            min={UNIT_CONFIG[state.unit].min}
            max={UNIT_CONFIG[state.unit].max}
            step={UNIT_CONFIG[state.unit].step}
            color={color}
            side={side}
          />
        </div>
      </div>
    </div>
  );
}
