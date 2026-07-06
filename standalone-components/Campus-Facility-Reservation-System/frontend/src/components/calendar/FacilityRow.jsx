import React, { useEffect, useState } from 'react'
import BookingBlock from './BookingBlock'
import { getSlotIndex, calculateSlotSpan, getMinSlotsForFacility } from '../../utils/bookingHelpers'
import { isSlotBeforeNow, slotIndexToTime } from '../../utils/slotLogic'
import '../../styles/calendar.css'

export default function FacilityRow({
  facility,
  slots = [],
  onSlotClick = () => {},
  onSlotRangeSelect = () => {},
  start = '07:00',
  slotMinutes = 10,
  selectedDate = new Date().toISOString().split('T')[0],
  filters = {},
  multiSelectMode = false,
  selectedSlots = [],
  selectedFacility = null,
}) {
  // Build a map of startIndex -> slot and mark used indices
  const slotMap = {}
  slots.forEach((s) => {
    const idx = getSlotIndex(s.startTime || s.start_time, start, slotMinutes)
    slotMap[idx] = s
  })

  const selectedSlotKeys = new Set(selectedSlots.map((slot) => `${facility.id}-${slot.startTime || slot.start_time}-${slot.endTime || slot.end_time}`))
  const selectedFacilityMatches = !selectedFacility || selectedFacility.id === facility.id
  const total = 60
  const indexToSlot = new Array(total)
  const cellData = []
  let i = 0

  while (i < total) {
    const s = slotMap[i]
    if (s && s.status !== 'AVAILABLE' && s.status !== 'PAST') {
      let span = 1;
      let mergedSlot = { ...s };
      
      const isSameBooking = (nextSlot) => {
        if (!nextSlot) return false;
        if (s.bookingId && nextSlot.bookingId === s.bookingId) return true;
        if (s.booking_id && nextSlot.booking_id === s.booking_id) return true;
        if (!s.bookingId && !s.booking_id && nextSlot.status === s.status && nextSlot.userName === s.userName) return true;
        return false;
      };

      while (i + span < total) {
        const nextSlot = slotMap[i + span];
        if (isSameBooking(nextSlot)) {
          span += 1;
          mergedSlot.endTime = nextSlot.endTime || nextSlot.end_time;
        } else {
          break;
        }
      }

      for (let j = 0; j < span; j += 1) {
        indexToSlot[i + j] = mergedSlot
      }

      const isBookingPast = isSlotBeforeNow(i + span - 1, selectedDate, start, slotMinutes)
      if (isBookingPast) {
        mergedSlot.status = 'PAST'
      }

      cellData.push({
        key: `slot-${i}`,
        slot: mergedSlot,
        span,
        type: 'booking',
        isVisible: true,
        status: mergedSlot.status,
        index: i,
      })
      i += span
      continue
    }

    if (s) {
      const isAvailable = s.status === 'AVAILABLE'
      indexToSlot[i] = s
      cellData.push({
        key: `empty-${i}`,
        slot: s,
        span: 1,
        type: isAvailable ? 'empty' : 'booking',
        isVisible: true,
        status: s.status,
        isAvailable,
        index: i,
      })
      i += 1
      continue
    }

    const isPast = isSlotBeforeNow(i, selectedDate, start, slotMinutes)
    const isAvailable = !isPast
    const emptySlot = {
      startTime: slotIndexToTime(i, start, slotMinutes),
      endTime: slotIndexToTime(i + 1, start, slotMinutes),
      status: isPast ? 'PAST' : 'AVAILABLE',
      userName: isPast ? 'Past time' : 'Available',
    }

    indexToSlot[i] = emptySlot

    cellData.push({
      key: `empty-${i}`,
      slot: emptySlot,
      span: 1,
      type: 'empty',
      isVisible: true,
      status: emptySlot.status,
      isAvailable,
      index: i,
    })
    i += 1
  }

  const [dragActive, setDragActive] = useState(false)
  const [dragStartIndex, setDragStartIndex] = useState(null)
  const [dragEndIndex, setDragEndIndex] = useState(null)
  const [hasDragged, setHasDragged] = useState(false)
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState(null)
  const clickSuppressed = React.useRef(false)

  useEffect(() => {
    if (!multiSelectMode) {
      setDragActive(false)
      setDragStartIndex(null)
      setDragEndIndex(null)
      setHasDragged(false)
      setHoveredSlotIndex(null)
      clickSuppressed.current = false
    }
  }, [multiSelectMode])

  const handleCellClick = (slot, index) => {
    if (multiSelectMode && (hasDragged || clickSuppressed.current)) {
      setHasDragged(false)
      clickSuppressed.current = false
      return
    }

    onSlotClick(slot, facility)
  }

  const handleCellMouseLeave = () => {
    if (multiSelectMode) {
      setHoveredSlotIndex(null)
    }
  }

  const handleCellContextMenu = (event, slot) => {
    if (!multiSelectMode) return
    event.preventDefault()
    event.stopPropagation()

    const slotKey = `${facility.id}-${slot.startTime || slot.start_time}-${slot.endTime || slot.end_time}`
    const isSelected = selectedFacilityMatches && selectedSlotKeys.has(slotKey)
    if (!isSelected) return

    onSlotClick(slot, facility)
  }

  const commitDragSelection = () => {
    if (!dragActive || dragStartIndex === null || dragEndIndex === null) {
      setDragActive(false)
      setHasDragged(false)
      return
    }

    const [startIndex, endIndex] = [dragStartIndex, dragEndIndex].sort((a, b) => a - b)
    const range = []
    for (let idx = startIndex; idx <= endIndex; idx += 1) {
      const item = indexToSlot[idx]
      if (!item || item.status !== 'AVAILABLE') {
        setDragActive(false)
        setHasDragged(false)
        setDragStartIndex(null)
        setDragEndIndex(null)
        return
      }
      range.push(item)
    }

    if (range.length) {
      onSlotRangeSelect(range, facility)
      clickSuppressed.current = true
    }

    setDragActive(false)
    setHasDragged(false)
    setDragStartIndex(null)
    setDragEndIndex(null)
  }

  const handleCellMouseDown = (slot, index) => {
    if (!multiSelectMode || slot.status !== 'AVAILABLE' || (selectedSlots.length > 0 && !selectedFacilityMatches)) return
    setDragActive(true)
    setDragStartIndex(index)
    setDragEndIndex(index)
    setHasDragged(false)
  }

  const handleCellMouseEnter = (slot, index) => {
    if (!multiSelectMode || slot.status !== 'AVAILABLE' || (selectedSlots.length > 0 && !selectedFacilityMatches)) {
      setHoveredSlotIndex(null)
      return
    }
    setHoveredSlotIndex(index)
    if (dragActive && index !== dragEndIndex) {
      setHasDragged(true)
      setDragEndIndex(index)
    }
  }

  const handleCellMouseUp = () => {
    if (!multiSelectMode) return
    commitDragSelection()
  }

  const minSlotsReq = getMinSlotsForFacility(facility.facilityGroup || facility.facility_group)
  const currentSelectedCount = selectedFacilityMatches ? selectedSlots.length : 0
  const neededCount = Math.max(0, minSlotsReq - currentSelectedCount)

  return (
    <div className="facility-row">
      <div className="facility-label">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>{facility.name}</div>
            {(facility.requiresApproval === 2 || facility.requires_approval === 2) ? (
              <span title="Requires Student & Professor Approval" style={{ fontSize: '0.85rem', opacity: 0.7 }}>🔒🔒</span>
            ) : (facility.requiresApproval === 1 || facility.requires_approval === 1) ? (
              <span title="Requires Student Approval" style={{ fontSize: '0.85rem', opacity: 0.7 }}>🔒</span>
            ) : null}
          </div>
          {facility.capacity && (
            <div style={{
              fontSize: '0.65rem',
              color: 'var(--color-text-secondary)',
              background: 'rgba(255,255,255,0.06)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap'
            }}>
              Capacity: {facility.capacity}
            </div>
          )}
        </div>
      </div>
      <div className="time-grid" onMouseUp={handleCellMouseUp}>
        <div className="time-grid-inner">
          {cellData.map((cell) => {
            const isSelected = selectedFacilityMatches && selectedSlotKeys.has(`${facility.id}-${cell.slot.startTime || cell.slot.start_time}-${cell.slot.endTime || cell.slot.end_time}`)
            const selectionProps = {
              onMouseDown: () => handleCellMouseDown(cell.slot, cell.index),
              onMouseEnter: () => handleCellMouseEnter(cell.slot, cell.index),
              onMouseUp: () => handleCellMouseUp(),
              selected: isSelected,
            }

            if (cell.type === 'booking') {
              return (
                <BookingBlock
                  key={cell.key}
                  slot={cell.slot}
                  span={cell.span}
                  index={cell.index}
                  onClick={() => handleCellClick(cell.slot, cell.index)}
                  onContextMenu={(e) => handleCellContextMenu(e, cell.slot)}
                  onMouseLeave={handleCellMouseLeave}
                  {...selectionProps}
                  hoverText={currentSelectedCount > 0 && hoveredSlotIndex === cell.index && neededCount > 0 && cell.isAvailable && !isSelected ? `Select ${neededCount} more slot${neededCount !== 1 ? 's' : ''}` : null}
                  style={cell.isVisible ? {} : { visibility: 'hidden' }}
                />
              )
            }

            return (
              <div
                key={cell.key}
                className={`time-slot ${cell.status === 'PAST' ? 'past' : cell.isAvailable ? 'available' : ''}${isSelected ? ' selected' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => handleCellClick(cell.slot, cell.index)}
                onMouseDown={() => handleCellMouseDown(cell.slot, cell.index)}
                onMouseEnter={() => handleCellMouseEnter(cell.slot, cell.index)}
                onMouseLeave={handleCellMouseLeave}
                onMouseUp={() => handleCellMouseUp()}
                onContextMenu={(e) => handleCellContextMenu(e, cell.slot)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCellClick(cell.slot, cell.index) }}
                style={{ position: 'relative', ...(cell.isVisible ? {} : { visibility: 'hidden' }) }}
              >
                {currentSelectedCount > 0 && hoveredSlotIndex === cell.index && neededCount > 0 && cell.isAvailable && !isSelected && (
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
                    Select {neededCount} more slot{neededCount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
