import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, setErrorSink } from './logger'

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    setErrorSink(null) // reset module-level sink between tests
    vi.restoreAllMocks()
  })

  it('info logs with the [TaskFlow:module] tag', () => {
    logger('Boot').info('started', 42)
    // eslint-disable-next-line no-console
    expect(console.info).toHaveBeenCalledWith('[TaskFlow:Boot]', 'started', 42)
  })

  it('warn logs with the [TaskFlow:module] tag', () => {
    logger('Sync').warn('fallback used')
    expect(console.warn).toHaveBeenCalledWith('[TaskFlow:Sync]', 'fallback used')
  })

  it('error logs with the [TaskFlow:module] tag', () => {
    logger('RuleEngine').error('boom')
    expect(console.error).toHaveBeenCalledWith('[TaskFlow:RuleEngine]', 'boom')
  })

  it('error without an Error argument does not invoke the sink', () => {
    const sink = vi.fn()
    setErrorSink(sink)
    logger('Mod').error('just a string', { detail: 1 })
    expect(sink).not.toHaveBeenCalled()
  })

  it('error forwards the first Error argument to the sink', () => {
    const sink = vi.fn()
    setErrorSink(sink)
    const err = new Error('kaboom')
    logger('Mod').error('context', err)
    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink).toHaveBeenCalledWith(err, { module: 'Mod', args: ['context', err] })
  })

  it('error forwards only the first Error when multiple are passed', () => {
    const sink = vi.fn()
    setErrorSink(sink)
    const first = new Error('first')
    const second = new Error('second')
    logger('Mod').error(first, second)
    expect(sink).toHaveBeenCalledTimes(1)
    expect(sink.mock.calls[0][0]).toBe(first)
  })

  it('error with an Error but no sink wired does not throw', () => {
    expect(() => logger('Mod').error(new Error('unwired'))).not.toThrow()
    expect(console.error).toHaveBeenCalled()
  })

  it('setErrorSink ignores non-function values', () => {
    setErrorSink('not a function')
    // sink must stay null → no throw, nothing invoked
    expect(() => logger('Mod').error(new Error('x'))).not.toThrow()
  })

  it('setErrorSink(null) detaches a previously wired sink', () => {
    const sink = vi.fn()
    setErrorSink(sink)
    setErrorSink(null)
    logger('Mod').error(new Error('detached'))
    expect(sink).not.toHaveBeenCalled()
  })
})
