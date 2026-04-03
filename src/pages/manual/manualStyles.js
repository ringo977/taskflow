export const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg3)',
    color: 'var(--tx1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif',
    lineHeight: 1.7,
    fontSize: 14,
  },
  header: {
    borderBottom: '1px solid var(--bd3)',
    padding: '32px 0 24px',
    textAlign: 'center',
  },
  title: {
    fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px',
    color: 'var(--tx1)',
  },
  subtitle: {
    fontSize: 14, color: 'var(--tx3)', margin: 0, fontWeight: 400,
  },
  layout: {
    maxWidth: 900, margin: '0 auto', padding: '0 24px 64px', display: 'flex', gap: 48,
  },
  sidebar: {
    position: 'sticky', top: 24, alignSelf: 'flex-start',
    width: 200, flexShrink: 0, paddingTop: 32,
  },
  main: {
    flex: 1, minWidth: 0, paddingTop: 32,
  },
  tocTitle: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
    color: 'var(--tx3)', margin: '0 0 12px',
  },
  tocLink: (active) => ({
    display: 'block', padding: '4px 10px', borderRadius: 6, fontSize: 13,
    color: active ? 'var(--tx1)' : 'var(--tx3)',
    background: active ? 'var(--bg1)' : 'transparent',
    textDecoration: 'none', cursor: 'pointer', fontWeight: active ? 500 : 400,
    transition: 'all 0.15s',
    marginBottom: 2,
  }),
  section: {
    marginBottom: 48, scrollMarginTop: 24,
  },
  sectionTitle: {
    fontSize: 20, fontWeight: 600, margin: '0 0 16px', paddingBottom: 8,
    borderBottom: '1px solid var(--bd3)', color: 'var(--tx1)',
  },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    maxWidth: 900, margin: '0 auto', padding: '0 24px',
  },
  langBtn: {
    fontSize: 12, fontWeight: 600, padding: '4px 12px', border: '1px solid var(--bd3)',
    borderRadius: 6, color: 'var(--tx3)', background: 'transparent', cursor: 'pointer',
  },
  backBtn: {
    fontSize: 12, color: 'var(--tx3)', textDecoration: 'none',
    display: 'flex', alignItems: 'center', gap: 4,
  },
}
