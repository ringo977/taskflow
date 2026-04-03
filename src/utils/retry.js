import { logger } from '@/utils/logger'

const log = logger('Retry')

/**
 * Transient error detection — only retry errors that are likely to resolve.
 * Covers: network failures, rate limits, Supabase 5xx, connection resets.
 */
const TRANSIENT_CODES = new Set(['PGRST301', '08000', '08006', '57P03', '53300'])

function isTransient(err) {
  if (!err) return false
  const msg = (err.message ?? '').toLowerCase()
  const code = err.code ?? ''

  // Network / fetch failures
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('econnreset')) return true
  // Rate limiting
  if (err.status === 429 || msg.includes('rate limit') || msg.includes('too many')) return true
  // Server errors (5xx)
  if (err.status >= 500 && err.status < 600) return true
  // PostgreSQL transient codes
  if (TRANSIENT_CODES.has(code)) return true

  return false
}

/**
 * withRetry — retry an async function with exponential backoff + jitter.
 *
 * Only retries transient errors (network, rate limit, 5xx).
 * Non-transient errors (validation, auth, constraint violations) throw immediately.
 *
 * @param {Function} fn         - async function to execute
 * @param {Object}   [opts]
 * @param {number}   [opts.maxAttempts=3]  - total attempts (1 = no retry)
 * @param {number}   [opts.baseDelay=200]  - initial delay in ms
 * @param {number}   [opts.maxDelay=2000]  - max delay cap in ms
 * @param {string}   [opts.label='op']     - label for log messages
 * @returns {Promise<*>} result of fn()
 */
export async function withRetry(fn, {
  maxAttempts = 3,
  baseDelay = 200,
  maxDelay = 2000,
  label = 'op',
} = {}) {
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      // Non-transient → fail fast, no retry
      if (!isTransient(err)) throw err

      if (attempt < maxAttempts) {
        // Exponential backoff with jitter: delay = min(base * 2^(attempt-1) + jitter, max)
        const exp = baseDelay * Math.pow(2, attempt - 1)
        const jitter = Math.random() * baseDelay
        const delay = Math.min(exp + jitter, maxDelay)
        log.warn(`${label}: attempt ${attempt}/${maxAttempts} failed (${err.message}), retrying in ${Math.round(delay)}ms`)
        await sleep(delay)
      }
    }
  }
  log.error(`${label}: all ${maxAttempts} attempts failed`)
  throw lastError
}

/** @internal Testable sleep wrapper — accessed via `_sleep` for mockability. */
export const _sleep = { fn: ms => new Promise(resolve => setTimeout(resolve, ms)) }
export function sleep(ms) { return _sleep.fn(ms) }

// Re-export for direct use in tests
export { isTransient }
