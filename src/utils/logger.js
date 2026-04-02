/**
 * Structured logger for TaskFlow.
 *
 * All console output goes through these helpers so we can:
 *  1. Grep logs consistently (every message starts with [TaskFlow:<module>])
 *  2. Optionally report to an external service (Sentry, etc.) later
 *  3. Distinguish severity levels clearly
 *
 * Usage:
 *   import { logger } from '@/utils/logger'
 *   const log = logger('RuleEngine')
 *   log.warn('Webhook failed', { url, err })
 *   log.error('Unexpected', err)
 */

const PREFIX = 'TaskFlow'

/**
 * Error sink — a single place to wire up Sentry or another
 * reporting service.  For now it's a no-op but any `log.error()`
 * call that passes an Error object will flow through here.
 */
let _errorSink = null

/** Attach an external error reporter (e.g. Sentry.captureException). */
export function setErrorSink(fn) {
  _errorSink = typeof fn === 'function' ? fn : null
}

function fmt(module) {
  return `[${PREFIX}:${module}]`
}

export function logger(module) {
  const tag = fmt(module)
  return {
    /** Informational — routine events (startup, cleanup). */
    // eslint-disable-next-line no-console
    info: (...args) => console.info(tag, ...args),

    /** Non-critical — recoverable failures, intentional fallbacks. */
    warn: (...args) => console.warn(tag, ...args),

    /** Critical — unexpected failures that need investigation. */
    error: (...args) => {
      console.error(tag, ...args)
      // Forward Error objects to the external sink if wired.
      for (const a of args) {
        if (a instanceof Error) { _errorSink?.(a, { module, args }); break }
      }
    },
  }
}
