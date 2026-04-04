#!/usr/bin/env node
/**
 * scripts/migration-lint.js
 *
 * Static analysis for Supabase migration health.
 *
 * What it checks:
 *  1. Dropped columns — extracts every DROP COLUMN from the SQL files and
 *     then scans subsequent migrations + JS DB/hook source for references.
 *  2. Migration ordering invariants — hard-coded pairs that must be respected.
 *  3. Sequential numbering — no gaps in the NNN_ prefix sequence.
 *
 * Exit 0 = clean. Exit 1 = violations found.
 *
 * Run:  node scripts/migration-lint.js
 *       npm run migration:lint
 */

import { readdirSync, readFileSync } from 'fs'
import { join, resolve, relative } from 'path'

const ROOT = resolve(new URL('.', import.meta.url).pathname, '..')
const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations')

// JS directories to scan for stale column references.
// Excludes test files (*.test.*, *.spec.*) and adapters.js
// (adapters accept legacy fields from row objects, not query strings).
const JS_SCAN_DIRS = [
  join(ROOT, 'src/lib/db'),
  join(ROOT, 'src/hooks'),
]
const JS_EXCLUDE = [
  /\.test\./,
  /\.spec\./,
  /adapters\.js$/,          // reads row fields, not query columns
  /adapters\.resilience/,
  /milestones\.js$/,        // new milestone entity, not the dropped tasks.milestone boolean
  /useMilestones\.js$/,     // hook for milestone entity
]

// Known false-positive column references: the word appears in entity names,
// error messages, or schema validation strings — not as a DB column reference.
// Format: { column: 'col_name', pattern: /regex/ }
const FALSE_POSITIVES = [
  { column: 'milestone', pattern: /Milestone|milestone_created|milestone_updated|milestone_deleted|'milestone'/i },
]

// ── Known ordering invariants ────────────────────────────────────────────────
// Each entry = { before, after, reason }
// "before" migration file prefix must appear BEFORE "after" in the sequence.
const ORDERING_INVARIANTS = [
  {
    before: '025',
    after: '027',
    reason: 'migration 025 adds author_id / assignee_ids; 027 drops assignee_name which depends on ids being present first',
  },
  {
    before: '025',
    after: '028',
    reason: 'migration 028 references author_id on comments, which is added by 025',
  },
  {
    before: '026',
    after: '027',
    reason: 'audit_log (026) must exist before dropping columns (027) so audit triggers stay intact',
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function walkDir(dir, exts = ['.js', '.jsx']) {
  let results = []
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return results }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      results = results.concat(walkDir(full, exts))
    } else if (exts.some(x => e.name.endsWith(x))) {
      results.push(full)
    }
  }
  return results
}

function relPath(abs) {
  return relative(ROOT, abs)
}

function isExcluded(filePath) {
  return JS_EXCLUDE.some(re => re.test(filePath))
}

// Extract migration prefix number (e.g. "027" from "027_drop_assignee_name.sql")
function migPrefix(filename) {
  return filename.split('_')[0]
}

// ── Load migrations ──────────────────────────────────────────────────────────

const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort()

// ── Check 1: Sequential numbering ────────────────────────────────────────────
let errors = 0

console.log('migration-lint: checking migration sequence...')
{
  const nums = migrationFiles.map(f => parseInt(migPrefix(f), 10))
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== i + 1) {
      console.error(`  ✗ Gap in migration sequence: expected ${String(i + 1).padStart(3, '0')}, found ${migrationFiles[i]}`)
      errors++
    }
  }
  if (errors === 0) console.log(`  ✓ ${migrationFiles.length} migrations, no gaps`)
}

