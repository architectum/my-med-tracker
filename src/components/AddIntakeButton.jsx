const AddIntakeButton = ({ onClick, disabled }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl font-black text-base transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'var(--add-btn-bg)',
        color: 'var(--add-btn-text)',
        border: '1px solid var(--add-btn-border)',
        boxShadow: '0 10px 24px var(--shadow-color-strong), 0 0 14px var(--add-btn-glow)'
      }}
    >
      <span className="inline-flex items-center justify-center gap-2">
        <span className="text-xl leading-none">+</span>
        Додати
      </span>
    </button>
  );
};

export default AddIntakeButton;

