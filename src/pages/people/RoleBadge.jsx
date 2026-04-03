import { ROLE_COLORS } from './constants'

export default function RoleBadge({ role }) {
  return (
    <span style={{
      fontSize: 11,
      color: ROLE_COLORS[role] ?? 'var(--tx3)',
      background: (ROLE_COLORS[role] ?? 'var(--tx3)') + '18',
      padding: '2px 7px',
      borderRadius: 'var(--r1)',
      fontWeight: 500,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {role}
    </span>
  )
}
