import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

// ── callAI with mocked fetch ────────────────────────────────────

describe('callAI (with proxy configured)', () => {
  let callAI, generateSubtasks, createTaskFromText, summariseProject, isAIEnabled, DynAIError

  beforeEach(async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai')
    // Clear module cache to pick up new env
    vi.resetModules()
    const mod = await import('./ai.js')
    callAI = mod.callAI
    generateSubtasks = mod.generateSubtasks
    createTaskFromText = mod.createTaskFromText
    summariseProject = mod.summariseProject
    isAIEnabled = mod.isAIEnabled
    DynAIError = mod.AIError
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('isAIEnabled returns true when proxy URL is set', () => {
    expect(isAIEnabled()).toBe(true)
  })

  it('callAI returns text on successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'Hello from AI' }),
    }))

    const result = await callAI('system prompt', 'user message', 500)
    expect(result).toBe('Hello from AI')
    expect(fetch).toHaveBeenCalledWith('https://proxy.test/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: 'system prompt', user: 'user message', maxTokens: 500 }),
    })
  })

  it('callAI returns empty string when text is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }))
    const result = await callAI('s', 'u')
    expect(result).toBe('')
  })

  it('callAI throws NETWORK on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    try {
      await callAI('s', 'u')
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(DynAIError)
      expect(e.code).toBe('NETWORK')
    }
  })

  it('callAI throws TIMEOUT on 408', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 408,
      json: () => Promise.resolve({ error: 'timeout' }),
    }))
    try {
      await callAI('s', 'u')
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('TIMEOUT')
      expect(e.status).toBe(408)
    }
  })

  it('callAI throws TIMEOUT on 504', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 504,
      json: () => Promise.resolve({}),
    }))
    try {
      await callAI('s', 'u')
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('TIMEOUT')
      expect(e.status).toBe(504)
    }
  })

  it('callAI throws RATE_LIMIT on 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 429,
      json: () => Promise.resolve({ error: 'rate limited' }),
    }))
    try {
      await callAI('s', 'u')
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('RATE_LIMIT')
      expect(e.status).toBe(429)
    }
  })

  it('callAI throws AUTH on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({}),
    }))
    try {
      await callAI('s', 'u')
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('AUTH')
    }
  })

  it('callAI throws AUTH on 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 403,
      json: () => Promise.resolve({}),
    }))
    try {
      await callAI('s', 'u')
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('AUTH')
      expect(e.status).toBe(403)
    }
  })

  it('callAI throws PROVIDER on 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 500,
      json: () => Promise.resolve({ error: 'internal' }),
    }))
    try {
      await callAI('s', 'u')
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('PROVIDER')
      expect(e.status).toBe(500)
    }
  })

  it('callAI throws UNKNOWN on unexpected status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 418,
      json: () => Promise.resolve({}),
    }))
    try {
      await callAI('s', 'u')
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('UNKNOWN')
      expect(e.status).toBe(418)
    }
  })

  it('callAI handles non-JSON error body gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 500,
      json: () => Promise.reject(new SyntaxError('bad json')),
    }))
    try {
      await callAI('s', 'u')
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('PROVIDER')
    }
  })

  it('callAI throws PARSE when success body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError('not json')),
    }))
    try {
      await callAI('s', 'u')
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('PARSE')
    }
  })

  // ── Domain helpers ─────────────────────────────────────────────

  it('generateSubtasks parses JSON array from AI', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: '["Sub 1", "Sub 2", "Sub 3"]' }),
    }))
    const result = await generateSubtasks({ title: 'Build feature', desc: 'A big feature' })
    expect(result).toEqual(['Sub 1', 'Sub 2', 'Sub 3'])
  })

  it('generateSubtasks throws PARSE on non-JSON AI response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'This is not JSON' }),
    }))
    try {
      await generateSubtasks({ title: 'Test', desc: '' })
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('PARSE')
    }
  })

  it('createTaskFromText parses task object from AI', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        text: '{"title":"Buy groceries","desc":"Get milk and bread","pri":"low","subs":[]}',
      }),
    }))
    const result = await createTaskFromText('buy groceries including milk and bread')
    expect(result.title).toBe('Buy groceries')
    expect(result.pri).toBe('low')
  })

  it('createTaskFromText strips markdown fences', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        text: '```json\n{"title":"Task","desc":"","pri":"medium","subs":[]}\n```',
      }),
    }))
    const result = await createTaskFromText('do something')
    expect(result.title).toBe('Task')
  })

  it('createTaskFromText throws PARSE on garbage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'Sure! Here is your task...' }),
    }))
    try {
      await createTaskFromText('test')
      expect.fail('should throw')
    } catch (e) {
      expect(e.code).toBe('PARSE')
    }
  })

  it('summariseProject calls AI with project tasks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'Project is on track.' }),
    }))
    const tasks = [
      { title: 'Task A', sec: 'To Do', done: false, pri: 'high', due: '2026-04-01' },
      { title: 'Task B', sec: 'Done', done: true, pri: 'low', due: null },
    ]
    const result = await summariseProject('Alpha', tasks, 'en')
    expect(result).toBe('Project is on track.')
    expect(fetch).toHaveBeenCalledOnce()
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.system).toContain('English')
    expect(body.user).toContain('Alpha')
    expect(body.user).toContain('Task A')
  })

  it('summariseProject uses Italian prompt by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'Progetto in corso.' }),
    }))
    await summariseProject('Beta', [], 'it')
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.system).toContain('italiano')
  })
})
