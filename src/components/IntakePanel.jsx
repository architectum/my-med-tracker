import { useState } from "react";
import { GiWaterDrop } from "react-icons/gi";
import { FaSyringe, FaPills, FaGhost } from "react-icons/fa";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import SyringeSlider from "./SyringeSlider";
import SubtypeSelector from "./SubtypeSelector";
import IntakeActionModal from "./IntakeActionModal";

const UNIT_CONFIG = {
  mg: { min: 0, max: 100, step: 1, default: 0, label: "мг" },
  ml: { min: 0, max: 5.0, step: 0.1, default: 0, label: "мл" },
};

const SUBTYPE_OPTIONS = [
  { value: "IV", label: "IV", icon: GiWaterDrop },
  { value: "IM", label: "IM", icon: FaSyringe },
  { value: "PO", label: "PO", icon: FaPills },
  { value: "IV+PO", label: "IV+PO", icon: GiWaterDrop },
  { value: "VTRK", label: "VTRK", icon: GiWaterDrop },
  { value: "LOST", label: "LOST", icon: FaGhost },
];

const PATIENT_DEFAULTS = {
  AH: { subtype: "IM", unit: "mg" },
  EI: { subtype: "IV", unit: "mg" },
};

const getActiveColor = (subtype, patient) => {
  if (subtype === "IV") return "var(--subtype-iv)";
  if (subtype === "IM") return "var(--subtype-im)";
  if (subtype === "PO") return "var(--subtype-po)";
  if (subtype === "IV+PO") return "var(--subtype-po)";
  if (subtype === "VTRK") return "var(--subtype-vtrk)";
  return patient === "AH" ? "var(--accent-ah)" : "var(--accent-ei)";
};

const makePatientState = (patient) => ({
  unit: PATIENT_DEFAULTS[patient].unit,
  dosage: UNIT_CONFIG[PATIENT_DEFAULTS[patient].unit].default,
  subtype: PATIENT_DEFAULTS[patient].subtype,
});

