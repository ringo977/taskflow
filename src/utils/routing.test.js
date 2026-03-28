import { describe, it, expect } from 'vitest'
import { parseRoute, buildPath } from './routing'

describe('parseRoute', () => {
  it('parses root as home', () => {
    expect(parseRoute('/')).toEqual({ nav: 'home', pid: null, view: null, taskId: null })
  })

  it('parses a nav-only path', () => {
    expect(parseRoute('/mytasks')).toEqual({ nav: 'mytasks', pid: null, view: null, taskId: null })
  })

  it('parses a project path with view', () => {
    expect(parseRoute('/projects/p123/board')).toEqual({ nav: 'projects', pid: 'p123', view: 'board', taskId: null })
  })

  it('parses a full path with task ID', () => {
    expect(parseRoute('/projects/p1/lista/t99')).toEqual({ nav: 'projects', pid: 'p1', view: 'lista', taskId: 't99' })
  })

  it('handles empty string', () => {
    expect(parseRoute('')).toEqual({ nav: 'home', pid: null, view: null, taskId: null })
  })

  it('handles extra slashes', () => {
    expect(parseRoute('///people')).toEqual({ nav: 'people', pid: null, view: null, taskId: null })
  })
})

describe('buildPath', () => {
  it('builds home path', () => {
    expect(buildPath('home', null, null, null)).toBe('/')
  })

  it('builds home path with task', () => {
    expect(buildPath('home', null, null, 't1')).toBe('/home/-/-/t1')
  })

  it('builds project path with view', () => {
    expect(buildPath('projects', 'p1', 'board', null)).toBe('/projects/p1/board')
  })

  it('builds project path with task', () => {
    expect(buildPath('projects', 'p1', 'lista', 't5')).toBe('/projects/p1/lista/t5')
  })

  it('builds portfolio path', () => {
    expect(buildPath('portfolios', 'po1', 'overview', null)).toBe('/portfolios/po1/overview')
  })

  it('builds nav-only path', () => {
    expect(buildPath('people', null, null, null)).toBe('/people')
  })

  it('builds nav path with task ID', () => {
    expect(buildPath('mytasks', null, null, 't8')).toBe('/mytasks/-/-/t8')
  })
})

describe('parseRoute ↔ buildPath roundtrip', () => {
  const cases = [
    { nav: 'projects', pid: 'p1', view: 'board', taskId: null },
    { nav: 'projects', pid: 'p2', view: 'lista', taskId: 't3' },
    { nav: 'portfolios', pid: 'po1', view: 'overview', taskId: null },
  ]
  for (const c of cases) {
    it(`roundtrips ${JSON.stringify(c)}`, () => {
      const path = buildPath(c.nav, c.pid, c.view, c.taskId)
      expect(parseRoute(path)).toEqual(c)
    })
  }
})
