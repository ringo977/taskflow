import { describe, it, expect, vi, beforeEach } from 'vitest'

// Test the AI module's fallback behaviour when proxy is not configured
// We re-import fresh for each test to reset module state

describe('AI module (proxy not configured)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('isAIEnabled returns false when VITE_AI_PROXY_URL is not set', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '')
    const { isAIEnabled } = await import('./ai.js')
    expect(isAIEnabled()).toBe(false)
  })

  it('callAI throws a user-friendly error when proxy is not configured', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '')
    // Force fresh import
    const { callAI } = await import('./ai.js')
    await expect(callAI('system', 'user')).rejects.toThrow(/not available|not configured/i)
  })

  it('generateSubtasks throws when proxy is not configured', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '')
    const { generateSubtasks } = await import('./ai.js')
    await expect(generateSubtasks({ title: 'Test', desc: '' })).rejects.toThrow()
  })
})
