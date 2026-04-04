import jsPDF from 'jspdf'
import { isOverdue } from '@/utils/filters'

/**
 * Generate a project status PDF report.
 *
 * Sections:
 *   1. Header with project name, date, status
 *   2. Progress overview (completion %, overdue count)
 *   3. Task breakdown by section (table)
 *   4. Priority distribution
 *   5. Upcoming deadlines (next 14 days)
 *   6. Team workload
 *
 * @param {Object}  project   - project object { name, description, color, statusLabel }
 * @param {Array}   tasks     - project tasks
 * @param {Array}   sections  - section names
 * @param {Object}  t         - i18n translations
 * @param {string}  lang      - 'en' | 'it'
 */
export function generateProjectReport(project, tasks, sections, t, lang = 'it', partners = [], workpackages = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const margin = 18
  const contentW = W - margin * 2
  let y = 20

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const dateLabel = today.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // ── Colors ──
  const accent = [55, 138, 221]       // #378ADD
  const textDark = [30, 30, 30]
  const textMid = [100, 100, 100]
  const textLight = [150, 150, 150]
  const green = [40, 167, 69]
  const orange = [255, 165, 0]
  const red = [220, 53, 69]
  const bgLight = [245, 245, 240]

  // ── Helpers ──
  const addPage = () => { doc.addPage(); y = 20 }
  const checkSpace = (need) => { if (y + need > 275) addPage() }

  const drawLine = (x1, yy, x2) => {
    doc.setDrawColor(...textLight)
    doc.setLineWidth(0.3)
    doc.line(x1, yy, x2, yy)
  }

  const sectionHeader = (label) => {
    checkSpace(14)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...accent)
    doc.text(label.toUpperCase(), margin, y)
    y += 2
    drawLine(margin, y, margin + contentW)
    y += 6
  }

  // ── 1. Header ──
  doc.setFillColor(...accent)
  doc.rect(0, 0, W, 38, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text(project.name, margin, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(t.reportSubtitle ?? 'Project Status Report', margin, 26)
  doc.text(dateLabel, margin, 32)

  // Status badge
  const statusMap = {
    on_track: { label: t.onTrack ?? 'On track', color: green },
    at_risk: { label: t.atRisk ?? 'At risk', color: orange },
    off_track: { label: t.offTrack ?? 'Off track', color: red },
  }
  const st = statusMap[project.statusLabel] ?? statusMap.on_track
  const badgeX = W - margin - 30
  doc.setFillColor(...st.color)
  doc.roundedRect(badgeX, 12, 30, 8, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(st.label, badgeX + 15, 17.5, { align: 'center' })

  y = 46

  // ── 2. Progress overview ──
  const pTasks = tasks
  const done = pTasks.filter(tk => tk.done).length
  const open = pTasks.length - done
  const pct = pTasks.length ? Math.round(done / pTasks.length * 100) : 0
  const odCount = pTasks.filter(tk => !tk.done && isOverdue(tk.due)).length

  // Stat cards
  const cardW = (contentW - 9) / 4
  const cards = [
    { label: t.reportTotal ?? 'Total tasks', value: String(pTasks.length), color: accent },
    { label: t.reportCompleted ?? 'Completed', value: `${done} (${pct}%)`, color: green },
    { label: t.reportOpen ?? 'Open', value: String(open), color: textMid },
    { label: t.reportOverdue ?? 'Overdue', value: String(odCount), color: odCount > 0 ? red : green },
  ]

  cards.forEach((card, i) => {
    const cx = margin + i * (cardW + 3)
    doc.setFillColor(...bgLight)
    doc.roundedRect(cx, y, cardW, 22, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...card.color)
    doc.text(card.value, cx + cardW / 2, y + 10, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...textMid)
    doc.text(card.label, cx + cardW / 2, y + 17, { align: 'center' })
  })
  y += 28

  // Progress bar
  doc.setFillColor(230, 230, 230)
  doc.roundedRect(margin, y, contentW, 4, 1, 1, 'F')
  if (pct > 0) {
    doc.setFillColor(...green)
    doc.roundedRect(margin, y, contentW * pct / 100, 4, 1, 1, 'F')
  }
  y += 10

  // Description
  if (project.description) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...textMid)
    const descLines = doc.splitTextToSize(project.description, contentW)
    doc.text(descLines.slice(0, 3), margin, y)
    y += descLines.slice(0, 3).length * 4 + 4
  }

  // ── 3. Task breakdown by section ──
  sectionHeader(t.reportBySection ?? 'Tasks by section')

  const secData = sections.map(sec => {
    const secTasks = pTasks.filter(tk => tk.sec === sec)
    const secDone = secTasks.filter(tk => tk.done).length
    const secOd = secTasks.filter(tk => !tk.done && isOverdue(tk.due)).length
    return { name: sec, total: secTasks.length, done: secDone, overdue: secOd }
  }).filter(s => s.total > 0)

  if (secData.length > 0) {
    // Table header
    doc.setFillColor(...bgLight)
    doc.rect(margin, y - 1, contentW, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...textDark)
    doc.text(t.section ?? 'Section', margin + 2, y + 3.5)
    doc.text(t.reportTotal ?? 'Total', margin + 80, y + 3.5)
    doc.text(t.reportCompleted ?? 'Done', margin + 100, y + 3.5)
    doc.text(t.reportOverdue ?? 'Overdue', margin + 120, y + 3.5)
    doc.text('%', margin + 145, y + 3.5)
    y += 9

    doc.setFont('helvetica', 'normal')
    secData.forEach(row => {
      checkSpace(7)
      doc.setFontSize(9)
      doc.setTextColor(...textDark)
      doc.text(row.name, margin + 2, y)
      doc.text(String(row.total), margin + 80, y)
      doc.setTextColor(...green)
      doc.text(String(row.done), margin + 100, y)
      doc.setTextColor(row.overdue > 0 ? red[0] : textMid[0], row.overdue > 0 ? red[1] : textMid[1], row.overdue > 0 ? red[2] : textMid[2])
      doc.text(String(row.overdue), margin + 120, y)
      doc.setTextColor(...textDark)
      const rowPct = row.total > 0 ? Math.round(row.done / row.total * 100) : 0
      doc.text(`${rowPct}%`, margin + 145, y)
      y += 6
    })
  }

  // ── 4. Priority distribution ──
  sectionHeader(t.reportByPriority ?? 'Priority distribution')

  const priData = ['high', 'medium', 'low'].map(p => ({
    label: p === 'high' ? (t.high ?? 'High') : p === 'medium' ? (t.medium ?? 'Medium') : (t.low ?? 'Low'),
    total: pTasks.filter(tk => tk.pri === p).length,
    open: pTasks.filter(tk => tk.pri === p && !tk.done).length,
    color: p === 'high' ? red : p === 'medium' ? orange : green,
  }))

  priData.forEach(row => {
    checkSpace(10)
    // Mini bar
    const barMax = contentW * 0.5
    const barW = pTasks.length > 0 ? barMax * row.total / pTasks.length : 0
    doc.setFillColor(240, 240, 240)
    doc.roundedRect(margin + 50, y - 3, barMax, 5, 1, 1, 'F')
    if (barW > 0) {
      doc.setFillColor(...row.color)
      doc.roundedRect(margin + 50, y - 3, barW, 5, 1, 1, 'F')
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...row.color)
    doc.text(row.label, margin + 2, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...textDark)
    doc.text(`${row.total} (${row.open} ${t.reportOpenLower ?? 'open'})`, margin + 50 + barMax + 4, y)
    y += 8
  })

  // ── 5. Upcoming deadlines ──
  const twoWeeks = new Date(today)
  twoWeeks.setDate(today.getDate() + 14)
  const twoWeekStr = twoWeeks.toISOString().slice(0, 10)
  const upcoming = pTasks
    .filter(tk => !tk.done && tk.due && tk.due >= todayStr && tk.due <= twoWeekStr)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 12)

  if (upcoming.length > 0) {
    sectionHeader(t.reportDeadlines ?? 'Upcoming deadlines (14 days)')

    upcoming.forEach(task => {
      checkSpace(7)
      const days = Math.round((new Date(task.due + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / 86400000)
      const urgencyColor = days === 0 ? red : days <= 2 ? orange : textMid

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...textDark)
      doc.text(task.title.slice(0, 50), margin + 2, y)

      doc.setTextColor(...textLight)
      doc.text(task.due, margin + 110, y)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...urgencyColor)
      const dayLabel = days === 0 ? (t.today ?? 'Today') : `${days}d`
      doc.text(dayLabel, margin + 145, y)
      y += 6
    })
  }

  // ── 6. Team workload ──
  const assignees = [...new Set(pTasks.filter(tk => tk.who?.length > 0).flatMap(tk => Array.isArray(tk.who) ? tk.who : [tk.who]))]
  if (assignees.length > 0) {
    sectionHeader(t.reportTeam ?? 'Team workload')

    assignees.sort((a, b) => {
      const aOpen = pTasks.filter(tk => {
        const whoArr = Array.isArray(tk.who) ? tk.who : [tk.who]
        return whoArr.includes(a) && !tk.done
      }).length
      const bOpen = pTasks.filter(tk => {
        const whoArr = Array.isArray(tk.who) ? tk.who : [tk.who]
        return whoArr.includes(b) && !tk.done
      }).length
      return bOpen - aOpen
    }).slice(0, 10).forEach(name => {
      checkSpace(10)
      const personTasks = pTasks.filter(tk => {
        const whoArr = Array.isArray(tk.who) ? tk.who : [tk.who]
        return whoArr.includes(name)
      })
      const personDone = personTasks.filter(tk => tk.done).length
      const personOpen = personTasks.length - personDone
      const personOd = personTasks.filter(tk => !tk.done && isOverdue(tk.due)).length

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...textDark)
      doc.text(name, margin + 2, y)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...textMid)
      const summary = `${personOpen} ${t.reportOpenLower ?? 'open'}, ${personDone} ${t.reportDoneLower ?? 'done'}`
      doc.text(summary, margin + 55, y)

      if (personOd > 0) {
        doc.setTextColor(...red)
        doc.text(`${personOd} ${t.reportOverdueLower ?? 'overdue'}`, margin + 120, y)
      }

      // Mini bar
      const barMax = 25
      const barW = personTasks.length > 0 ? barMax * personDone / personTasks.length : 0
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(margin + 150, y - 3, barMax, 4, 1, 1, 'F')
      if (barW > 0) {
        doc.setFillColor(...green)
        doc.roundedRect(margin + 150, y - 3, barW, 4, 1, 1, 'F')
      }
      y += 7
    })
  }

  // ── 7. Partner engagement ──
  const partnerMap = Object.fromEntries(partners.map(p => [p.id, p]))
  const partnerIds = [...new Set(pTasks.map(tk => tk.partnerId).filter(Boolean))]
  if (partnerIds.length > 0) {
    sectionHeader(t.reportPartners ?? 'Partner engagement')

    partnerIds.sort((a, b) => {
      const aCount = pTasks.filter(tk => tk.partnerId === a && !tk.done).length
      const bCount = pTasks.filter(tk => tk.partnerId === b && !tk.done).length
      return bCount - aCount
    }).forEach(pid => {
      const p = partnerMap[pid]
      const name = p?.name ?? pid
      checkSpace(10)
      const ptTasks = pTasks.filter(tk => tk.partnerId === pid)
      const ptDone = ptTasks.filter(tk => tk.done).length
      const ptOpen = ptTasks.length - ptDone
      const ptOd = ptTasks.filter(tk => !tk.done && isOverdue(tk.due)).length

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...textDark)
      doc.text(name, margin + 2, y)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...textMid)
      const summary = `${ptOpen} ${t.reportOpenLower ?? 'open'}, ${ptDone} ${t.reportDoneLower ?? 'done'}`
      doc.text(summary, margin + 55, y)

      if (ptOd > 0) {
        doc.setTextColor(...red)
        doc.text(`${ptOd} ${t.reportOverdueLower ?? 'overdue'}`, margin + 120, y)
      }

      // Mini bar
      const barMax = 25
      const barW = ptTasks.length > 0 ? barMax * ptDone / ptTasks.length : 0
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(margin + 150, y - 3, barMax, 4, 1, 1, 'F')
      if (barW > 0) {
        doc.setFillColor(...accent)
        doc.roundedRect(margin + 150, y - 3, barW, 4, 1, 1, 'F')
      }
      y += 7
    })
  }

  // ── 8. Workpackage progress ──
  const wpMap = Object.fromEntries(workpackages.map(wp => [wp.id, wp]))
  const wpIds = [...new Set(pTasks.map(tk => tk.workpackageId).filter(Boolean))]
  if (wpIds.length > 0) {
    sectionHeader(t.reportWorkpackages ?? 'Workpackage progress')

    wpIds.sort((a, b) => {
      const aCount = pTasks.filter(tk => tk.workpackageId === a && !tk.done).length
      const bCount = pTasks.filter(tk => tk.workpackageId === b && !tk.done).length
      return bCount - aCount
    }).forEach(wpId => {
      const wp = wpMap[wpId]
      const code = wp?.code ?? ''
      const name = wp?.name ?? wpId
      checkSpace(10)
      const wpTasks = pTasks.filter(tk => tk.workpackageId === wpId)
      const wpDone = wpTasks.filter(tk => tk.done).length
      const wpOpen = wpTasks.length - wpDone
      const wpOd = wpTasks.filter(tk => !tk.done && isOverdue(tk.due)).length

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...textDark)
      doc.text(`${code} ${name}`.trim(), margin + 2, y)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...textMid)
      const summary = `${wpOpen} ${t.reportOpenLower ?? 'open'}, ${wpDone} ${t.reportDoneLower ?? 'done'}`
      doc.text(summary, margin + 55, y)

      if (wpOd > 0) {
        doc.setTextColor(...red)
        doc.text(`${wpOd} ${t.reportOverdueLower ?? 'overdue'}`, margin + 120, y)
      }

      // Mini bar (purple accent)
      const barMax = 25
      const barW = wpTasks.length > 0 ? barMax * wpDone / wpTasks.length : 0
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(margin + 150, y - 3, barMax, 4, 1, 1, 'F')
      if (barW > 0) {
        doc.setFillColor(156, 39, 176) // purple #9C27B0
        doc.roundedRect(margin + 150, y - 3, barW, 4, 1, 1, 'F')
      }
      y += 7
    })
  }

  // ── Footer ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...textLight)
    doc.text(`TaskFlow — ${project.name}`, margin, 290)
    doc.text(`${i}/${pageCount}`, W - margin, 290, { align: 'right' })
  }

  // ── Save ──
  const safeName = project.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  doc.save(`report_${safeName}_${todayStr}.pdf`)
}
