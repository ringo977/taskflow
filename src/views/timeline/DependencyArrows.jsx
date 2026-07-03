import { HEADER_H } from './timelineUtils'

export default function DependencyArrows({ depArrows, totalW, chartH, hoverDep, setHoverDep, hoverTask }) {
  return (
    <svg style={{ position: 'absolute', top: HEADER_H, left: 0, width: totalW, height: chartH - HEADER_H, pointerEvents: 'none', zIndex: 3 }}>
      <defs>
        <marker id="dep-arrow" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L8 3L0 6z" fill="var(--c-warning)" />
        </marker>
        <marker id="dep-arrow-hl" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L8 3L0 6z" fill="var(--c-brand)" />
        </marker>
      </defs>
      {depArrows.map((a, i) => {
        const midX = (a.x1 + a.x2) / 2
        const hl = hoverDep === i || (hoverTask && (hoverTask.id === a.fromId || hoverTask.id === a.toId))
        return (
          <path key={i}
            d={`M${a.x1},${a.y1} C${midX},${a.y1} ${midX},${a.y2} ${a.x2},${a.y2}`}
            fill="none" stroke={hl ? 'var(--c-brand)' : 'var(--c-warning)'}
            strokeWidth={hl ? 2.5 : 1.5} strokeDasharray={hl ? 'none' : '4 3'}
            markerEnd={hl ? 'url(#dep-arrow-hl)' : 'url(#dep-arrow)'} opacity={hl ? 1 : 0.7}
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onMouseEnter={() => setHoverDep(i)}
            onMouseLeave={() => setHoverDep(null)}
          />
        )
      })}
    </svg>
  )
}
