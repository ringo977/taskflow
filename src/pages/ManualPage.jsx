import { useState, useEffect, useMemo } from 'react'
import { T } from './manual/manualI18n'
import { content } from './manual/manualContent'
import { S } from './manual/manualStyles'

export default function ManualPage() {
  const [lang, setLang] = useState(() => {
    try { const v = localStorage.getItem('tf_lang'); return v === 'en' ? 'en' : 'it' } catch { return 'it' }
  })
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tf_theme') ?? 'auto' } catch { return 'auto' }
  })
  const t = T[lang]
  const c = useMemo(() => content(lang), [lang])
  const keys = Object.keys(t.sections)
  const [activeSection, setActiveSection] = useState(keys[0])

  useEffect(() => {
    const apply = () => {
      const resolved = theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme
      document.documentElement.setAttribute('data-theme', resolved)
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    if (theme === 'auto') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])

  const cycleTheme = () => {
    const order = ['dark', 'light', 'auto']
    const next = order[(order.indexOf(theme) + 1) % 3]
    setTheme(next)
    try { localStorage.setItem('tf_theme', next) } catch {}
  }

  const themeIcon = theme === 'dark' ? '\u{1F319}' : theme === 'light' ? '\u2600\uFE0F' : '\u2699\uFE0F'

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { setActiveSection(e.target.id); break }
      }
    }, { rootMargin: '-20% 0px -60% 0px' })
    keys.forEach(k => { const el = document.getElementById(k); if (el) obs.observe(el) })
    return () => obs.disconnect()
  // `keys` is derived from `lang` (section IDs change per language),
  // so `lang` is the true dependency. `setActiveSection` is a stable setter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  return (
    <div style={S.page}>
      {/* ── Inline styles for tables, kbd, etc. ── */}
      <style>{`
        .manual-body table { width: 100%; border-collapse: collapse; margin: 12px 0 16px; font-size: 13px; }
        .manual-body th, .manual-body td { padding: 8px 12px; border: 1px solid var(--bd3); text-align: left; }
        .manual-body th { background: var(--bg1); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; color: var(--tx2); }
        .manual-body td { color: var(--tx2); }
        .manual-body h3 { font-size: 15px; font-weight: 600; margin: 24px 0 8px; color: var(--tx1); }
        .manual-body p { margin: 0 0 12px; color: var(--tx2); }
        .manual-body ul, .manual-body ol { margin: 0 0 12px; padding-left: 24px; color: var(--tx2); }
        .manual-body li { margin-bottom: 4px; }
        .manual-body li strong { color: var(--tx1); }
        .manual-body code { background: var(--bg1); padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: 'SF Mono', 'Fira Code', monospace; color: var(--c-brand); }
        .manual-body kbd { background: var(--bg1); border: 1px solid var(--bd3); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-family: 'SF Mono', monospace; color: var(--tx1); box-shadow: 0 1px 0 var(--bd3); }
        @media (max-width: 768px) { .manual-sidebar { display: none !important; } .manual-layout { gap: 0 !important; } }
      `}</style>

      <div style={S.header}>
        <div style={S.topBar}>
          <a href="/taskflow/" style={S.backBtn}>
            <span style={{ fontSize: 16 }}>&#8592;</span> {t.backToApp}
          </a>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={S.langBtn} onClick={cycleTheme} title={theme}>
              {themeIcon}
            </button>
            <button style={S.langBtn} onClick={() => setLang(l => l === 'it' ? 'en' : 'it')}>
              {t.switchLang}
            </button>
          </div>
        </div>
        <h1 style={S.title}>{t.title}</h1>
        <p style={S.subtitle}>{t.subtitle}</p>
      </div>

      <div className="manual-layout" style={S.layout}>
        {/* ── TOC sidebar ── */}
        <nav className="manual-sidebar" style={S.sidebar}>
          <div style={S.tocTitle}>{t.toc}</div>
          {keys.map(k => (
            <a
              key={k}
              href={`#${k}`}
              style={S.tocLink(activeSection === k)}
              onClick={(e) => { e.preventDefault(); document.getElementById(k)?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              {t.sections[k]}
            </a>
          ))}
        </nav>

        {/* ── Content ── */}
        <main className="manual-body" style={S.main}>
          {keys.map(k => (
            <section key={k} id={k} style={S.section}>
              <h2 style={S.sectionTitle}>{t.sections[k]}</h2>
              {c[k]}
            </section>
          ))}

          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--tx3)' }}>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              style={{ color: 'var(--tx3)', textDecoration: 'none', fontSize: 13 }}
            >
              ↑ {t.backToTop}
            </a>
            <span style={{ margin: '0 12px', opacity: 0.3 }}>·</span>
            <span style={{ fontSize: 12, opacity: 0.4 }}>TaskFlow v0.5.0 — MiMic Lab, Politecnico di Milano</span>
          </div>
        </main>
      </div>
    </div>
  )
}
