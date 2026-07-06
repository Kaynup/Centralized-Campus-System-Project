import React, { useMemo, useRef, useEffect } from 'react'
import TimeAxis from './TimeAxis'
import FacilityRow from './FacilityRow'
import '../../styles/calendar.css'
import { MOCK_FACILITIES, generateMockSlotsForAllFacilities } from '../../api/mockData'
import { getLocalDateString } from '../../utils/dateHelpers'
import { getSlotIndex } from '../../utils/bookingHelpers'
import { isSlotBeforeNow } from '../../utils/slotLogic'

export default function CalendarGrid({
  facilities = null,
  slotsMap = null,
  selectedDate = getLocalDateString(),
  onSlotClick = () => {},
  onSlotRangeSelect = () => {},
  filters = {},
  multiSelectMode = false,
  selectedSlots = [],
  selectedFacility = null,
}) {
  const resolvedSlotsMap = useMemo(() => slotsMap || generateMockSlotsForAllFacilities(selectedDate), [slotsMap, selectedDate])
  const indicatorRef = useRef(null)

  // Filter facilities based on filters state
  const filteredFacilities = useMemo(() => {
    let result = facilities || MOCK_FACILITIES

    // 1. Group filter
    if (filters.group && filters.group !== 'All') {
      result = result.filter((f) => f.group === filters.group)
    }

    // 2. Search query filter
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim()
      result = result.filter((f) =>
        f.name.toLowerCase().includes(q) || (f.group || '').toLowerCase().includes(q)
      )
    }

    // 3. Available only filter
    if (filters.availableOnly) {
      result = result.filter((f) => {
        const slots = resolvedSlotsMap[f.id] || []
        const slotMap = {}
        slots.forEach((s) => {
          const idx = getSlotIndex(s.startTime || s.start_time, '07:00', 10)
          slotMap[idx] = s
        })
        for (let i = 0; i < 60; i++) {
          if (!slotMap[i]) {
            const isPast = isSlotBeforeNow(i, selectedDate, '07:00', 10)
            if (!isPast) return true // Found an empty, future slot
          } else if (slotMap[i].status === 'AVAILABLE') {
            return true
          }
        }
        return false
      })
    }

    // 4. My reservations only filter
    if (filters.myReservationsOnly) {
      result = result.filter((f) => {
        const slots = resolvedSlotsMap[f.id] || []
        return slots.some((s) => s.status === 'MY_BOOKING' || s.status === 'PENDING')
      })
    }

    // 5. Approval State filter
    if (filters.approvalState === 'Pending Only') {
      result = result.filter((f) => {
        const slots = resolvedSlotsMap[f.id] || []
        return slots.some((s) => s.status === 'PENDING')
      })
    } else if (filters.approvalState === 'Approved Only') {
      result = result.filter((f) => {
        const slots = resolvedSlotsMap[f.id] || []
        return slots.some((s) => s.status === 'RESERVED' || s.status === 'MY_BOOKING')
      })
    }

    return result
  }, [facilities, filters, resolvedSlotsMap, selectedDate])

  // Group facilities by group name
  const groups = useMemo(() => {
    const map = {}
    filteredFacilities.forEach((f) => {
      if (!map[f.group]) map[f.group] = []
      map[f.group].push(f)
    })
    return map
  }, [filteredFacilities])

  useEffect(() => {
    let timer
    const root = typeof document !== 'undefined' ? document.documentElement : null
    const updateIndicator = () => {
      if (!indicatorRef.current || !root) return
      const todayStr = getLocalDateString()
      if (selectedDate !== todayStr) {
        indicatorRef.current.style.display = 'none'
        return
      }

      const now = new Date()
      const minutes = now.getHours() * 60 + now.getMinutes()
      const startMinutes = 7 * 60
      const endMinutes = 17 * 60
      if (minutes < startMinutes || minutes > endMinutes) {
        indicatorRef.current.style.display = 'none'
        return
      }

      const slotWidthRaw = getComputedStyle(root).getPropertyValue('--time-slot-width') || '20px'
      const facilityLabelRaw = getComputedStyle(root).getPropertyValue('--facility-label-width') || '180px'
      const rowHeightRaw = getComputedStyle(root).getPropertyValue('--row-height') || '56px'
      const slotWidth = parseFloat(slotWidthRaw)
      const facilityLabelWidth = parseFloat(facilityLabelRaw)
      const rowHeight = parseFloat(rowHeightRaw)
      const minutesFromStart = minutes - startMinutes
      const offset = facilityLabelWidth + (minutesFromStart / 10) * slotWidth
      
      indicatorRef.current.style.left = `${offset}px`
      
      const parent = indicatorRef.current.parentElement
      if (parent) {
        indicatorRef.current.style.height = `${parent.scrollHeight - rowHeight}px`
      }
      
      indicatorRef.current.style.display = 'block'
    }

    // initial update
    updateIndicator()
    // update every minute
    timer = setInterval(updateIndicator, 60 * 1000)
    return () => clearInterval(timer)
  }, [selectedDate])

  if (!filteredFacilities || filteredFacilities.length === 0) {
    return (
      <div className="calendar-shell">
        <TimeAxis selectedDate={selectedDate} />
        <div style={{ padding: '2rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          No facilities match the selected filters.
        </div>
      </div>
    )
  }

  return (
    <div className="calendar-shell">
      <TimeAxis selectedDate={selectedDate} />

      <div ref={indicatorRef} className="current-time-indicator" />

      {Object.entries(groups).map(([groupName, facilitiesGroup]) => (
        <React.Fragment key={groupName}>
          <div className="facility-group">{groupName}</div>
          {facilitiesGroup.map((facility) => (
            <FacilityRow
              key={facility.id}
              facility={facility}
              slots={resolvedSlotsMap[facility.id] || []}
              onSlotClick={onSlotClick}
              onSlotRangeSelect={onSlotRangeSelect}
              selectedDate={selectedDate}
              filters={filters}
              multiSelectMode={multiSelectMode}
              selectedSlots={selectedSlots}
              selectedFacility={selectedFacility}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  )
}
