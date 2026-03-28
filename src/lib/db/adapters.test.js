import { describe, it, expect } from 'vitest'
import { toPortfolio, toProject, toTask } from './adapters'

describe('toPortfolio', () => {
  it('maps DB row to portfolio shape', () => {
    const row = { id: 'po1', name: 'Research', color: '#ff0000', description: 'R&D', status: 'active' }
    expect(toPortfolio(row)).toEqual({ id: 'po1', name: 'Research', color: '#ff0000', desc: 'R&D', status: 'active' })
  })

  it('defaults missing fields', () => {
    const row = { id: 'po2', name: 'X', color: '#000' }
    const p = toPortfolio(row)
    expect(p.desc).toBe('')
    expect(p.status).toBe('active')
  })
})

describe('toProject', () => {
  it('maps DB row to project shape', () => {
    const row = {
      id: 'p1', name: 'GlycoAxis', color: '#00ff00',
      status: 'active', status_label: 'on_track',
      portfolio_id: 'po1', description: 'Bio project',
      resources: [{ url: 'http://test' }],
      custom_fields: [{ id: 'cf1', name: 'Score' }],
    }
    const proj = toProject(row, ['Marco', 'Luca'])
    expect(proj.id).toBe('p1')
    expect(proj.members).toEqual(['Marco', 'Luca'])
    expect(proj.portfolio).toBe('po1')
    expect(proj.customFields).toHaveLength(1)
  })

  it('defaults null portfolio and empty arrays', () => {
    const row = { id: 'p2', name: 'X', color: '#000', status: 'active', status_label: 'on_track' }
    const proj = toProject(row)
    expect(proj.portfolio).toBeNull()
    expect(proj.resources).toEqual([])
    expect(proj.members).toEqual([])
    expect(proj.customFields).toEqual([])
  })
})

describe('toTask', () => {
  it('maps DB row to task shape with all fields', () => {
    const row = {
      id: 't1', project_id: 'p1', title: 'Test task',
      description: 'desc', assignee_name: 'Marco', priority: 'high',
      start_date: '2026-01-01', due_date: '2026-01-15', done: false,
      recurrence: 'weekly', attachments: [{ path: 'a.pdf' }],
      tags: [{ name: 'urgent' }], activity: [], position: 3,
      custom_values: { cf1: '42' },
    }
    const subs = [{ id: 's1', t: 'Sub 1', done: false }]
    const cmts = [{ id: 'c1', who: 'Marco', txt: 'hello', d: '2026-01-01' }]
    const deps = ['t2']

    const task = toTask(row, 'In Progress', subs, cmts, deps)
    expect(task.id).toBe('t1')
    expect(task.pid).toBe('p1')
    expect(task.sec).toBe('In Progress')
    expect(task.who).toBe('Marco')
    expect(task.subs).toHaveLength(1)
    expect(task.cmts).toHaveLength(1)
    expect(task.deps).toEqual(['t2'])
    expect(task.position).toBe(3)
  })

  it('defaults all nullable fields', () => {
    const row = { id: 't2', project_id: 'p1', title: 'Bare', priority: 'low', done: true }
    const task = toTask(row)
    expect(task.sec).toBe('')
    expect(task.desc).toBe('')
    expect(task.who).toBe('')
    expect(task.startDate).toBeNull()
    expect(task.due).toBeNull()
    expect(task.recurrence).toBeNull()
    expect(task.attachments).toEqual([])
    expect(task.tags).toEqual([])
    expect(task.subs).toEqual([])
    expect(task.cmts).toEqual([])
    expect(task.deps).toEqual([])
  })
})
