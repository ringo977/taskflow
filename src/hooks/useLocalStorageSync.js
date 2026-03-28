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
  const { lang, theme, orgs, activeOrgId } = global
  useEffect(() => {
    scheduleBatch(pending, () => {
      storage.set('lang', lang)
      storage.set('theme', theme)
      storage.set('orgs', orgs)
      storage.set('activeOrgId', activeOrgId)
    })
  }, [lang, theme, orgs, activeOrgId])

  // ── Org-namespaced keys ────────────────────────────────────────
  const { projs, ports, secs, tasks } = orgData
  useEffect(() => {
    if (!orgId) return
    scheduleBatch(pending, () => {
      oset(orgId, 'projs', projs)
      oset(orgId, 'ports', ports)
      oset(orgId, 'secs', secs)
      oset(orgId, 'tasks', tasks)
    })
  }, [orgId, projs, ports, secs, tasks])

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
