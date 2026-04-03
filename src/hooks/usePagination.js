import { useState, useMemo, useCallback } from 'react'

/**
 * usePagination
 *
 * Client-side pagination for filtered task lists.
 * Resets to page 1 when the item count changes (i.e. when filters change).
 *
 * @param {Array}  items    - full list of items to paginate
 * @param {number} pageSize - items per page (default 50)
 * @returns {{ page, totalPages, paged, setPage, next, prev, canNext, canPrev, startIndex, endIndex, total }}
 */
export function usePagination(items, pageSize = 50) {
  const [page, setPage] = useState(1)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Reset to page 1 when total changes (filter/search changed the set),
  // otherwise clamp to totalPages if current page is out of range.
  const [prevTotal, setPrevTotal] = useState(total)
  let safePage = page
  if (total !== prevTotal) {
    setPrevTotal(total)
    safePage = 1
    if (page !== 1) setPage(1)
  } else if (page > totalPages) {
    safePage = totalPages
    setPage(totalPages)
  }

  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, total)

  const paged = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  )

  const canPrev = safePage > 1
  const canNext = safePage < totalPages

  const next = useCallback(() => setPage(p => Math.min(p + 1, totalPages)), [totalPages])
  const prev = useCallback(() => setPage(p => Math.max(p - 1, 1)), [])

  return {
    page: safePage,
    totalPages,
    paged,
    setPage,
    next,
    prev,
    canNext,
    canPrev,
    startIndex,
    endIndex,
    total,
  }
}

/** Default page size for task views. */
export const DEFAULT_PAGE_SIZE = 50
