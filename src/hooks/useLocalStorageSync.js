import { useEffect, useRef } from 'react'
import { storage } from '@/utils/storage'
import { oset } from '@/constants'

/**
 * useLocalStorageSync
 *
 * Replaces N separate useEffects (one per state key) with a single
 * batched write. Changes are collected during a React render cycle
 * and flushed together on the next microtask, reducing the number
 * of JSON.stringify + localStorage.setItem calls.
 *
 * @param {Object} global  - keys written without org namespace { lang, theme, orgs, activeOrgId }
 * @param {Object} orgData - keys written with org namespace { projs, ports, secs, tasks }
 * @param {string} orgId   - current org id for namespacing
 */
export function useLocalStorageSync(global, orgData, orgId) {
  const pending = useRef(null)

  // ── Global keys (no org namespace) ─────────────────────────────
  useEffect(() => {
    scheduleBatch(pending, () => {
      for (const [k, v] of Object.entries(global)) storage.set(k, v)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [global.lang, global.theme, global.orgs, global.activeOrgId])

  // ── Org-namespaced keys ────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return
    scheduleBatch(pending, () => {
      for (const [k, v] of Object.entries(orgData)) oset(orgId, k, v)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, orgData.projs, orgData.ports, orgData.secs, orgData.tasks])

  // ── Theme side-effect (data-theme attribute) ───────────────────
  useEffect(() => {
    if (global.theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', global.theme)
  }, [global.theme])
}

/** Collect writes and flush once per microtask. */
function scheduleBatch(ref, writeFn) {
  if (!ref.current) {
    ref.current = []
    queueMicrotask(() => {
      const batch = ref.current
      ref.current = null
      for (const fn of batch) fn()
    })
  }
  ref.current.push(writeFn)
}
