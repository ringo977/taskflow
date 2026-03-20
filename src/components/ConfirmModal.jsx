import { useLang } from '@/i18n'

export default function ConfirmModal({ message, onConfirm, onCancel, danger = true }) {
  const t = useLang()
  return (
    <div onClick={onCancel} role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', padding: '22px 24px', width: 340, border: '1px solid var(--bd2)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ fontSize: 14, color: 'var(--tx1)', lineHeight: 1.5, marginBottom: 18 }}>{message}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx2)', cursor: 'pointer' }}>
            {t.cancel}
          </button>
          <button onClick={onConfirm}
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 'var(--r1)', border: 'none', background: danger ? 'var(--c-danger)' : 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            {t.confirm ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
