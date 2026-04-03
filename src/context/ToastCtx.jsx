import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300)
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type, exiting: false, duration }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastCtx)
}

const TYPE_STYLES = {
  info:    { bg: 'var(--bg1)', border: 'var(--c-brand)',   icon: 'ℹ', color: 'var(--c-brand)' },
  success: { bg: 'var(--bg1)', border: 'var(--c-success)', icon: '✓', color: 'var(--c-success)' },
  warning: { bg: 'var(--bg1)', border: 'var(--c-warning)', icon: '⚠', color: 'var(--c-warning)' },
  error:   { bg: 'var(--bg1)', border: 'var(--c-danger)',  icon: '✕', color: 'var(--c-danger)' },
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <>
      <style>{`
        @keyframes toast-in { from { opacity: 0; transform: translateY(12px) scale(0.96) } to { opacity: 1; transform: none } }
        @keyframes toast-out { from { opacity: 1; transform: none } to { opacity: 0; transform: translateY(-8px) scale(0.96) } }
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        .toast-item { position: relative; overflow: hidden; }
        .toast-item:hover .toast-progress { animation-play-state: paused; }
        .toast-progress {
          position: absolute; bottom: 0; left: 0; right: 0; height: 2.5px;
          transform-origin: left;
          border-radius: 0 0 var(--r2) var(--r2);
        }
      `}</style>
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const s = TYPE_STYLES[t.type] ?? TYPE_STYLES.info
          return (
            <div key={t.id}
              className="toast-item"
              style={{
                pointerEvents: 'auto',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 'var(--r2)',
                background: s.bg, border: `1px solid ${s.border}`,
                boxShadow: 'var(--shadow-lg)',
                animation: `${t.exiting ? 'toast-out' : 'toast-in'} 0.25s var(--ease) both`,
                minWidth: 220, maxWidth: 360,
              }}>
              <span style={{ fontSize: 14, color: s.color, fontWeight: 600, flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${s.color}15`, borderRadius: '50%' }}>{s.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--tx1)', flex: 1, lineHeight: 1.4 }}>{t.message}</span>
              <button aria-label="Dismiss notification" onClick={() => onDismiss(t.id)} style={{ background: 'transparent', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}>✕</button>
              {!t.exiting && (
                <div className="toast-progress"
                  style={{ background: s.color, opacity: 0.4, animation: `toast-progress ${t.duration ?? 3500}ms linear forwards` }} />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
