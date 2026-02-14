import { useEffect } from 'react';

const Notification = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] z-[100] notification-enter backdrop-blur-xl border border-white/20"
      style={{
        background: 'rgba(20, 20, 25, 0.85)',
        color: 'white',
        boxShadow: '0 0 20px rgba(74, 222, 128, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)'
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span className="font-semibold text-sm tracking-wide">{message}</span>
      </div>
    </div>
  );
};

export default Notification;
