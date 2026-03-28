export default function LoadingScreen({ message }) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', gap: 14, zIndex: 10 }}>
      <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
        <rect x="1"  y="3.5"  width="10" height="3.5" rx="1.5" fill="var(--tx1)"/>
        <rect x="4"  y="9"    width="10" height="3.5" rx="1.5" fill="var(--tx1)" opacity="0.7"/>
        <rect x="7"  y="14.5" width="9"  height="3"   rx="1.5" fill="var(--tx1)" opacity="0.45"/>
        <path d="M14 2.5L17.5 6L14 9.5" stroke="var(--tx1)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      </svg>
      <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{message}</div>
    </div>
  )
}
