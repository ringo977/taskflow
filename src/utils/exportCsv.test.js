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

// ── Branch edge cases ──────────────────────────────────────────

describe('exportTasksCsv — CSV content branches', () => {
  let capturedBlob = null

  beforeEach(() => {
    capturedBlob = null
    vi.stubGlobal('URL', {
      createObjectURL: (blob) => { capturedBlob = blob; return 'blob:mock' },
      revokeObjectURL: vi.fn(),
    })
  })

  const csvLines = async () => {
    const text = await capturedBlob.text()
    return text.replace(new RegExp('^\\uFEFF'), '').split('\n')
  }

  it('joins array assignees with a semicolon (multi-who shape)', async () => {
    exportTasksCsv([{ title: 'T', who: ['Alice', 'Bob'], done: false }], 'P')
    const lines = await csvLines()
    expect(lines[1]).toContain('Alice; Bob')
  })

  it('handles tasks with undefined who / tags / customValues (legacy shape)', async () => {
    const bare = { title: 'Bare' } // no who, no tags, no dates, no desc
    const fields = [{ id: 'cf1', name: 'Score' }]
    exportTasksCsv([bare], 'P', fields)
    const lines = await csvLines()
    // 14 base columns + 1 custom field, all empty except title and Done=No
    expect(lines[1]).toBe('Bare,,,,,,No,,,,,,,,')
  })

  it('resolves partner / WP / milestone lookups', async () => {
    const task = { title: 'T', partnerId: 'pa1', workpackageId: 'wp1', milestoneId: 'ms1', done: true }
    exportTasksCsv([task], 'P', [], null, null,
      { pa1: { name: 'POLIMI' } },
      { wp1: { code: 'WP1', name: 'Design' } },
      { ms1: { code: 'M1', name: 'Kickoff' } })
    const lines = await csvLines()
    expect(lines[1]).toContain('POLIMI')
    expect(lines[1]).toContain('WP1')
    expect(lines[1]).toContain('Design')
    expect(lines[1]).toContain('M1')
    expect(lines[1]).toContain('Kickoff')
  })

  it('applies the visibility filter when project and userName are given', async () => {
    const project = { id: 'p1', members: [{ name: 'Bob', role: 'viewer' }] }
    const tasks = [
      { title: 'Visible', who: 'Bob', visibility: 'assignees', done: false },
      { title: 'Hidden', who: 'Alice', visibility: 'assignees', done: false },
    ]
    exportTasksCsv(tasks, 'P', [], project, 'Bob')
    const lines = await csvLines()
    expect(lines).toHaveLength(2) // header + 1 row
    expect(lines[1]).toContain('Visible')
    expect(lines.join('\n')).not.toContain('Hidden')
  })

  it('skips the visibility filter when userName is missing', async () => {
    const project = { id: 'p1', members: [] }
    const tasks = [{ title: 'Hidden', who: 'Alice', visibility: 'assignees', done: false }]
    exportTasksCsv(tasks, 'P', [], project, null)
    const lines = await csvLines()
    expect(lines).toHaveLength(2) // not filtered
    expect(lines[1]).toContain('Hidden')
  })

  it('escapes values containing quotes, commas and newlines', async () => {
    const task = { title: 'Say "hi", ok?', desc: 'line1\nline2', done: false }
    exportTasksCsv([task], 'P')
    const lines = await csvLines()
    expect(lines[1].startsWith('"Say ""hi"", ok?"')).toBe(true)
    // the newline inside desc keeps the row quoted across two physical lines
    expect(lines[1]).toContain('"line1')
    expect(lines[2]).toContain('line2"')
  })

  it('reads custom field values and defaults missing ones to empty', async () => {
    const fields = [{ id: 'cf1', name: 'Score' }, { id: 'cf2', name: 'Owner' }]
    const task = { title: 'T', done: false, customValues: { cf1: '42' } }
    exportTasksCsv([task], 'P', fields)
    const lines = await csvLines()
    expect(lines[1].endsWith(',42,')).toBe(true)
  })
})
