import { useState } from "react";
import { formatDateInput, formatTimeInput } from "../utils/time";

/**
 * IntakeActionModal
 * Combined modal: shows intake summary + lets user add now or pick a time and add.
 */
const IntakeActionModal = ({
  patient,
  dosage,
  unit,
  subtype,
  accentColor,
  onAddNow,
  onAddWithTime,
  onClose,
}) => {
  const [dateValue, setDateValue] = useState(formatDateInput(new Date()));
  const [timeValue, setTimeValue] = useState(formatTimeInput(new Date()));
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleAddWithTime = () => {
    const date = new Date(`${dateValue}T${timeValue}`);
    onAddWithTime(date);
  };

  const finalPatient = subtype === "LOST" ? "NO" : patient;
  const patientColor =
    patient === "AH" ? "var(--accent-ah)" : "var(--accent-ei)";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 transition-all"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] rounded-t-[2rem] border border-[var(--border)] border-b-0 p-5 pb-8 shadow-2xl"
        style={{
          background:
            "linear-gradient(160deg, var(--card-bg-start), var(--card-bg-end))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div
            className="w-10 h-1 rounded-full opacity-30"
            style={{ background: "var(--text-primary)" }}
          />
        </div>

        {/* Intake summary */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0"
            style={{
              background: `${accentColor}22`,
              border: `1px solid ${accentColor}44`,
              color: accentColor,
            }}
          >
            {finalPatient}
          </div>
          <div>
            <div
              className="text-xl font-black tracking-tighter leading-none"
              style={{ color: "var(--text-primary)" }}
            >
              {dosage}{" "}
              <span className="text-sm font-bold opacity-60">{unit}</span>
            </div>
            {subtype && (
              <div
                className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
                style={{ color: accentColor, opacity: 0.8 }}
              >
                {subtype}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!showTimePicker ? (
          <div className="flex flex-col gap-2">
            {/* Add now — primary */}
            <button
              type="button"
              onClick={onAddNow}
              className="w-full py-3.5 rounded-2xl font-black text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] relative overflow-hidden group"
              style={{
                background: "var(--add-btn-bg)",
                color: "var(--add-btn-text)",
                border: "1px solid var(--add-btn-border)",
                boxShadow:
                  "0 8px 20px var(--shadow-color-strong), 0 0 12px var(--add-btn-glow)",
              }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10 inline-flex items-center gap-2">
                <span className="text-xl leading-none">+</span>
                Додати зараз
              </span>
            </button>

            {/* Configure time — secondary */}
            <button
              type="button"
              onClick={() => setShowTimePicker(true)}
              className="w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 hover:opacity-80 active:scale-[0.97]"
              style={{
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="inline-flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Вказати час
              </span>
            </button>
          </div>
        ) : (
          /* Time picker */
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 px-1">
                  Дата
                </label>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-black/5 px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 px-1">
                  Час
                </label>
                <input
                  type="time"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-black/5 px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-secondary)] transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTimePicker(false)}
                className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-3 text-xs font-bold text-[var(--text-primary)] transition-all active:scale-95"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={handleAddWithTime}
                className="flex-1 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-lg shadow-black/20 transition-all active:scale-95 hover:opacity-90"
                style={{ background: accentColor }}
              >
                Додати
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntakeActionModal;
