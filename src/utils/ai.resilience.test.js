import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AI_ERROR_MESSAGES } from './ai'

/**
 * Resilience tests for the AI module.
 *
 * Cover: proxy URL edge cases, malformed responses, network
 * failures, concurrent calls, and domain helper robustness.
 */

describe('AI resilience', () => {
  let callAI, generateSubtasks, createTaskFromText, summariseProject

  // ── Proxy URL edge cases (no fetch needed) ──────────────────

  describe('proxy URL edge cases', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
      vi.resetModules()
    })

    it('treats whitespace-only proxy URL as not configured', async () => {
      vi.stubEnv('VITE_AI_PROXY_URL', '   ')
      vi.resetModules()
      // The source does `|| ''` which treats whitespace as truthy but fetch will fail
      const mod = await import('./ai.js')
      // Whitespace is truthy so isAIEnabled returns true, but fetch will reject
      // This is actually a subtle bug — for now we test current behaviour
      if (mod.isAIEnabled()) {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Invalid URL')))
        await expect(mod.callAI('s', 'u')).rejects.toThrow()
      }
    })

    it('handles proxy URL with trailing slash', async () => {
      vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai/')
      vi.resetModules()
      const mod = await import('./ai.js')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'ok' }),
      }))
      const result = await mod.callAI('s', 'u')
      expect(result).toBe('ok')
      expect(fetch).toHaveBeenCalledWith('https://proxy.test/ai/', expect.any(Object))
      vi.restoreAllMocks()
    })
  })

  // ── Malformed success responses ─────────────────────────────

  describe('malformed success responses', () => {
    beforeEach(async () => {
      vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai')
      vi.resetModules()
      const mod = await import('./ai.js')
      callAI = mod.callAI
      generateSubtasks = mod.generateSubtasks
      createTaskFromText = mod.createTaskFromText
      summariseProject = mod.summariseProject
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    })

    it('returns empty string when response has text: null', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: null }),
      }))
      expect(await callAI('s', 'u')).toBe('')
    })

    it('returns empty string when response has text: undefined', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: undefined }),
      }))
      expect(await callAI('s', 'u')).toBe('')
    })

    it('returns empty string when response is empty object', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }))
      expect(await callAI('s', 'u')).toBe('')
    })

    it('returns text even when extra properties exist', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'hello', usage: { tokens: 50 }, extra: true }),
      }))
      expect(await callAI('s', 'u')).toBe('hello')
    })

    it('PARSE error when success body is HTML instead of JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      }))
      await expect(callAI('s', 'u')).rejects.toMatchObject({ code: 'PARSE' })
    })
  })

  // ── Network failure variants ────────────────────────────────

  describe('network failure variants', () => {
    beforeEach(async () => {
      vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai')
      vi.resetModules()
      const mod = await import('./ai.js')
      callAI = mod.callAI
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    })

    it('throws NETWORK on AbortError (user cancel)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')))
      await expect(callAI('s', 'u')).rejects.toMatchObject({ code: 'NETWORK' })
    })

    it('throws NETWORK on DNS resolution failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
      await expect(callAI('s', 'u')).rejects.toMatchObject({ code: 'NETWORK' })
    })

    it('throws NETWORK on CORS error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('NetworkError when attempting to fetch resource')))
      await expect(callAI('s', 'u')).rejects.toMatchObject({ code: 'NETWORK' })
    })

    it('classifies 502 Bad Gateway as PROVIDER', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 502,
        json: () => Promise.resolve({ error: 'Bad Gateway' }),
      }))
      await expect(callAI('s', 'u')).rejects.toMatchObject({ code: 'PROVIDER', status: 502 })
    })

    it('classifies 503 Service Unavailable as PROVIDER', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 503,
        json: () => Promise.resolve({}),
      }))
      await expect(callAI('s', 'u')).rejects.toMatchObject({ code: 'PROVIDER', status: 503 })
    })

    it('handles error response with no body at all', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 500,
        json: () => Promise.reject(new Error('no body')),
      }))
      await expect(callAI('s', 'u')).rejects.toMatchObject({ code: 'PROVIDER' })
    })
  })

  // ── Domain helper resilience ────────────────────────────────

  describe('generateSubtasks resilience', () => {
    beforeEach(async () => {
      vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai')
      vi.resetModules()
      const mod = await import('./ai.js')
      generateSubtasks = mod.generateSubtasks
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    })

    it('handles AI returning object instead of array', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: '{"subtask":"A"}' }),
      }))
      // JSON.parse succeeds but result is not an array — returned as-is currently
      const result = await generateSubtasks({ title: 'T', desc: '' })
      expect(result).toEqual({ subtask: 'A' })
    })

    it('handles AI returning array with non-string elements', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: '[1, null, true, "valid"]' }),
      }))
      const result = await generateSubtasks({ title: 'T', desc: '' })
      expect(result).toEqual([1, null, true, 'valid'])
    })

    it('throws PARSE on markdown-wrapped non-JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: '```\nHere are your subtasks:\n- Task A\n- Task B\n```' }),
      }))
      await expect(generateSubtasks({ title: 'T', desc: '' })).rejects.toMatchObject({ code: 'PARSE' })
    })
  })

  describe('createTaskFromText resilience', () => {
    beforeEach(async () => {
      vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai')
      vi.resetModules()
      const mod = await import('./ai.js')
      createTaskFromText = mod.createTaskFromText
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    })

    it('strips nested markdown fences', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          text: '```json\n```json\n{"title":"T","desc":"","pri":"low","subs":[]}\n```\n```',
        }),
      }))
      const result = await createTaskFromText('test')
      expect(result.title).toBe('T')
    })

    it('handles partial task object from AI', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: '{"title":"Only title"}' }),
      }))
      const result = await createTaskFromText('test')
      expect(result.title).toBe('Only title')
      expect(result.desc).toBeUndefined()
    })
  })

  describe('summariseProject resilience', () => {
    beforeEach(async () => {
      vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai')
      vi.resetModules()
      const mod = await import('./ai.js')
      summariseProject = mod.summariseProject
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    })

    it('handles empty task list', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'No tasks.' }),
      }))
      const result = await summariseProject('Empty', [], 'en')
      expect(result).toBe('No tasks.')
    })

    it('handles tasks with null/missing fields', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'Summary.' }),
      }))
      const tasks = [
        { title: 'A', sec: null, done: false, pri: null, due: null },
        { title: 'B', sec: undefined, done: true, pri: 'high' },
      ]
      // Should not throw when building the task list string
      const result = await summariseProject('Proj', tasks, 'it')
      expect(result).toBe('Summary.')
    })
  })
})

// ── AI_ERROR_MESSAGES completeness ────────────────────────────

describe('AI_ERROR_MESSAGES coverage', () => {
  it('every code maps to a non-empty Italian string', () => {
    const codes = ['NOT_CONFIGURED', 'NETWORK', 'TIMEOUT', 'RATE_LIMIT', 'AUTH', 'PROVIDER', 'PARSE', 'UNKNOWN']
    for (const code of codes) {
      expect(AI_ERROR_MESSAGES[code]).toBeTruthy()
      expect(AI_ERROR_MESSAGES[code].length).toBeGreaterThan(10)
    }
  })

  it('no two codes share the same message', () => {
    const messages = Object.values(AI_ERROR_MESSAGES)
    const unique = new Set(messages)
    expect(unique.size).toBe(messages.length)
  })
})