export default function IntakePanel({ onAddSuccess }) {
  const [activePatient, setActivePatient] = useState("AH");
  const [stateAH, setStateAH] = useState(() => makePatientState("AH"));
  const [stateEI, setStateEI] = useState(() => makePatientState("EI"));
  const [showModal, setShowModal] = useState(false);

  const getState = (p) => (p === "AH" ? stateAH : stateEI);
  const patchState = (p, patch) => {
    if (p === "AH") setStateAH((s) => ({ ...s, ...patch }));
    else setStateEI((s) => ({ ...s, ...patch }));
  };

  const active = getState(activePatient);
  const activeColor = getActiveColor(active.subtype, activePatient);
  const isAHActive = activePatient === "AH";

  const ahState = getState("AH");
  const eiState = getState("EI");

  const handleUnitChange = (newUnit) => {
    const prev = active.dosage;
    let newDosage = prev;
    if (newUnit === "mg") newDosage = Math.round(prev * 20);
    else newDosage = Math.round((prev / 20) * 10) / 10;
    const cfg = UNIT_CONFIG[newUnit];
    newDosage = Math.min(Math.max(newDosage, cfg.min), cfg.max);
    patchState(activePatient, { unit: newUnit, dosage: newDosage });
  };

  const adjustDosage = (delta) => {
    const cfg = UNIT_CONFIG[active.unit];
    const next = Math.round((active.dosage + delta * cfg.step) * 10) / 10;
    patchState(activePatient, {
      dosage: Math.min(Math.max(next, cfg.min), cfg.max),
    });
  };

  const handleAddIntake = async (intakeTime) => {
    const finalPatientId = active.subtype === "LOST" ? "NO" : activePatient;
    try {
      await addDoc(collection(db, "intakes"), {
        patientId: finalPatientId,
        dosage: active.dosage,
        unit: active.unit,
        subtype: active.subtype || null,
        timestamp: Timestamp.fromDate(intakeTime),
        createdAt: Timestamp.now(),
      });
      onAddSuccess(
        `${finalPatientId}: Додано ${active.dosage} ${active.unit}${
          active.subtype === "LOST" ? " (LOST)" : ""
        }`
      );
      patchState(activePatient, { dosage: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, var(--card-bg-start), var(--card-bg-end))",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px var(--shadow-color)",
      }}
    >
      {/* Active-side ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{
          background: isAHActive
            ? "radial-gradient(ellipse 80% 100% at 0% 50%, var(--accent-ah) 0%, transparent 60%)"
            : "radial-gradient(ellipse 80% 100% at 100% 50%, var(--accent-ei) 0%, transparent 60%)",
          opacity: 0.08,
        }}
      />

      <div className="relative flex items-stretch" style={{ minHeight: 340 }}>
        {/* ── LEFT SYRINGE: AH ── */}
        <SyringeColumn
          patient="AH"
          state={ahState}
          isActive={isAHActive}
          accentVar="var(--accent-ah)"
          side="right"
          onActivate={() => setActivePatient("AH")}
          onChange={(v) => isAHActive && patchState("AH", { dosage: v })}
        />

        {/* ── CENTER CONTROLS ── */}
        <div className="flex flex-col flex-1 min-w-0 px-3 pt-3 pb-3 gap-2.5">
          {/* Patient toggle switch */}
          <PatientToggle
            isAHActive={isAHActive}
            onSwitch={() => setActivePatient(isAHActive ? "EI" : "AH")}
            onClickAH={() => setActivePatient("AH")}
            onClickEI={() => setActivePatient("EI")}
          />

          {/* Unit toggle */}
          <div className="flex justify-center">
            <div
              className="flex rounded-lg overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
              }}
            >
              {["mg", "ml"].map((u) => (
                <button
                  key={u}
                  onClick={() => handleUnitChange(u)}
                  className="px-3 py-1 text-[10px] font-bold transition-all"
                  style={{
                    background:
                      active.unit === u
                        ? "rgba(255,255,255,0.15)"
                        : "transparent",
                    color:
                      active.unit === u
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
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
                className="text-4xl leading-none font-black tracking-tighter tabular-nums"
                style={{
                  background: isAHActive
                    ? "linear-gradient(135deg, var(--accent-ah), var(--subtype-im))"
                    : "linear-gradient(135deg, var(--accent-ei), var(--subtype-iv))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
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
              {[
                { d: -1, sym: "−" },
                { d: 1, sym: "+" },
              ].map(({ d, sym }) => (
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

          {/* Single action button */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="w-full py-3 rounded-xl font-black text-sm transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] group relative overflow-hidden"
              style={{
                background: "var(--add-btn-bg)",
                color: "var(--add-btn-text)",
                border: "1px solid var(--add-btn-border)",
                boxShadow:
                  "0 10px 24px var(--shadow-color-strong), 0 0 14px var(--add-btn-glow)",
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

        {/* ── RIGHT SYRINGE: EI ── */}
        <SyringeColumn
          patient="EI"
          state={eiState}
          isActive={!isAHActive}
          accentVar="var(--accent-ei)"
          side="left"
          onActivate={() => setActivePatient("EI")}
          onChange={(v) => !isAHActive && patchState("EI", { dosage: v })}
        />
      </div>

      {showModal && (
        <IntakeActionModal
          patient={activePatient}
          dosage={active.dosage}
          unit={active.unit}
          subtype={active.subtype}
          accentColor={activeColor}
          onAddNow={() => {
            handleAddIntake(new Date());
            setShowModal(false);
          }}
          onAddWithTime={(date) => {
            handleAddIntake(date);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ── Syringe column sub-component ──
function SyringeColumn({ patient, state, isActive, accentVar, side, onActivate, onChange }) {
  const color = isActive
    ? getActiveColor(state.subtype, patient)
    : "var(--text-secondary)";

  return (
    <div
      className="relative flex-shrink-0 flex flex-col"
      style={{
        width: 64,
        borderRight: side === "right" ? "1px solid var(--border)" : "none",
        borderLeft: side === "left" ? "1px solid var(--border)" : "none",
        opacity: isActive ? 1 : 0.38,
        transition: "opacity 0.35s ease",
        cursor: isActive ? "default" : "pointer",
      }}
      onClick={!isActive ? onActivate : undefined}
    >
      <div
        className="flex-1 relative"
        style={{ minHeight: 280 }}
      >
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
      {/* Patient label */}
      <div className="flex justify-center pb-2 flex-shrink-0">
        <span
          className="text-[9px] font-black tracking-widest uppercase select-none"
          style={{
            color: isActive ? accentVar : "var(--text-secondary)",
          }}
        >
          {patient}
        </span>
      </div>
    </div>
  );
}

// ── Patient toggle switch ──
function PatientToggle({ isAHActive, onSwitch, onClickAH, onClickEI }) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span
        className="text-sm font-black tracking-tight select-none transition-all duration-300"
        style={{
          color: isAHActive ? "var(--accent-ah)" : "var(--text-secondary)",
          opacity: isAHActive ? 1 : 0.45,
          cursor: isAHActive ? "default" : "pointer",
        }}
        onClick={!isAHActive ? onClickAH : undefined}
      >
        AH
      </span>

      {/* Toggle pill */}
      <button
        type="button"
        onClick={onSwitch}
        className="relative flex-shrink-0 focus:outline-none"
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: isAHActive ? "var(--accent-ah)" : "var(--accent-ei)",
          border: "1.5px solid var(--border)",
          boxShadow: `0 0 10px ${isAHActive ? "var(--accent-ah)" : "var(--accent-ei)"}55`,
          transition: "background 0.35s ease, box-shadow 0.35s ease",
        }}
        aria-label={`Active: ${isAHActive ? "AH" : "EI"}. Switch to ${isAHActive ? "EI" : "AH"}`}
      >
        <span
          className="absolute top-[2px]"
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
            left: isAHActive ? 2 : "calc(100% - 20px)",
            transition: "left 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            display: "block",
            position: "absolute",
          }}
        />
      </button>

      <span
        className="text-sm font-black tracking-tight select-none transition-all duration-300"
        style={{
          color: !isAHActive ? "var(--accent-ei)" : "var(--text-secondary)",
          opacity: !isAHActive ? 1 : 0.45,
          cursor: !isAHActive ? "default" : "pointer",
        }}
        onClick={isAHActive ? onClickEI : undefined}
      >
        EI
      </span>
    </div>
  );
}
