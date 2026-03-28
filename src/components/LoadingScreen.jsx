/**
 * LoadingScreen — animated skeleton layout shown during app bootstrap.
 * Replaces the old static spinner with a shimmer skeleton that
 * hints at the upcoming layout (sidebar + content area).
 */
export default function LoadingScreen({ message }) {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skel {
          background: linear-gradient(90deg, var(--bg2) 25%, color-mix(in srgb, var(--tx3) 8%, var(--bg2)) 37%, var(--bg2) 63%);
          background-size: 800px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: var(--r1);
        }
        .skel-pulse {
          animation: shimmer 1.4s ease-in-out infinite, fadeInSkel 0.4s ease both;
        }
        @keyframes fadeInSkel { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div style={{ position: 'fixed', inset: 0, display: 'flex', background: 'var(--bg3)', zIndex: 10 }}>
        {/* Icon sidebar skeleton */}
        <div style={{ width: 68, background: 'var(--bg1)', borderRight: '1px solid var(--bd3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
          <div className="skel" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skel" style={{ width: 28, height: 28, borderRadius: 'var(--r1)', animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </div>

        {/* Context sidebar skeleton */}
        <div style={{ width: 240, background: 'var(--bg1)', borderRight: '1px solid var(--bd3)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="skel" style={{ width: '70%', height: 14, marginBottom: 8 }} />
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, animationDelay: `${i * 60}ms` }}>
              <div className="skel" style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }} />
              <div className="skel" style={{ height: 12, flex: 1, animationDelay: `${i * 60}ms` }} />
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--bd3)', margin: '12px 0' }} />
          <div className="skel" style={{ width: '50%', height: 12, marginBottom: 6 }} />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skel" style={{ height: 12, width: `${70 - i * 10}%`, animationDelay: `${(i + 5) * 60}ms` }} />
          ))}
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div className="skel" style={{ width: 160, height: 20 }} />
            <div style={{ flex: 1 }} />
            <div className="skel" style={{ width: 80, height: 28, borderRadius: 'var(--r1)' }} />
            <div className="skel" style={{ width: 80, height: 28, borderRadius: 'var(--r1)' }} />
          </div>

          {/* Card rows */}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skel-pulse" style={{ display: 'flex', gap: 12, animationDelay: `${i * 100}ms` }}>
              <div className="skel" style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skel" style={{ height: 14, width: `${85 - i * 8}%` }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <div className="skel" style={{ height: 10, width: 50 }} />
                  <div className="skel" style={{ height: 10, width: 70 }} />
                </div>
              </div>
              <div className="skel" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
            </div>
          ))}

          {/* Loading message */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 'auto', paddingBottom: 20 }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ animation: 'fadeInSkel 0.5s ease both' }}>
              <rect x="1" y="3.5" width="10" height="3.5" rx="1.5" fill="var(--tx1)"/>
              <rect x="4" y="9" width="10" height="3.5" rx="1.5" fill="var(--tx1)" opacity="0.7"/>
              <rect x="7" y="14.5" width="9" height="3" rx="1.5" fill="var(--tx1)" opacity="0.45"/>
              <path d="M14 2.5L17.5 6L14 9.5" stroke="var(--tx1)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
            </svg>
            <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{message}</div>
          </div>
        </div>
      </div>
    </>
  )
}
