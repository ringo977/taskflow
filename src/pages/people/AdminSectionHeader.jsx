export default function AdminSectionHeader({ icon, title, count, color }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      marginTop: 4,
    }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--r1)',
          background: (color ?? 'var(--accent)') + '14',
          color: color ?? 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx1)', flex: 1 }}>
        {title}
      </div>
      {count > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            background: (color ?? 'var(--accent)') + '18',
            color: color ?? 'var(--accent)',
            padding: '2px 8px',
            borderRadius: 10,
          }}>
          {count}
        </span>
      )}
    </div>
  )
}
