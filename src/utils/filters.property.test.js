import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { applyFilters, isOverdue, applyVisibilityFilter } from './filters'

/**
 * Property-based tests for filter utilities.
 *
 * Properties tested:
 *   1. Filtered result is always a subset of input
 *   2. Empty/neutral filter = identity
 *   3. Adding more filters never increases result size
 *   4. isOverdue is consistent with Date comparison
 *   5. Visibility filter never adds tasks
 */

// ── Arbitraries ──────────────────────────────────────────────

const PRIORITIES = ['low', 'medium', 'high']

const arbTask = fc.record({
  id: fc.uuid(),
  pid: fc.constant('p1'),
  title: fc.string({ minLength: 1, maxLength: 30 }),
  desc: fc.string({ maxLength: 50 }),
  who: fc.oneof(
    fc.constant(null),
    fc.constant([]),
    fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 1, maxLength: 3 }),
    fc.string({ minLength: 1, maxLength: 15 }),
  ),
  pri: fc.constantFrom(...PRIORITIES),
  done: fc.boolean(),
  due: fc.oneof(
    fc.constant(null),
    fc.integer({ min: 0, max: 3650 }).map(offset => {
      const d = new Date('2020-01-01')
      d.setDate(d.getDate() + offset)
      return d.toISOString().slice(0, 10)
    }),
  ),
  sec: fc.constantFrom('To Do', 'In Progress', 'Done'),
  tags: fc.array(
    fc.record({ name: fc.string({ minLength: 1, maxLength: 10 }) }),
    { maxLength: 3 }
  ),
  milestone: fc.boolean(),
  visibility: fc.constantFrom('all', 'assignees'),
})

const arbTasks = fc.array(arbTask, { minLength: 0, maxLength: 30 })

// ── Property 1: Filtered ⊆ Input ────────────────────────────

describe('Property: filtered result ⊆ input', () => {
  it('every element in result exists in input (by reference)', () => {
    fc.assert(
      fc.property(
        arbTasks,
        fc.record({
          q: fc.oneof(fc.constant(undefined), fc.string({ maxLength: 10 })),
          pri: fc.oneof(fc.constant(undefined), fc.constant('all'), fc.constantFrom(...PRIORITIES)),
          who: fc.oneof(fc.constant(undefined), fc.constant('all'), fc.string({ maxLength: 10 })),
          done: fc.oneof(fc.constant(undefined), fc.constantFrom('open', 'done')),
          due: fc.oneof(fc.constant(undefined), fc.constant('all'), fc.constantFrom('overdue', 'today', 'week')),
          tag: fc.oneof(fc.constant(undefined), fc.constant('all'), fc.string({ maxLength: 10 })),
        }),
        (tasks, filters) => {
          const result = applyFilters(tasks, filters)
          // Every result element must be in the original array
          for (const r of result) {
            expect(tasks).toContain(r)
          }
          // Result length ≤ input length
          expect(result.length).toBeLessThanOrEqual(tasks.length)
        }
      ),
      { numRuns: 200 }
    )
  })
})

// ── Property 2: Empty filter = identity ──────────────────────

describe('Property: empty filter returns all tasks', () => {
  it('no filters applied = all tasks returned', () => {
    fc.assert(
      fc.property(arbTasks, (tasks) => {
        const result = applyFilters(tasks, {})
        expect(result).toHaveLength(tasks.length)
      }),
      { numRuns: 100 }
    )
  })

  it('all-neutral filters = all tasks returned', () => {
    fc.assert(
      fc.property(arbTasks, (tasks) => {
        const result = applyFilters(tasks, {
          pri: 'all', who: 'all', due: 'all', tag: 'all',
        })
        expect(result).toHaveLength(tasks.length)
      }),
      { numRuns: 100 }
    )
  })
})

// ── Property 3: More filters → fewer or equal results ────────

describe('Property: adding filters only narrows results', () => {
  it('adding priority filter cannot increase result size', () => {
    fc.assert(
      fc.property(
        arbTasks,
        fc.constantFrom(...PRIORITIES),
        (tasks, pri) => {
          const withoutPri = applyFilters(tasks, {})
          const withPri = applyFilters(tasks, { pri })
          expect(withPri.length).toBeLessThanOrEqual(withoutPri.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('adding done filter cannot increase result size', () => {
    fc.assert(
      fc.property(
        arbTasks,
        fc.constantFrom('open', 'done'),
        (tasks, done) => {
          const without = applyFilters(tasks, {})
          const with_ = applyFilters(tasks, { done })
          expect(with_.length).toBeLessThanOrEqual(without.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('open + done cover all tasks', () => {
    fc.assert(
      fc.property(arbTasks, (tasks) => {
        const open = applyFilters(tasks, { done: 'open' })
        const done = applyFilters(tasks, { done: 'done' })
        expect(open.length + done.length).toBe(tasks.length)
      }),
      { numRuns: 100 }
    )
  })
})

// ── Property 4: isOverdue consistency ────────────────────────

describe('Property: isOverdue consistent with Date', () => {
  it('past dates are always overdue', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }).map(offset => {
          const d = new Date('2010-01-01')
          d.setDate(d.getDate() + offset)
          return d.toISOString().slice(0, 10)
        }),
        (dateStr) => {
          expect(isOverdue(dateStr)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('far future dates are never overdue', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 25000 }).map(offset => {
          const d = new Date('2028-01-01')
          d.setDate(d.getDate() + offset)
          return d.toISOString().slice(0, 10)
        }),
        (dateStr) => {
          expect(isOverdue(dateStr)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('null/undefined/empty always returns false', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined, ''),
        (val) => {
          expect(isOverdue(val)).toBe(false)
        }
      ),
      { numRuns: 10 }
    )
  })
})

// ── Property 5: Visibility filter never adds tasks ───────────

describe('Property: visibility filter never adds tasks', () => {
  it('result ⊆ input for any project/user combo', () => {
    const arbProject = fc.record({
      members: fc.array(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 10 }),
          role: fc.constantFrom('owner', 'editor', 'viewer'),
        }),
        { maxLength: 5 }
      ),
      sectionAccess: fc.oneof(
        fc.constant(undefined),
        fc.constant({}),
        fc.dictionary(
          fc.constantFrom('To Do', 'In Progress', 'Done'),
          fc.constantFrom('all', 'editors'),
        ),
      ),
    })

    fc.assert(
      fc.property(
        arbTasks,
        fc.oneof(arbProject, fc.constant(null)),
        fc.oneof(fc.string({ minLength: 1, maxLength: 10 }), fc.constant(null)),
        (tasks, project, user) => {
          const result = applyVisibilityFilter(tasks, project, user)
          expect(result.length).toBeLessThanOrEqual(tasks.length)
          for (const r of result) {
            expect(tasks).toContain(r)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Property: search is case-insensitive ─────────────────────

describe('Property: search is case-insensitive', () => {
  it('uppercase and lowercase query give same results', () => {
    fc.assert(
      fc.property(
        arbTasks,
        fc.string({ minLength: 1, maxLength: 5 }),
        (tasks, q) => {
          const lower = applyFilters(tasks, { q: q.toLowerCase() })
          const upper = applyFilters(tasks, { q: q.toUpperCase() })
          expect(lower.length).toBe(upper.length)
        }
      ),
      { numRuns: 50 }
    )
  })
})
