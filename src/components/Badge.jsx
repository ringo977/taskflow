import { useLang } from '@/i18n'

const COLORS = { high: 'var(--c-danger)', medium: 'var(--c-warning)', low: 'var(--c-lime)' }

export default function Badge({ pri }) {
  const t = useLang()
  if (!pri) return null
  const c = COLORS[pri] ?? 'var(--tx3)'
  return (
    <span style={{
      fontSize: 12, fontWeight: 500, color: c,
      background: 'color-mix(in srgb, currentColor 10%, transparent)',
      padding: '2px 8px', borderRadius: 'var(--r1)',
      flexShrink: 0, lineHeight: 1.4,
    }}>
      {t.pri[pri]}
    </span>
  )
}
