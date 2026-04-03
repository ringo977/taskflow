import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePagination, DEFAULT_PAGE_SIZE } from './usePagination'

const items = (n) => Array.from({ length: n }, (_, i) => ({ id: `t${i}` }))

describe('usePagination', () => {
  it('returns all items when count <= pageSize', () => {
    const { result } = renderHook(() => usePagination(items(10), 50))
    expect(result.current.paged).toHaveLength(10)
    expect(result.current.page).toBe(1)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.canPrev).toBe(false)
    expect(result.current.canNext).toBe(false)
  })

  it('paginates items exceeding pageSize', () => {
    const { result } = renderHook(() => usePagination(items(75), 50))
    expect(result.current.paged).toHaveLength(50)
    expect(result.current.totalPages).toBe(2)
    expect(result.current.canNext).toBe(true)
    expect(result.current.canPrev).toBe(false)
    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(50)
  })

  it('navigates to next page', () => {
    const { result } = renderHook(() => usePagination(items(75), 50))
    act(() => result.current.next())
    expect(result.current.page).toBe(2)
    expect(result.current.paged).toHaveLength(25)
    expect(result.current.startIndex).toBe(50)
    expect(result.current.endIndex).toBe(75)
    expect(result.current.canNext).toBe(false)
    expect(result.current.canPrev).toBe(true)
  })

  it('navigates back to previous page', () => {
    const { result } = renderHook(() => usePagination(items(75), 50))
    act(() => result.current.next())
    act(() => result.current.prev())
    expect(result.current.page).toBe(1)
    expect(result.current.paged).toHaveLength(50)
  })

  it('prev does not go below page 1', () => {
    const { result } = renderHook(() => usePagination(items(10), 50))
    act(() => result.current.prev())
    expect(result.current.page).toBe(1)
  })

  it('next does not exceed totalPages', () => {
    const { result } = renderHook(() => usePagination(items(75), 50))
    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.page).toBe(2)
  })

  it('setPage jumps to specific page', () => {
    const { result } = renderHook(() => usePagination(items(150), 50))
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)
    expect(result.current.paged).toHaveLength(50)
    expect(result.current.startIndex).toBe(100)
  })

  it('resets to page 1 when item count changes', () => {
    let list = items(100)
    const { result, rerender } = renderHook(
      ({ items: i }) => usePagination(i, 50),
      { initialProps: { items: list } }
    )
    act(() => result.current.setPage(2))
    expect(result.current.page).toBe(2)

    // Filter shrinks list
    list = items(30)
    rerender({ items: list })
    expect(result.current.page).toBe(1)
    expect(result.current.totalPages).toBe(1)
  })

  it('clamps page when items shrink below current page', () => {
    let list = items(150)
    const { result, rerender } = renderHook(
      ({ items: i }) => usePagination(i, 50),
      { initialProps: { items: list } }
    )
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    // Shrink to 60 items (only 2 pages)
    list = items(60)
    rerender({ items: list })
    // Total changed so resets to 1
    expect(result.current.page).toBe(1)
  })

  it('handles empty items', () => {
    const { result } = renderHook(() => usePagination([], 50))
    expect(result.current.paged).toHaveLength(0)
    expect(result.current.page).toBe(1)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.total).toBe(0)
    expect(result.current.canPrev).toBe(false)
    expect(result.current.canNext).toBe(false)
  })

  it('exports DEFAULT_PAGE_SIZE as 50', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(50)
  })

  it('total reflects item count', () => {
    const { result } = renderHook(() => usePagination(items(123), 50))
    expect(result.current.total).toBe(123)
  })

  it('handles exact pageSize boundary', () => {
    const { result } = renderHook(() => usePagination(items(50), 50))
    expect(result.current.totalPages).toBe(1)
    expect(result.current.paged).toHaveLength(50)
    expect(result.current.canNext).toBe(false)
  })

  it('handles pageSize + 1', () => {
    const { result } = renderHook(() => usePagination(items(51), 50))
    expect(result.current.totalPages).toBe(2)
    act(() => result.current.next())
    expect(result.current.paged).toHaveLength(1)
  })
})
