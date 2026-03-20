export default function Checkbox({ done, onToggle, size = 18 }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onToggle() }}
      role="checkbox"
      aria-checked={done}
      tabIndex={0}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onToggle() } }}
      style={{
        width: size, height: size, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
        border: `1.5px solid ${done ? 'var(--c-success)' : 'var(--bd2)'}`,
        background: done ? 'var(--c-success)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: `background var(--duration-fast) var(--ease), border-color var(--duration-fast) var(--ease)`,
      }}
    >
      {done && (
        <svg width={size - 6} height={size - 7} viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </div>
  )
}
