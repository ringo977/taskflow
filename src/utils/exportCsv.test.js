import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportTasksCsv } from './exportCsv'

// Mock DOM APIs not available in jsdom for download
let clickedHref = null
let clickedFilename = null

beforeEach(() => {
  clickedHref = null
  clickedFilename = null
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(document, 'createElement').mockReturnValue({
    set href(v) { clickedHref = v },
    set download(v) { clickedFilename = v },
    click: vi.fn(),
  })
})

const makeTasks = () => [
  {
    title: 'Task A', sec: 'To Do', who: 'Marco', pri: 'high',
    startDate: '2026-01-01', due: '2026-01-15', done: false,
    tags: [{ name: 'urgent' }], desc: 'Description A', customValues: {},
  },
  {
    title: 'Task with, comma', sec: 'Done', who: 'Luca', pri: 'low',
    startDate: null, due: null, done: true,
    tags: [], desc: 'Has "quotes"', customValues: { cf1: '42' },
  },
]

describe('exportTasksCsv', () => {
  it('generates CSV with correct header', () => {
    exportTasksCsv(makeTasks(), 'TestProj')
    expect(clickedFilename).toBe('TestProj.csv')
    expect(clickedHref).toBe('blob:mock')
  })

  it('uses fallback filename when projectName is null', () => {
    exportTasksCsv([], null)
    expect(clickedFilename).toBe('tasks.csv')
  })

  it('includes custom field columns', () => {
    const fields = [{ id: 'cf1', name: 'Score' }]
    exportTasksCsv(makeTasks(), 'P', fields)
    // Just verify it doesn't throw with custom fields
    expect(clickedFilename).toBe('P.csv')
  })

  it('handles empty task array', () => {
    exportTasksCsv([], 'Empty')
    expect(clickedFilename).toBe('Empty.csv')
  })
})
