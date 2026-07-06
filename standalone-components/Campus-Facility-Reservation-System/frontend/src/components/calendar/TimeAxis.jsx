import React from 'react'
import '../../styles/calendar.css'
import { isSlotBeforeNow } from '../../utils/slotLogic'

function generateSlots(start = '07:00', end = '17:00', slotMinutes = 10) {
  const slots = []
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let minutes = sh * 60 + sm
  const endMinutes = eh * 60 + em

  while (minutes < endMinutes) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    minutes += slotMinutes
  }

  return slots
}

export default function TimeAxis({ start = '07:00', end = '17:00', slotMinutes = 10, selectedDate = new Date().toISOString().split('T')[0] }) {
  const slots = generateSlots(start, end, slotMinutes)

  return (
    <div className="time-axis" role="presentation">
      <div className="time-row">
        <div className="corner-cell">Facility / Time</div>
        <div className="time-row" style={{ display: 'flex' }}>
          {slots.map((t, i) => {
            const isHour = t.endsWith(':00')
            const past = isSlotBeforeNow(i, selectedDate, start, slotMinutes)
            return (
              <div key={t} className={`time-cell ${isHour ? 'hour' : ''} ${past ? 'past' : ''}`} data-slot-index={i}>
                {isHour ? t : ''}
              </div>
            )
          })}
          {/* append end label (e.g., 17:00) so axis shows end time */}
          <div className={`time-cell ${end.endsWith(':00') ? 'hour' : ''}`} data-slot-index={slots.length}>{end.endsWith(':00') ? end : ''}</div>
        </div>
      </div>
    </div>
  )
}