// ── Check 2: Ordering invariants ─────────────────────────────────────────────
console.log('\nmigration-lint: checking ordering invariants...')
{
  let ok = 0
  for (const inv of ORDERING_INVARIANTS) {
    const beforeIdx = migrationFiles.findIndex(f => migPrefix(f) === inv.before)
    const afterIdx = migrationFiles.findIndex(f => migPrefix(f) === inv.after)
    if (beforeIdx === -1) {
      console.error(`  ✗ Migration ${inv.before} not found (required before ${inv.after})`)
      errors++
    } else if (afterIdx === -1) {
      console.error(`  ✗ Migration ${inv.after} not found (expected after ${inv.before})`)
      errors++
    } else if (beforeIdx >= afterIdx) {
      console.error(`  ✗ Ordering violation: ${migrationFiles[beforeIdx]} must come BEFORE ${migrationFiles[afterIdx]}`)
      console.error(`    Reason: ${inv.reason}`)
      errors++
    } else {
      ok++
    }
  }
  if (ok === ORDERING_INVARIANTS.length) console.log(`  ✓ All ${ok} ordering invariants satisfied`)
}

// ── Check 3: Dropped-column references ───────────────────────────────────────
console.log('\nmigration-lint: scanning for stale dropped-column references...')

// Parse DROP COLUMN from all migrations (keep track of which index dropped it)
const DROP_RE = /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?(\w+)/gi
const dropped = [] // [{table, column, file, idx}]

for (let i = 0; i < migrationFiles.length; i++) {
  const content = readFileSync(join(MIGRATIONS_DIR, migrationFiles[i]), 'utf8')
  DROP_RE.lastIndex = 0
  let m
  while ((m = DROP_RE.exec(content)) !== null) {
    dropped.push({
      table: m[1].toLowerCase(),
      column: m[2].toLowerCase(),
      file: migrationFiles[i],
      idx: i,
    })
  }
}

if (dropped.length === 0) {
  console.log('  (no DROP COLUMN statements found)')
} else {
  console.log(`  Found ${dropped.length} dropped column(s): ${dropped.map(d => `${d.table}.${d.column}`).join(', ')}`)
}

let staleErrors = 0

for (const { table, column, file: dropFile, idx: dropIdx } of dropped) {
  // ── 3a: Check subsequent SQL migrations ──────────────────────────
  for (let i = dropIdx + 1; i < migrationFiles.length; i++) {
    const mFile = migrationFiles[i]
    const content = readFileSync(join(MIGRATIONS_DIR, mFile), 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, lineNo) => {
      const trimmed = line.trimStart()
      // Skip pure comment lines
      if (trimmed.startsWith('--')) return
      const col = column.toLowerCase()
      if (line.toLowerCase().includes(col)) {
        // Make sure it's not just a partial match (e.g. "task_id" containing "id")
        const wordBoundary = new RegExp(`\\b${col}\\b`, 'i')
        if (wordBoundary.test(line)) {
          console.error(`  ✗ SQL: ${mFile}:${lineNo + 1} — references '${column}' (dropped in ${dropFile})`)
          console.error(`    ${line.trim()}`)
          staleErrors++
        }
      }
    })
  }

  // ── 3b: Check JS source files ─────────────────────────────────────
  for (const dir of JS_SCAN_DIRS) {
    const jsFiles = walkDir(dir)
    for (const jsFile of jsFiles) {
      if (isExcluded(jsFile)) continue
      const content = readFileSync(jsFile, 'utf8')
      if (!content.toLowerCase().includes(column.toLowerCase())) continue
      const lines = content.split('\n')
      const wordBoundary = new RegExp(`\\b${column}\\b`, 'i')
      lines.forEach((line, lineNo) => {
        const trimmed = line.trimStart()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
        if (wordBoundary.test(line)) {
          // Skip known false positives (e.g. entity names containing a dropped column name)
          const isFP = FALSE_POSITIVES.some(fp => fp.column === column && fp.pattern.test(line))
          if (isFP) return
          console.error(`  ✗ JS:  ${relPath(jsFile)}:${lineNo + 1} — references '${column}' (dropped in ${dropFile})`)
          console.error(`    ${line.trim()}`)
          staleErrors++
        }
      })
    }
  }
}

errors += staleErrors
if (staleErrors === 0 && dropped.length > 0) {
  console.log('  ✓ No stale references to dropped columns found')
}

// ── Result ───────────────────────────────────────────────────────────────────
console.log('')
if (errors === 0) {
  console.log('migration-lint: ✓ all checks passed')
  process.exit(0)
} else {
  console.error(`migration-lint: ✗ ${errors} violation(s) found`)
  process.exit(1)
}
