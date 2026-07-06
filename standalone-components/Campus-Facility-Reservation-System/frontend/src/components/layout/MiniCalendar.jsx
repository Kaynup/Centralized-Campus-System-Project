import React, { useState } from 'react'
import '../../styles/layout.css'

function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1)
  const startDay = first.getDay() // 0-6 (Sun-Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const weeks = []
  let current = 1 - startDay
  while (current <= daysInMonth) {
    const week = []
    for (let i = 0; i < 7; i++, current++) {
      if (current < 1 || current > daysInMonth) week.push(null)
      else week.push(current)
    }
    weeks.push(week)
  }
  return weeks
}

export default function MiniCalendar({ selectedDate, onDateChange }) {
  const today = new Date()
  const [active, setActive] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = active.getFullYear()
  const month = active.getMonth()
  const matrix = getMonthMatrix(year, month)

  const selectedParts = selectedDate ? selectedDate.split('-').map(Number) : []

  function prevMonth() {
    setActive(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setActive(new Date(year, month + 1, 1))
  }

  const handleDayClick = (dayVal) => {
    if (!dayVal || !onDateChange) return
    const formattedMonth = String(month + 1).padStart(2, '0')
    const formattedDay = String(dayVal).padStart(2, '0')
    onDateChange(`${year}-${formattedMonth}-${formattedDay}`)
  }

  return (
    <div className="mini-calendar">
      <div className="mini-header">
        <button onClick={prevMonth} aria-label="Previous month">‹</button>
        <div className="mini-month">{active.toLocaleString(undefined, { month: 'short', year: 'numeric' })}</div>
        <button onClick={nextMonth} aria-label="Next month">›</button>
      </div>
      <div className="mini-grid">
        <div className="mini-weekdays">
          {['S','M','T','W','T','F','S'].map((d, index) => (
            <div key={`${d}-${index}`} className="mini-weekday">{d}</div>
          ))}
        </div>
        {matrix.map((week, i) => (
          <div key={i} className="mini-week">
            {week.map((day, j) => {
              if (!day) return <div key={j} className="mini-day empty" />

              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const isSelected = selectedParts.length === 3 &&
                day === selectedParts[2] &&
                (month + 1) === selectedParts[1] &&
                year === selectedParts[0]

              let className = 'mini-day'
              if (isToday) className += ' today'
              if (isSelected) className += ' selected'

              return (
                <div 
                  key={j} 
                  className={className}
                  onClick={() => handleDayClick(day)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDayClick(day) }}
                >
                  {day}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
