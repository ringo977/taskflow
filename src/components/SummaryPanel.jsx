import { useLang } from '@/i18n'

export default function SummaryPanel({ summary, loading, onClose }) {
  const t = useLang()
  return (
    <div style={{ position: 'absolute', top: 52, right: 16, width: 340, background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r2)', padding: 16, zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-success)' }}>{t.aiSummary}</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 14, lineHeight: 1 }}>✕</button>
      </div>
      {loading
        ? <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{t.generating2}</div>
        : <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{summary}</div>
      }
    </div>
  )
}
