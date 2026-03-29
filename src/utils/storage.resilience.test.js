import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storage, sidebarStorage, seedStorage, signupOrgStorage } from './storage'

/**
 * Resilience tests for the storage layer.
 *
 * Cover: corrupted JSON, quota exhaustion, invalid types,
 * missing/undefined keys, and edge characters.
 */

beforeEach(() => localStorage.clear())

describe('storage resilience', () => {

  // ── Corrupted JSON in localStorage ──────────────────────────

  describe('corrupted JSON recovery', () => {
    it('returns fallback when value is truncated JSON', () => {
      localStorage.setItem('tf_data', '{"a":1,"b":')
      expect(storage.get('data', 'safe')).toBe('safe')
    })

    it('returns fallback when value is plain text', () => {
      localStorage.setItem('tf_data', 'hello world')
      expect(storage.get('data', [])).toEqual([])
    })

    it('returns fallback when value is empty string', () => {
      localStorage.setItem('tf_data', '')
      expect(storage.get('data', 'default')).toBe('default')
    })

    it('returns fallback when value is "undefined"', () => {
      localStorage.setItem('tf_data', 'undefined')
      expect(storage.get('data', 42)).toBe(42)
    })

    it('returns fallback when value is "NaN"', () => {
      localStorage.setItem('tf_data', 'NaN')
      expect(storage.get('data', 0)).toBe(0)
    })

    it('handles value that is valid JSON but unexpected type (number stored, object expected)', () => {
      storage.set('layout', 42)
      // Caller expects an object but gets a number — storage returns it as-is
      const result = storage.get('layout', [])
      expect(result).toBe(42)
    })

    it('handles deeply nested corrupted JSON', () => {
      localStorage.setItem('tf_deep', '{"a":{"b":{"c":')
      expect(storage.get('deep', null)).toBeNull()
    })

    it('handles HTML/script injection in stored value', () => {
      localStorage.setItem('tf_xss', '"<script>alert(1)</script>"')
      expect(storage.get('xss')).toBe('<script>alert(1)</script>')
    })

    it('handles null literal stored as string', () => {
      localStorage.setItem('tf_n', 'null')
      // JSON.parse('null') === null, but raw is truthy so we return parsed null
      expect(storage.get('n', 'fallback')).toBeNull()
    })
  })

  // ── localStorage quota exhaustion ──────────────────────────

  describe('quota exhaustion', () => {
    it('logs warning when write fails (quota)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Override setItem on the prototype to simulate quota error
      const proto = Object.getPrototypeOf(localStorage)
      const origSetItem = proto.setItem
      proto.setItem = function () {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      }

      // Should not throw
      storage.set('big', 'x'.repeat(100))
      expect(warnSpy).toHaveBeenCalledWith('localStorage write failed:', expect.any(DOMException))

      proto.setItem = origSetItem
      warnSpy.mockRestore()
    })

    it('get still works after a failed write', () => {
      storage.set('before', 'ok')

      // Temporarily break setItem
      const proto = Object.getPrototypeOf(localStorage)
      const origSetItem = proto.setItem
      let callCount = 0
      proto.setItem = function (...args) {
        if (callCount++ === 0) throw new DOMException('QuotaExceededError')
        return origSetItem.apply(this, args)
      }
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      storage.set('fail', 'data')

      proto.setItem = origSetItem
      vi.restoreAllMocks()

      // Previous data still accessible
      expect(storage.get('before')).toBe('ok')
    })
  })

  // ── Edge-case keys ─────────────────────────────────────────

  describe('edge-case keys', () => {
    it('handles empty string key', () => {
      storage.set('', 'val')
      expect(storage.get('')).toBe('val')
    })

    it('handles key with special characters', () => {
      storage.set('a.b/c:d', 123)
      expect(storage.get('a.b/c:d')).toBe(123)
    })

    it('handles very long key', () => {
      const longKey = 'k'.repeat(200)
      storage.set(longKey, 'v')
      expect(storage.get(longKey)).toBe('v')
    })
  })

  // ── Edge-case values ───────────────────────────────────────

  describe('edge-case values', () => {
    it('stores and retrieves null', () => {
      storage.set('x', null)
      expect(storage.get('x', 'fallback')).toBeNull()
    })

    it('stores and retrieves empty array', () => {
      storage.set('arr', [])
      expect(storage.get('arr')).toEqual([])
    })

    it('stores and retrieves empty object', () => {
      storage.set('obj', {})
      expect(storage.get('obj')).toEqual({})
    })

    it('stores and retrieves empty string', () => {
      storage.set('s', '')
      expect(storage.get('s', 'fallback')).toBe('')
    })

    it('handles unicode values', () => {
      storage.set('emoji', '🚀 τεστ 日本語')
      expect(storage.get('emoji')).toBe('🚀 τεστ 日本語')
    })

    it('handles very large object', () => {
      const big = { items: Array.from({ length: 500 }, (_, i) => ({ id: i, name: `item_${i}` })) }
      storage.set('big', big)
      expect(storage.get('big').items).toHaveLength(500)
    })
  })

  // ── remove/clear resilience ────────────────────────────────

  describe('remove/clear resilience', () => {
    it('remove on non-existent key does not throw', () => {
      expect(() => storage.remove('nope')).not.toThrow()
    })

    it('clear with no tf_ keys does not throw', () => {
      localStorage.setItem('other', 'value')
      expect(() => storage.clear()).not.toThrow()
      expect(localStorage.getItem('other')).toBe('value')
    })

    it('remove when localStorage throws does not propagate', () => {
      vi.spyOn(localStorage, 'removeItem').mockImplementationOnce(() => {
        throw new Error('SecurityError')
      })
      expect(() => storage.remove('key')).not.toThrow()
      vi.restoreAllMocks()
    })
  })
})

