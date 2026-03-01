import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { formatDateInput, formatTimeInput } from "../utils/time";

const BANKS = [
    {
        id: "ah",
        label: "AH",
        collection: "bank_logs_ah",
        accentVar: "var(--accent-ah)",
    },
    {
        id: "ei",
        label: "EI",
        collection: "bank_logs_ei",
        accentVar: "var(--accent-ei)",
    },
];

function useBankLogs(collectionName) {
    const [logs, setLogs] = useState([]);
    useEffect(() => {
        const q = query(collection(db, collectionName), orderBy("timestamp", "desc"));
        return onSnapshot(q, (snapshot) => {
            setLogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
    }, [collectionName]);
    return logs;
}

function BankCard({ bank, onOpenModal }) {
    const logs = useBankLogs(bank.collection);
    const latestLog = logs[0] || null;
    const percentage = latestLog && latestLog.totalCapacity > 0
        ? Math.max(0, Math.min(100, (latestLog.currentRemainder / latestLog.totalCapacity) * 100))
        : 0;

    return (
        <div
            className="relative flex-1 rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
                background: "var(--surface-2)",
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
                border: "1px solid var(--glass-border)",
                boxShadow: `0 8px 30px var(--shadow-color-strong), inset 0 1px 0 var(--glass-shine)`,
            }}
            onClick={() => onOpenModal(bank)}
        >
            <div
                className="absolute inset-x-0 top-0 h-px pointer-events-none z-10"
                style={{ background: "linear-gradient(90deg, transparent 5%, var(--glass-shine) 50%, transparent 95%)" }}
            />
            {/* subtle accent glow */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse 80% 80% at 50% 120%, ${bank.accentVar} 0%, transparent 70%)`,
                    opacity: 0.08,
                }}
            />
            <div className="p-3 relative">
                <div className="flex justify-between items-end mb-2">
                    <span
                        className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: bank.accentVar }}
                    >
                        {bank.label}
                    </span>
                    {latestLog ? (
                        <span className="text-sm font-black tabular-nums" style={{ color: "var(--text-primary)" }}>
                            {latestLog.currentRemainder}{" "}
                            <span className="text-[10px] font-bold opacity-60">/ {latestLog.totalCapacity} мг</span>
                            <span
                                className="ml-2 text-[10px] px-1.5 py-0.5 rounded-md"
                                style={{ background: `color-mix(in srgb, ${bank.accentVar} 18%, transparent)`, color: bank.accentVar }}
                            >
                                {Math.round(percentage)}%
                            </span>
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold opacity-40" style={{ color: "var(--text-primary)" }}>Немає даних</span>
                    )}
                </div>

                <div
                    className="w-full h-2 rounded-full overflow-hidden relative"
                    style={{ background: "rgba(0,0,0,0.15)", border: "1px solid var(--glass-border)" }}
                >
                    {latestLog && (
                        <div
                            className="h-full rounded-full transition-all duration-700 relative"
                            style={{
                                width: `${percentage}%`,
                                background: bank.accentVar,
                                boxShadow: `0 0 10px ${bank.accentVar}`,
                            }}
                        >
                            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4))", opacity: 0.5 }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function BankProgress() {
    const [modalBank, setModalBank] = useState(null); // bank config object or null

    return (
        <>
            <div className="flex gap-3">
                {BANKS.map((bank) => (
                    <BankCard key={bank.id} bank={bank} onOpenModal={setModalBank} />
                ))}
            </div>

            {modalBank && (
                <BankModal
                    bank={modalBank}
                    onClose={() => setModalBank(null)}
                />
            )}
        </>
    );
}

function BankModal({ bank, onClose }) {
    const logs = useBankLogs(bank.collection);
    const latestLog = logs[0] || null;

    const [dateValue, setDateValue] = useState(formatDateInput(new Date()));
    const [timeValue, setTimeValue] = useState(formatTimeInput(new Date()));
    const [totalCapacity, setTotalCapacity] = useState("");
    const [currentRemainder, setCurrentRemainder] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Prefill form once we have data
    useEffect(() => {
        if (latestLog && totalCapacity === "" && currentRemainder === "") {
            setTotalCapacity(latestLog.totalCapacity);
            setCurrentRemainder(latestLog.currentRemainder);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latestLog]);

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            const dt = new Date(`${dateValue}T${timeValue}`);
            const prev = latestLog;
            const newRemainder = Number(currentRemainder);
            const amount = prev ? Math.round((newRemainder - prev.currentRemainder) * 10) / 10 : null;

            await addDoc(collection(db, bank.collection), {
                timestamp: Timestamp.fromDate(dt),
                createdAt: Timestamp.now(),
                totalCapacity: Number(totalCapacity),
                currentRemainder: newRemainder,
                type: "manual",
                note: "Ручне оновлення",
                amount: amount,
            });
            setDateValue(formatDateInput(new Date()));
            setTimeValue(formatTimeInput(new Date()));
        } catch (err) {
            console.error(err);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-auto"
            style={{
                background: "var(--header-overlay)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
            }}
        >
            <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

            <div
                className="relative w-full max-w-3xl mx-auto rounded-t-3xl sm:rounded-3xl sm:mb-6 flex flex-col overflow-hidden"
                style={{
                    background: "var(--surface)",
                    border: "1px solid var(--glass-border)",
                    boxShadow: "0 -10px 40px var(--shadow-color-strong)",
                    maxHeight: "90vh",
                    animation: "slideInFromBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
            >
                <style>{`
                    @keyframes slideInFromBottom {
                        from { transform: translateY(100%); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                `}</style>
                <div
                    className="absolute inset-x-0 top-0 h-px pointer-events-none z-10"
                    style={{ background: "linear-gradient(90deg, transparent 5%, var(--glass-shine) 50%, transparent 95%)" }}
                />

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--glass-border)]">
                    <div className="flex items-center gap-2">
                        <span
                            className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
                            style={{ background: `color-mix(in srgb, ${bank.accentVar} 18%, transparent)`, color: bank.accentVar }}
                        >
                            {bank.label}
                        </span>
                        <h2 className="text-lg font-black uppercase tracking-tight text-[var(--text-primary)]">
                            Банка
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95"
                        style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

                    {/* Add / replenish form */}
                    <form
                        onSubmit={handleAddSubmit}
                        className="p-4 rounded-2xl flex flex-col gap-3"
                        style={{ background: "rgba(0,0,0,0.12)", border: "1px solid var(--glass-border)" }}
                    >
                        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                            Додати / оновити запис
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "Дата", type: "date", val: dateValue, set: setDateValue },
                                { label: "Час", type: "time", val: timeValue, set: setTimeValue },
                            ].map(({ label, type, val, set }) => (
                                <div key={type}>
                                    <label className="block text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                                        {label}
                                    </label>
                                    <input
                                        type={type}
                                        value={val}
                                        onChange={(e) => set(e.target.value)}
                                        required
                                        className="w-full rounded-xl px-2 py-2 text-[11px] font-bold focus:outline-none"
                                        style={{
                                            background: "rgba(255,255,255,0.06)",
                                            border: "1px solid var(--glass-border)",
                                            color: "var(--text-primary)",
                                            colorScheme: "dark",
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                                    Загальна ємність (мг)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={totalCapacity}
                                    onChange={(e) => setTotalCapacity(e.target.value)}
                                    required
                                    className="w-full rounded-xl px-3 py-2 text-sm font-black focus:outline-none tabular-nums"
                                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                                    Поточний залишок (мг)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={currentRemainder}
                                    onChange={(e) => setCurrentRemainder(e.target.value)}
                                    required
                                    className="w-full rounded-xl px-3 py-2 text-sm font-black focus:outline-none tabular-nums"
                                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isAdding}
                            className="mt-2 w-full py-3 rounded-xl font-black text-sm transition-all duration-200 active:scale-95"
                            style={{
                                background: `color-mix(in srgb, ${bank.accentVar} 22%, transparent)`,
                                color: bank.accentVar,
                                border: `1px solid color-mix(in srgb, ${bank.accentVar} 40%, transparent)`,
                                opacity: isAdding ? 0.6 : 1,
                            }}
                        >
                            {isAdding ? "Збереження..." : "Зберегти запис"}
                        </button>
                    </form>

                    {/* History */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                            Історія банки {bank.label}
                        </h3>
                        {logs.length === 0 ? (
                            <p className="text-xs font-semibold text-[var(--text-secondary)]">Немає записів.</p>
                        ) : (
                            logs.map((log) => {
                                const pct = log.totalCapacity > 0 ? (log.currentRemainder / log.totalCapacity) * 100 : 0;
                                const tsDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();

                                const handleDelete = async () => {
                                    if (window.confirm("Видалити цей запис?")) {
                                        await deleteDoc(doc(db, bank.collection, log.id));
                                    }
                                };

                                const handleEdit = async () => {
                                    const newRemainder = window.prompt("Введіть новий залишок (мг):", log.currentRemainder);
                                    if (newRemainder !== null && newRemainder !== "") {
                                        const num = Number(newRemainder);
                                        if (!isNaN(num)) {
                                            await updateDoc(doc(db, bank.collection, log.id), {
                                                currentRemainder: num,
                                            });
                                        }
                                    }
                                };

                                return (
                                    <div
                                        key={log.id}
                                        className="flex flex-col gap-2 p-3 rounded-xl"
                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)" }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-xs font-black text-[var(--text-primary)] tabular-nums">
                                                    {tsDate.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                                    <span className="opacity-50 mx-1">•</span>
                                                    {tsDate.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                                <div className="text-[9px] uppercase font-black tracking-wider text-[var(--text-secondary)] mt-0.5">
                                                    {log.note || "Оновлення"}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-[var(--text-primary)] tabular-nums flex items-center gap-2 justify-end">
                                                    {log.amount != null && (
                                                        <span style={{ color: log.amount < 0 ? "#f87171" : "#4ade80" }}>
                                                            {log.amount > 0 ? "+" : ""}{log.amount}мг
                                                        </span>
                                                    )}
                                                    <span>
                                                        {log.currentRemainder}
                                                        <span className="text-[10px] font-bold opacity-60"> / {log.totalCapacity} мг</span>
                                                    </span>
                                                </div>
                                                <div className="text-[10px] font-black tracking-wide mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                                    {Math.round(pct)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--glass-border)]">
                                            <button
                                                type="button"
                                                onClick={handleEdit}
                                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-all active:scale-95"
                                                style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-primary)" }}
                                            >
                                                Редагувати
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-all active:scale-95"
                                                style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
                                            >
                                                Видалити
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
