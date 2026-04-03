import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withRetry, isTransient, _sleep } from './retry'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

// Spy on _sleep.fn to avoid real delays
const sleepSpy = vi.fn().mockResolvedValue(undefined)

describe('isTransient', () => {
  it('returns false for null/undefined', () => {
    expect(isTransient(null)).toBe(false)
    expect(isTransient(undefined)).toBe(false)
  })

  it('detects network errors', () => {
    expect(isTransient(new Error('Failed to fetch'))).toBe(true)
    expect(isTransient(new Error('NetworkError when attempting'))).toBe(true)
    expect(isTransient(new Error('ECONNRESET'))).toBe(true)
  })

  it('detects rate limit errors', () => {
    expect(isTransient({ message: 'rate limit exceeded', status: 429 })).toBe(true)
    expect(isTransient({ message: 'too many requests', status: 429 })).toBe(true)
  })

  it('detects server errors (5xx)', () => {
    expect(isTransient({ message: 'Internal Server Error', status: 500 })).toBe(true)
    expect(isTransient({ message: 'Bad Gateway', status: 502 })).toBe(true)
    expect(isTransient({ message: 'Service Unavailable', status: 503 })).toBe(true)
  })

  it('detects PostgreSQL transient codes', () => {
    expect(isTransient({ message: 'connection', code: '08000' })).toBe(true)
    expect(isTransient({ message: 'connection reset', code: '08006' })).toBe(true)
  })

  it('returns false for non-transient errors', () => {
    expect(isTransient(new Error('unique constraint violated'))).toBe(false)
    expect(isTransient(new Error('permission denied'))).toBe(false)
    expect(isTransient({ message: 'not found', status: 404 })).toBe(false)
    expect(isTransient({ message: 'bad request', status: 400 })).toBe(false)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _sleep.fn = sleepSpy
  })

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn, { maxAttempts: 3 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on transient error then succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ message: 'Failed to fetch', status: 0 })
      .mockResolvedValueOnce('recovered')
    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 10 })
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(sleepSpy).toHaveBeenCalledTimes(1)
  })

  it('throws immediately on non-transient error', async () => {
    const err = new Error('unique constraint violated')
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow('unique constraint violated')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleepSpy).not.toHaveBeenCalled()
  })

  it('exhausts all attempts on persistent transient error', async () => {
    const err = { message: 'Failed to fetch', status: 0 }
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, { maxAttempts: 3, baseDelay: 10 })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sleepSpy).toHaveBeenCalledTimes(2) // between attempts 1→2 and 2→3
  })

  it('respects maxAttempts=1 (no retry)', async () => {
    const err = { message: 'Failed to fetch', status: 0 }
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, { maxAttempts: 1 })).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleepSpy).not.toHaveBeenCalled()
  })

  it('applies exponential backoff with jitter', async () => {
    const err = { message: 'Service Unavailable', status: 503 }
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce('ok')

    await withRetry(fn, { maxAttempts: 3, baseDelay: 100, maxDelay: 2000 })

    expect(sleepSpy).toHaveBeenCalledTimes(2)
    // First delay: 100 * 2^0 + jitter ∈ [100, 200)
    const d1 = sleepSpy.mock.calls[0][0]
    expect(d1).toBeGreaterThanOrEqual(100)
    expect(d1).toBeLessThan(200)
    // Second delay: 100 * 2^1 + jitter ∈ [200, 300)
    const d2 = sleepSpy.mock.calls[1][0]
    expect(d2).toBeGreaterThanOrEqual(200)
    expect(d2).toBeLessThan(300)
  })

  it('caps delay at maxDelay', async () => {
    const err = { message: 'Failed to fetch', status: 0 }
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce('ok')

    await withRetry(fn, { maxAttempts: 5, baseDelay: 500, maxDelay: 800 })

    // All delays should be ≤ maxDelay
    for (const call of sleepSpy.mock.calls) {
      expect(call[0]).toBeLessThanOrEqual(800)
    }
  })

  it('uses default options', async () => {
    const fn = vi.fn().mockResolvedValue('default')
    const result = await withRetry(fn)
    expect(result).toBe('default')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('handles rate limit (429) as transient', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ message: 'Too Many Requests', status: 429 })
      .mockResolvedValueOnce('ok')
    const result = await withRetry(fn, { maxAttempts: 2, baseDelay: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
