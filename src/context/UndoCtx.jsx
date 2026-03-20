import { createContext, useContext, useState, useCallback, useRef } from 'react'

const UndoCtx = createContext(null)

export function UndoProvider({ children }) {
  const [undoAction, setUndoAction] = useState(null)
  const timerRef = useRef(null)

  const pushUndo = useCallback((label, rollback) => {
    clearTimeout(timerRef.current)
    setUndoAction({ label, rollback })
    timerRef.current = setTimeout(() => setUndoAction(null), 8000)
  }, [])

  const executeUndo = useCallback(() => {
    if (undoAction?.rollback) {
      undoAction.rollback()
      clearTimeout(timerRef.current)
      setUndoAction(null)
    }
  }, [undoAction])

  const dismissUndo = useCallback(() => {
    clearTimeout(timerRef.current)
    setUndoAction(null)
  }, [])

  return (
    <UndoCtx.Provider value={{ pushUndo }}>
      {children}
      {undoAction && <UndoBar label={undoAction.label} onUndo={executeUndo} onDismiss={dismissUndo} />}
    </UndoCtx.Provider>
  )
}

export function useUndo() {
  return useContext(UndoCtx) ?? { pushUndo: () => {} }
}

function UndoBar({ label, onUndo, onDismiss }) {
  return (
    <>
      <style>{`
        @keyframes undo-slide { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
      `}</style>
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px', borderRadius: 'var(--r2)',
        background: 'var(--tx1)', color: 'var(--bg1)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'undo-slide 0.2s var(--ease) both',
        fontSize: 13, fontWeight: 500,
      }}>
        <span>{label}</span>
        <button onClick={onUndo} style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
          color: 'var(--bg1)', fontSize: 13, fontWeight: 600, padding: '4px 14px',
          borderRadius: 'var(--r1)', cursor: 'pointer',
        }}>Undo</button>
        <button onClick={onDismiss} style={{
          background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', fontSize: 14, padding: '2px 6px', lineHeight: 1,
        }}>✕</button>
      </div>
    </>
  )
}