// ── Dashboard layout recovery scenarios ─────────────────────

describe('dashboard layout localStorage recovery', () => {
  /**
   * These test the same parsing logic used in HomeDashboard.jsx
   * for reading tf_dashboard_layout from localStorage.
   */

  const WIDGET_REGISTRY = [
    { id: 'deadlines', defaultSize: 'half' },
    { id: 'activity', defaultSize: 'half' },
    { id: 'health', defaultSize: 'full' },
    { id: 'tasksPerson', defaultSize: 'half' },
    { id: 'byPriority', defaultSize: 'half' },
  ]
  const DEFAULT_LAYOUT = WIDGET_REGISTRY.map(w => ({ id: w.id, visible: true, size: w.defaultSize }))

  /** Mirrors HomeDashboard init logic */
  function parseDashboardLayout(raw) {
    try {
      if (!raw) return DEFAULT_LAYOUT
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return DEFAULT_LAYOUT
      // Merge with registry to handle new widgets
      const ids = new Set(parsed.map(w => w.id))
      const merged = [
        ...parsed,
        ...WIDGET_REGISTRY.filter(w => !ids.has(w.id)).map(w => ({ id: w.id, visible: true, size: w.defaultSize })),
      ]
      return merged
    } catch {
      return DEFAULT_LAYOUT
    }
  }

  beforeEach(() => localStorage.clear())

  it('returns default layout when localStorage is empty', () => {
    const result = parseDashboardLayout(null)
    expect(result).toEqual(DEFAULT_LAYOUT)
  })

  it('returns default layout for corrupted JSON', () => {
    const result = parseDashboardLayout('{not valid')
    expect(result).toEqual(DEFAULT_LAYOUT)
  })

  it('returns default layout when stored value is not an array', () => {
    const result = parseDashboardLayout(JSON.stringify({ id: 'deadlines' }))
    expect(result).toEqual(DEFAULT_LAYOUT)
  })

  it('returns default layout when stored value is a string', () => {
    const result = parseDashboardLayout('"deadlines"')
    expect(result).toEqual(DEFAULT_LAYOUT)
  })

  it('returns default layout for number', () => {
    const result = parseDashboardLayout('42')
    expect(result).toEqual(DEFAULT_LAYOUT)
  })

  it('merges new widgets when registry grows', () => {
    // Stored layout has only 2 widgets (old version)
    const stored = [
      { id: 'deadlines', visible: true, size: 'full' },
      { id: 'activity', visible: false, size: 'half' },
    ]
    const result = parseDashboardLayout(JSON.stringify(stored))
    // Should keep user preferences for existing widgets
    expect(result[0]).toEqual({ id: 'deadlines', visible: true, size: 'full' })
    expect(result[1]).toEqual({ id: 'activity', visible: false, size: 'half' })
    // Should add missing widgets from registry
    expect(result.length).toBe(5)
    expect(result.find(w => w.id === 'health')).toEqual({ id: 'health', visible: true, size: 'full' })
  })

  it('preserves unknown widget ids (forward-compat)', () => {
    const stored = [
      { id: 'deadlines', visible: true, size: 'half' },
      { id: 'future_widget', visible: true, size: 'full' },
    ]
    const result = parseDashboardLayout(JSON.stringify(stored))
    expect(result.find(w => w.id === 'future_widget')).toBeDefined()
  })

  it('handles stored widgets with missing properties', () => {
    const stored = [{ id: 'deadlines' }] // missing visible and size
    const result = parseDashboardLayout(JSON.stringify(stored))
    expect(result[0].id).toBe('deadlines')
    // Missing props remain undefined — consumer must handle
    expect(result.length).toBe(5) // merged with remaining registry widgets
  })

  it('handles empty array (all widgets removed)', () => {
    const result = parseDashboardLayout('[]')
    // All widgets re-added from registry
    expect(result).toEqual(DEFAULT_LAYOUT)
  })

  it('handles duplicate widget ids in stored data', () => {
    const stored = [
      { id: 'deadlines', visible: true, size: 'half' },
      { id: 'deadlines', visible: false, size: 'full' },
    ]
    const result = parseDashboardLayout(JSON.stringify(stored))
    // Both kept — Set only tracks ids for merging, doesn't dedup
    const deadlines = result.filter(w => w.id === 'deadlines')
    expect(deadlines.length).toBe(2)
  })

  it('handles array of non-objects', () => {
    const result = parseDashboardLayout('[1, 2, 3]')
    // Numbers don't have .id so they fail to merge — but won't throw
    expect(result.length).toBeGreaterThanOrEqual(3)
  })
})
