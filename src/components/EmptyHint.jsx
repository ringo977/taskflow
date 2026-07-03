/**
 * EmptyHint — subtle placeholder for empty sections/columns.
 * Dashed outline reads as an "empty slot" (and as a drop target on the board),
 * consistent across List and Board views.
 */
export default function EmptyHint({ label }) {
  return (
    <div
      style={{
        padding: '14px 10px',
        textAlign: 'center',
        color: 'var(--tx3)',
        fontSize: 12,
        border: '1px dashed var(--bd3)',
        borderRadius: 'var(--r1)',
        margin: '4px 0',
      }}
    >
      {label}
    </div>
  )
}
