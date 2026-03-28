import { describe, it, expect } from 'vitest'
import { fmtDate, todayStr, futureDateStr } from './format'

describe('fmtDate', () => {
  it('returns empty string for falsy input', () => {
    expect(fmtDate(null)).toBe('')
    expect(fmtDate(undefined)).toBe('')
    expect(fmtDate('')).toBe('')
  })

  it('formats a date string in Italian by default', () => {
    const result = fmtDate('2026-03-15')
    // Should contain "15" and a month abbreviation
    expect(result).toContain('15')
  })

  it('formats a date string in English', () => {
    const result = fmtDate('2026-03-15', 'en')
    expect(result).toContain('15')
  })
})

describe('todayStr', () => {
  it('returns a YYYY-MM-DD string', () => {
    const today = todayStr()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('futureDateStr', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(futureDateStr(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a date in the future', () => {
    const future = futureDateStr(30)
    expect(new Date(future).getTime()).toBeGreaterThan(Date.now())
  })
})
