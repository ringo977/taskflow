/**
 * Re-export shim — all logic lives in src/lib/db/ modules.
 * This file exists only for backwards compatibility; prefer
 * importing from '@/lib/db' which resolves to db/index.js.
 */
export * from './db/index'
