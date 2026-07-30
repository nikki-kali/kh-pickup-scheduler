import { useState } from 'react'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_LABEL = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// value/onChange use plain 'YYYY-MM-DD' strings.
export default function PickupCalendar({ value, onChange }) {
  const today = startOfDay(new Date())
  const [viewDate, setViewDate] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : today
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          disabled={isCurrentMonth}
          aria-label="Previous month"
          className="grid h-8 w-8 place-items-center rounded-full text-kh-deep transition-colors hover:bg-teal-mist disabled:opacity-25 disabled:hover:bg-transparent"
        >
          ‹
        </button>
        <p className="font-data text-xs uppercase tracking-widest text-kh-deep">{MONTH_LABEL.format(viewDate)}</p>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          aria-label="Next month"
          className="grid h-8 w-8 place-items-center rounded-full text-kh-deep transition-colors hover:bg-teal-mist"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-center text-[11px] font-medium text-slate">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`pad-${i}`} />
          const cellDate = new Date(year, month, d)
          const key = toKey(cellDate)
          const isPast = cellDate < today
          const isSelected = value === key
          const isToday = toKey(today) === key

          return (
            <button
              type="button"
              key={key}
              disabled={isPast}
              onClick={() => onChange(key)}
              className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-kh-teal text-white'
                  : isPast
                    ? 'cursor-not-allowed text-slate/30'
                    : 'text-ink hover:bg-teal-mist'
              } ${isToday && !isSelected ? 'ring-1 ring-inset ring-kh-teal/40' : ''}`}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
