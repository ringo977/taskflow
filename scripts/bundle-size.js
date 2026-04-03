#!/usr/bin/env node
/**
 * Bundle-size monitor — runs after `vite build` and checks every chunk
 * against budgets defined in bundle-budget.json.
 *
 * Exit 0 = all OK, Exit 1 = at least one budget exceeded.
 *
 * Usage:
 *   node scripts/bundle-size.js            # check only
 *   node scripts/bundle-size.js --update   # overwrite budget file with current sizes (+10 % headroom)
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs'
import { join, basename, resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')
const DIST = join(ROOT, 'dist', 'assets')
const BUDGET_PATH = join(ROOT, 'bundle-budget.json')
const HEADROOM = 1.10 // 10 % headroom when generating budgets

// ── helpers ──────────────────────────────────────────────────────────
const kB = bytes => (bytes / 1024).toFixed(2)
const pad = (s, n) => s.padEnd(n)

function getChunks() {
  return readdirSync(DIST)
    .filter(f => f.endsWith('.js') || f.endsWith('.css'))
    .map(f => {
      const full = join(DIST, f)
      const size = statSync(full).size
      // normalise: strip hash → "index-CkpIkvAM.js" → "index.js"
      const name = f.replace(/-[A-Za-z0-9_-]{6,12}\./, '.')
      return { file: f, name, size }
    })
    .sort((a, b) => b.size - a.size)
}

function loadBudget() {
  try {
    return JSON.parse(readFileSync(BUDGET_PATH, 'utf8'))
  } catch {
    return null
  }
}

// ── --update mode ────────────────────────────────────────────────────
if (process.argv.includes('--update')) {
  const chunks = getChunks()
  const budget = {}
  let total = 0
  for (const c of chunks) {
    const limit = Math.ceil(c.size * HEADROOM)
    budget[c.name] = { maxBytes: limit, comment: `${kB(c.size)} kB actual → ${kB(limit)} kB budget` }
    total += c.size
  }
  budget._total = { maxBytes: Math.ceil(total * HEADROOM), comment: `${kB(total)} kB actual → ${kB(Math.ceil(total * HEADROOM))} kB budget` }
  writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2) + '\n')
  console.log(`✅  bundle-budget.json updated (${chunks.length} chunks, total ${kB(total)} kB)`)
  process.exit(0)
}

// ── check mode (default) ────────────────────────────────────────────
const budget = loadBudget()
if (!budget) {
  console.error('❌  bundle-budget.json not found — run with --update first')
  process.exit(1)
}

const chunks = getChunks()
let total = 0
let failures = 0

console.log('')
console.log(`${'Chunk'.padEnd(46)} ${'Size'.padStart(10)} ${'Budget'.padStart(10)}  Status`)
console.log('─'.repeat(82))

for (const c of chunks) {
  total += c.size
  const entry = budget[c.name]
  if (!entry) {
    console.log(`${pad(c.name, 46)} ${(kB(c.size) + ' kB').padStart(10)} ${'(new)'.padStart(10)}  ⚠️  NEW`)
    continue
  }
  const ok = c.size <= entry.maxBytes
  const status = ok ? '✅' : '❌ OVER'
  if (!ok) failures++
  console.log(`${pad(c.name, 46)} ${(kB(c.size) + ' kB').padStart(10)} ${(kB(entry.maxBytes) + ' kB').padStart(10)}  ${status}`)
}

// total check
console.log('─'.repeat(82))
if (budget._total) {
  const ok = total <= budget._total.maxBytes
  const status = ok ? '✅' : '❌ OVER'
  if (!ok) failures++
  console.log(`${pad('TOTAL', 46)} ${(kB(total) + ' kB').padStart(10)} ${(kB(budget._total.maxBytes) + ' kB').padStart(10)}  ${status}`)
}

console.log('')
if (failures > 0) {
  console.error(`❌  ${failures} budget(s) exceeded — run \`node scripts/bundle-size.js --update\` to reset budgets`)
  process.exit(1)
} else {
  console.log('✅  All chunks within budget')
  process.exit(0)
}
