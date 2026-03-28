import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIError, AI_ERROR_MESSAGES } from './ai'

// ── AIError class ──────────────────────────────────────────────

describe('AIError', () => {
  it('is an instance of Error', () => {
    const err = new AIError('test', 'NETWORK')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AIError)
  })

  it('carries code and status properties', () => {
    const err = new AIError('timeout', 'TIMEOUT', 408)
    expect(err.message).toBe('timeout')
    expect(err.code).toBe('TIMEOUT')
    expect(err.status).toBe(408)
    expect(err.name).toBe('AIError')
  })

  it('defaults status to null', () => {
    const err = new AIError('msg', 'UNKNOWN')
    expect(err.status).toBeNull()
  })
})

// ── AI_ERROR_MESSAGES ──────────────────────────────────────────

describe('AI_ERROR_MESSAGES', () => {
  it('has messages for all known error codes', () => {
    const codes = ['NOT_CONFIGURED', 'NETWORK', 'TIMEOUT', 'RATE_LIMIT', 'AUTH', 'PROVIDER', 'PARSE', 'UNKNOWN']
    for (const code of codes) {
      expect(AI_ERROR_MESSAGES[code]).toBeDefined()
      expect(typeof AI_ERROR_MESSAGES[code]).toBe('string')
      expect(AI_ERROR_MESSAGES[code].length).toBeGreaterThan(5)
    }
  })
})

// ── AI module with proxy not configured ────────────────────────

describe('AI module (proxy not configured)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('isAIEnabled returns false when VITE_AI_PROXY_URL is not set', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '')
    const { isAIEnabled } = await import('./ai.js')
    expect(isAIEnabled()).toBe(false)
  })

  it('callAI throws AIError with NOT_CONFIGURED code', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '')
    const { callAI } = await import('./ai.js')
    try {
      await callAI('system', 'user')
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AIError)
      expect(e.code).toBe('NOT_CONFIGURED')
    }
  })

  it('generateSubtasks throws when proxy is not configured', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '')
    const { generateSubtasks } = await import('./ai.js')
    await expect(generateSubtasks({ title: 'Test', desc: '', subs: [] })).rejects.toThrow()
  })

  it('createTaskFromText throws when proxy is not configured', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '')
    const { createTaskFromText } = await import('./ai.js')
    await expect(createTaskFromText('buy milk')).rejects.toThrow()
  })

  it('summariseProject throws when proxy is not configured', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '')
    const { summariseProject } = await import('./ai.js')
    await expect(summariseProject('Test', [], 'it')).rejects.toThrow()
  })
})
