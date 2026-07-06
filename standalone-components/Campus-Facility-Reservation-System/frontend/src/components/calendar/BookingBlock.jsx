import React from 'react'
import '../../styles/calendar.css'

export default function BookingBlock({
  slot,
  span = 1,
  index = null,
  onClick = () => {},
  onMouseDown = () => {},
  onMouseEnter = () => {},
  onMouseLeave = () => {},
  onMouseUp = () => {},
  onContextMenu = () => {},
  selected = false,
  style = {},
  hoverText = null,
}) {
  const status = slot?.status || 'AVAILABLE'
  const className = `booking-block booking-${status}${selected ? ' selected' : ''}`

  const handleClick = (e) => {
    e.stopPropagation()
    if (onClick) onClick(slot)
  }

  const title = slot?.startTime && slot?.endTime ? `${slot.startTime}–${slot.endTime} • ${status}` : status
  const isHiddenLabel = status === 'AVAILABLE' || status === 'PAST' || status?.endsWith('-END')

  return (
    <div
      className={className}
      style={{ gridColumn: `span ${span}`, position: 'relative', ...style }}
      role={status === 'PAST' ? 'article' : 'button'}
      tabIndex={status === 'PAST' ? -1 : 0}
      onClick={handleClick}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(slot, index) }}
      onMouseEnter={(e) => { e.stopPropagation(); onMouseEnter(slot, index) }}
      onMouseLeave={(e) => { e.stopPropagation(); onMouseLeave(slot, index) }}
      onMouseUp={(e) => { e.stopPropagation(); onMouseUp(slot, index) }}
      onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, slot) }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e) }}
      aria-label={`${slot?.startTime || ''} ${slot?.endTime || ''} ${status}`}
      title={title}
    >
      {!isHiddenLabel && (
        <>
          <div style={{ fontSize: 11 }}>{slot?.startTime ? `${slot.startTime}` : ''}</div>
          <div style={{ marginLeft: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {slot?.userName || status}
          </div>
        </>
      )}
      {hoverText && (
        <div style={{
          position: 'absolute',
          background: 'var(--color-primary, #2563eb)',
          color: '#fff',
          fontSize: '10px',
          fontWeight: 600,
          padding: '3px 6px',
          borderRadius: '4px',
          top: '-25px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {hoverText}
        </div>
      )}
    </div>
  )
}
