import { SEC_H } from './timelineUtils'
import TimelineBar from './TimelineBar'

export default function TimelineLane({ grp, tasks, getProj, startStr, dw, dragState, onOpen, onUpd, handleBarMouseDown, getBarCursor, getBarDragType, showHover, hideHover }) {
  return (
    <div>
      <div style={{ height: SEC_H, borderBottom: grp.color ? `2px solid ${grp.color}` : '1px solid var(--bd3)', background: 'var(--bg2)' }} />
      {grp.tasks.map(task => (
        <TimelineBar
          key={task.id}
          task={task}
          proj={getProj(task.pid)}
          tasks={tasks}
          startStr={startStr}
          dw={dw}
          dragState={dragState}
          onOpen={onOpen}
          onUpd={onUpd}
          handleBarMouseDown={handleBarMouseDown}
          getBarCursor={getBarCursor}
          getBarDragType={getBarDragType}
          showHover={showHover}
          hideHover={hideHover}
        />
      ))}
    </div>
  )
}
