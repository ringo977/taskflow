export const BASE_DAY_W = 28
export const ROW_H = 44
export const BAR_H = 24
export const LABEL_W = 210
export const HEADER_H = 34
export const SEC_H = 28
export const ZOOM_STEPS = [0.35, 0.5, 0.75, 1, 1.5, 2, 3]
export const EDGE_ZONE = 8  // px from bar edge to trigger resize

export function dateToMs(str) { return str ? new Date(str + 'T12:00:00').getTime() : null }
export function msToDs(ms) { return new Date(ms).toISOString().slice(0, 10) }
export function daysBetween(a, b) { return Math.round((dateToMs(b) - dateToMs(a)) / 86400000) }
export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
