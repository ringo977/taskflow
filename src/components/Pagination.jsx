import { useLang } from '@/i18n'

/**
 * Compact pagination bar for task views.
 * Only renders when there are 2+ pages to avoid visual noise.
 *
 * @param {{ page, totalPages, total, startIndex, endIndex, canPrev, canNext, onPrev, onNext }} props
 */
export default function Pagination({ page: _page, totalPages, total, startIndex, endIndex, canPrev, canNext, onPrev, onNext }) {
  const t = useLang()
  if (totalPages <= 1) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: '8px 0', fontSize: 12, color: 'var(--tx3)',
    }}>
      <button
        onClick={onPrev} disabled={!canPrev} aria-label="Previous page"
        style={{
          border: '1px solid var(--bd3)', borderRadius: 'var(--r1)',
          background: canPrev ? 'var(--bg1)' : 'transparent',
          color: canPrev ? 'var(--tx1)' : 'var(--tx3)',
          cursor: canPrev ? 'pointer' : 'default',
          padding: '3px 8px', fontSize: 12, fontWeight: 500,
          opacity: canPrev ? 1 : 0.4,
        }}
      >
        ‹ {t.prev ?? 'Prev'}
      </button>

      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {startIndex + 1}–{endIndex} / {total}
      </span>

      <button
        onClick={onNext} disabled={!canNext} aria-label="Next page"
        style={{
          border: '1px solid var(--bd3)', borderRadius: 'var(--r1)',
          background: canNext ? 'var(--bg1)' : 'transparent',
          color: canNext ? 'var(--tx1)' : 'var(--tx3)',
          cursor: canNext ? 'pointer' : 'default',
          padding: '3px 8px', fontSize: 12, fontWeight: 500,
          opacity: canNext ? 1 : 0.4,
        }}
      >
        {t.next ?? 'Next'} ›
      </button>
    </div>
  )
}
