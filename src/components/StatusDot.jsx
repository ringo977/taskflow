import { useLang } from '@/i18n'

const STATUS = {
  active:   { c: 'var(--c-success)' },
  on_hold:  { c: 'var(--c-warning)' },
  archived: { c: 'var(--tx3)' },
}

export default function StatusDot({ status = 'active' }) {
  const t = useLang()
  const { c } = STATUS[status] ?? STATUS.active
  const label = { active: t.active, on_hold: t.onHold, archived: t.archived }[status]
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: c }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />
      {label}
    </span>
  )
}
