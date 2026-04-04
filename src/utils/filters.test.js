import { describe, it, expect } from 'vitest'
import { applyFilters, isOverdue, applyVisibilityFilter } from './filters'

const makeTasks = () => [
  { id: '1', title: 'Design landing page', desc: 'Figma mockup', pri: 'high', who: 'alice', done: false, due: '2026-01-10', sec: 'To Do', tags: [{ name: 'design' }] },
  { id: '2', title: 'Setup CI pipeline', desc: '', pri: 'medium', who: 'bob', done: true, due: '2026-03-01', sec: 'Done', tags: [] },
  { id: '3', title: 'Write unit tests', desc: 'Vitest coverage', pri: 'low', who: 'alice', done: false, due: null, sec: 'In Progress', tags: [{ name: 'dev' }] },
]

describe('applyFilters', () => {
  it('returns all tasks with empty filters', () => {
    const tasks = makeTasks()
    expect(applyFilters(tasks, {})).toHaveLength(3)
  })

  it('filters by text query on title', () => {
    expect(applyFilters(makeTasks(), { q: 'landing' })).toHaveLength(1)
  })

  it('filters by text query on description', () => {
    expect(applyFilters(makeTasks(), { q: 'figma' })).toHaveLength(1)
  })

  it('filters by text query on tags', () => {
    expect(applyFilters(makeTasks(), { q: 'design' })).toHaveLength(1)
  })

  it('filters by priority', () => {
    expect(applyFilters(makeTasks(), { pri: 'high' })).toHaveLength(1)
    expect(applyFilters(makeTasks(), { pri: 'all' })).toHaveLength(3)
  })

  it('filters by assignee', () => {
    expect(applyFilters(makeTasks(), { who: 'alice' })).toHaveLength(2)
    expect(applyFilters(makeTasks(), { who: 'all' })).toHaveLength(3)
  })

  it('filters by done/open status', () => {
    expect(applyFilters(makeTasks(), { done: 'open' })).toHaveLength(2)
    expect(applyFilters(makeTasks(), { done: 'done' })).toHaveLength(1)
  })

  it('filters by tag', () => {
    expect(applyFilters(makeTasks(), { tag: 'dev' })).toHaveLength(1)
    expect(applyFilters(makeTasks(), { tag: 'all' })).toHaveLength(3)
  })

  it('filters by due=overdue', () => {
    // Task 1 has due 2026-01-10 which is overdue by now (we're in March 2026)
    const result = applyFilters(makeTasks(), { due: 'overdue' })
    expect(result.length).toBeGreaterThanOrEqual(1)
    result.forEach(t => expect(t.due).toBeTruthy())
  })

  it('filters by due=today', () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const tasks = [
      ...makeTasks(),
      { id: '4', title: 'Today task', desc: '', pri: 'low', who: 'bob', done: false, due: todayStr, sec: 'To Do', tags: [] },
    ]
    const result = applyFilters(tasks, { due: 'today' })
    expect(result).toHaveLength(1)
    expect(result[0].due).toBe(todayStr)
  })

  it('filters by due=week', () => {
    const now = new Date()
    const inThreeDays = new Date(now)
    inThreeDays.setDate(now.getDate() + 3)
    const dueStr = inThreeDays.toISOString().slice(0, 10)
    const tasks = [
      { id: '1', title: 'Soon', desc: '', pri: 'low', who: 'alice', done: false, due: dueStr, sec: 'To Do', tags: [] },
      { id: '2', title: 'Far', desc: '', pri: 'low', who: 'alice', done: false, due: '2099-01-01', sec: 'To Do', tags: [] },
    ]
    const result = applyFilters(tasks, { due: 'week' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Soon')
  })

  it('filters by due excludes tasks with no due date', () => {
    const tasks = [
      { id: '1', title: 'No due', desc: '', pri: 'low', who: 'alice', done: false, due: null, sec: 'To Do', tags: [] },
    ]
    expect(applyFilters(tasks, { due: 'overdue' })).toHaveLength(0)
    expect(applyFilters(tasks, { due: 'today' })).toHaveLength(0)
    expect(applyFilters(tasks, { due: 'week' })).toHaveLength(0)
  })

  it('due=all passes all tasks', () => {
    expect(applyFilters(makeTasks(), { due: 'all' })).toHaveLength(3)
  })

  it('combines multiple filters', () => {
    const result = applyFilters(makeTasks(), { who: 'alice', done: 'open' })
    expect(result).toHaveLength(2)
    expect(result.every((t) => t.who === 'alice' && !t.done)).toBe(true)
  })

  // ── Partner filter ──────────────────────────────────────────
  it('filters by partner', () => {
    const tasks = [
      { id: '1', title: 'A', desc: '', pri: 'low', who: 'alice', done: false, due: null, sec: 'To Do', tags: [], partnerId: 'pt1' },
      { id: '2', title: 'B', desc: '', pri: 'low', who: 'bob',   done: false, due: null, sec: 'To Do', tags: [], partnerId: 'pt2' },
      { id: '3', title: 'C', desc: '', pri: 'low', who: 'alice', done: false, due: null, sec: 'To Do', tags: [], partnerId: null },
    ]
    const result = applyFilters(tasks, { partner: 'pt1' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('partner=all passes all tasks', () => {
    const tasks = [
      { id: '1', title: 'A', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], partnerId: 'pt1' },
      { id: '2', title: 'B', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], partnerId: null },
    ]
    expect(applyFilters(tasks, { partner: 'all' })).toHaveLength(2)
  })

  it('combines partner filter with other filters', () => {
    const tasks = [
      { id: '1', title: 'A', desc: '', pri: 'high', who: 'alice', done: false, due: null, sec: 'To Do', tags: [], partnerId: 'pt1' },
      { id: '2', title: 'B', desc: '', pri: 'low',  who: 'alice', done: false, due: null, sec: 'To Do', tags: [], partnerId: 'pt1' },
      { id: '3', title: 'C', desc: '', pri: 'high', who: 'alice', done: false, due: null, sec: 'To Do', tags: [], partnerId: 'pt2' },
    ]
    const result = applyFilters(tasks, { partner: 'pt1', pri: 'high' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  // ── Workpackage filter ──────────────────────────────────────

  it('filters by workpackage', () => {
    const tasks = [
      { id: '1', title: 'A', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], workpackageId: 'wp1' },
      { id: '2', title: 'B', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], workpackageId: 'wp2' },
      { id: '3', title: 'C', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], workpackageId: null },
    ]
    const result = applyFilters(tasks, { wp: 'wp1' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('wp=all passes all tasks', () => {
    const tasks = [
      { id: '1', title: 'A', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], workpackageId: 'wp1' },
      { id: '2', title: 'B', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], workpackageId: null },
    ]
    expect(applyFilters(tasks, { wp: 'all' })).toHaveLength(2)
  })

  it('combines wp filter with partner filter', () => {
    const tasks = [
      { id: '1', title: 'A', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], workpackageId: 'wp1', partnerId: 'pt1' },
      { id: '2', title: 'B', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], workpackageId: 'wp1', partnerId: 'pt2' },
      { id: '3', title: 'C', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], workpackageId: 'wp2', partnerId: 'pt1' },
    ]
    const result = applyFilters(tasks, { wp: 'wp1', partner: 'pt1' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  // ── Milestone filter ────────────────────────────────────────

  it('filters by milestone', () => {
    const tasks = [
      { id: '1', title: 'A', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], milestoneId: 'ms1' },
      { id: '2', title: 'B', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], milestoneId: 'ms2' },
      { id: '3', title: 'C', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], milestoneId: null },
    ]
    const result = applyFilters(tasks, { ms: 'ms1' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('ms=all passes all tasks', () => {
    const tasks = [
      { id: '1', title: 'A', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], milestoneId: 'ms1' },
      { id: '2', title: 'B', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], milestoneId: null },
    ]
    expect(applyFilters(tasks, { ms: 'all' })).toHaveLength(2)
  })

  it('combines ms filter with wp and partner filters', () => {
    const tasks = [
      { id: '1', title: 'A', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], milestoneId: 'ms1', workpackageId: 'wp1', partnerId: 'pt1' },
      { id: '2', title: 'B', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], milestoneId: 'ms1', workpackageId: 'wp2', partnerId: 'pt1' },
      { id: '3', title: 'C', desc: '', pri: 'low', who: 'a', done: false, due: null, sec: 'To Do', tags: [], milestoneId: 'ms2', workpackageId: 'wp1', partnerId: 'pt1' },
    ]
    const result = applyFilters(tasks, { ms: 'ms1', wp: 'wp1', partner: 'pt1' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })
})

describe('isOverdue', () => {
  it('returns false for null/undefined due', () => {
    expect(isOverdue(null)).toBe(false)
    expect(isOverdue(undefined)).toBe(false)
  })

  it('returns true for past dates', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })

  it('returns false for far future dates', () => {
    expect(isOverdue('2099-12-31')).toBe(false)
  })
})

// ── applyVisibilityFilter ─────────────────────────────────

describe('applyVisibilityFilter', () => {
  const mkTask = (id, who, sec = 'To Do', visibility = 'all') => ({
    id, title: `Task ${id}`, who, sec, visibility, done: false,
  })

  const mkProject = (members = [], sectionAccess = {}) => ({
    id: 'p1', name: 'Proj', members, sectionAccess,
  })

  it('returns all tasks when no project', () => {
    const tasks = [mkTask('1', 'Alice'), mkTask('2', 'Bob')]
    expect(applyVisibilityFilter(tasks, null, 'Alice')).toEqual(tasks)
  })

  it('returns all tasks when no userName', () => {
    const tasks = [mkTask('1', 'Alice')]
    expect(applyVisibilityFilter(tasks, mkProject(), null)).toEqual(tasks)
  })

  it('returns all public tasks regardless of role', () => {
    const tasks = [mkTask('1', 'Alice'), mkTask('2', 'Bob')]
    const project = mkProject([{ name: 'Charlie', role: 'viewer' }])
    expect(applyVisibilityFilter(tasks, project, 'Charlie')).toHaveLength(2)
  })

  // Task visibility: assignees
  it('hides assignees-only tasks from non-assignees', () => {
    const tasks = [
      mkTask('1', ['Alice'], 'To Do', 'assignees'),
      mkTask('2', ['Bob'], 'To Do', 'all'),
    ]
    const project = mkProject([{ name: 'Bob', role: 'viewer' }])
    const result = applyVisibilityFilter(tasks, project, 'Bob')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('shows assignees-only tasks to assignees', () => {
    const tasks = [mkTask('1', ['Alice', 'Bob'], 'To Do', 'assignees')]
    const project = mkProject([{ name: 'Bob', role: 'viewer' }])
    expect(applyVisibilityFilter(tasks, project, 'Bob')).toHaveLength(1)
  })

  it('handles legacy string who for visibility check', () => {
    const tasks = [mkTask('1', 'Alice', 'To Do', 'assignees')]
    const project = mkProject([{ name: 'Alice', role: 'viewer' }])
    expect(applyVisibilityFilter(tasks, project, 'Alice')).toHaveLength(1)
  })

  it('handles null who on assignees-only task', () => {
    const tasks = [mkTask('1', null, 'To Do', 'assignees')]
    const project = mkProject([{ name: 'Alice', role: 'viewer' }])
    expect(applyVisibilityFilter(tasks, project, 'Alice')).toHaveLength(0)
  })

  // Section access: editors
  it('hides editor-only sections from viewers', () => {
    const tasks = [
      mkTask('1', 'Alice', 'Secret'),
      mkTask('2', 'Alice', 'Open'),
    ]
    const project = mkProject(
      [{ name: 'Alice', role: 'viewer' }],
      { 'Secret': 'editors' }
    )
    const result = applyVisibilityFilter(tasks, project, 'Alice')
    expect(result).toHaveLength(1)
    expect(result[0].sec).toBe('Open')
  })

  it('shows editor-only sections to editors', () => {
    const tasks = [mkTask('1', 'Alice', 'Secret')]
    const project = mkProject(
      [{ name: 'Alice', role: 'editor' }],
      { 'Secret': 'editors' }
    )
    expect(applyVisibilityFilter(tasks, project, 'Alice')).toHaveLength(1)
  })

  it('shows editor-only sections to owners', () => {
    const tasks = [mkTask('1', 'Alice', 'Secret')]
    const project = mkProject(
      [{ name: 'Alice', role: 'owner' }],
      { 'Secret': 'editors' }
    )
    expect(applyVisibilityFilter(tasks, project, 'Alice')).toHaveLength(1)
  })

  // Combined filters
  it('applies both visibility and section access', () => {
    const tasks = [
      mkTask('1', ['Alice'], 'Secret', 'assignees'),  // visible: assignee + editor section → need editor+
      mkTask('2', ['Bob'], 'Secret', 'assignees'),     // hidden: not assignee
      mkTask('3', ['Alice'], 'Open', 'all'),            // visible
    ]
    const project = mkProject(
      [{ name: 'Alice', role: 'editor' }],
      { 'Secret': 'editors' }
    )
    const result = applyVisibilityFilter(tasks, project, 'Alice')
    expect(result).toHaveLength(2)
    expect(result.map(t => t.id)).toEqual(['1', '3'])
  })

  // Edge: member not found defaults to viewer
  it('defaults to viewer when user not in members list', () => {
    const tasks = [mkTask('1', 'Ghost', 'Secret')]
    const project = mkProject([], { 'Secret': 'editors' })
    expect(applyVisibilityFilter(tasks, project, 'Ghost')).toHaveLength(0)
  })

  // Edge: empty tasks
  it('handles empty task array', () => {
    expect(applyVisibilityFilter([], mkProject(), 'Alice')).toEqual([])
  })
})
