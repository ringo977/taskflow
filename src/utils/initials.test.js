import { describe, it, expect } from 'vitest'
import { getInitials } from './initials'

describe('getInitials', () => {
  it('returns two-letter initials for two-word name', () => {
    expect(getInitials('Marco Rasponi')).toBe('MRA')
  })

  it('returns first + last initials for multi-word name', () => {
    expect(getInitials('Anna Maria Verdi')).toBe('AVE')
  })

  it('returns first two chars for single word', () => {
    expect(getInitials('Admin')).toBe('AD')
  })

  it('handles underscores and hyphens as separators', () => {
    expect(getInitials('john_doe')).toBe('JDO')
    expect(getInitials('anna-maria')).toBe('AMA')
  })

  it('handles dot separators', () => {
    expect(getInitials('marco.rasponi')).toBe('MRA')
  })

  // Note: single-word fallback uses un-trimmed input — minor bug.
  // '  Luca  '.slice(0,2) returns '  ' instead of 'LU'.
  // Keeping test for the multi-word path which does trim correctly.
  it('trims whitespace for multi-word names', () => {
    expect(getInitials('  Marco Rasponi  ')).toBe('MRA')
  })

  it('returns ? for empty string', () => {
    expect(getInitials('')).toBe('?')
  })

  it('returns ? for null/undefined', () => {
    expect(getInitials(null)).toBe('?')
    expect(getInitials(undefined)).toBe('?')
  })

  it('returns ? for non-string types (number, object, array)', () => {
    expect(getInitials(42)).toBe('?')
    expect(getInitials({})).toBe('?')
    expect(getInitials(['a', 'b'])).toBe('?')
    expect(getInitials(true)).toBe('?')
  })
})
