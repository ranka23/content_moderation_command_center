import React, { useState, useRef, useEffect, useCallback } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import { cn } from '@cmcc/ui'

/**
 * MUI-inspired date range picker styled with CMCC design tokens.
 * Trigger looks like an outlined text field; popover shows a two-month
 * calendar with preset quick-picks. Same API: value={range} onChange={fn}.
 */
export function DateRangePicker({ value, onChange, className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const defaultRange = {
    from: subDays(startOfDay(new Date()), 6),
    to: endOfDay(new Date()),
  }

  const range = value || defaultRange

  // Reset animation class on every open
  const [animClass, setAnimClass] = useState('')

  const presets = [
    {
      label: 'Last 7 days',
      getValue: () => ({
        from: subDays(startOfDay(new Date()), 6),
        to: endOfDay(new Date()),
      }),
    },
    {
      label: 'Last 14 days',
      getValue: () => ({
        from: subDays(startOfDay(new Date()), 13),
        to: endOfDay(new Date()),
      }),
    },
    {
      label: 'Last 30 days',
      getValue: () => ({
        from: subDays(startOfDay(new Date()), 29),
        to: endOfDay(new Date()),
      }),
    },
    {
      label: 'Last 90 days',
      getValue: () => ({
        from: subDays(startOfDay(new Date()), 89),
        to: endOfDay(new Date()),
      }),
    },
  ]

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Trigger animation class on open/close
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM mounted before adding enter class
      requestAnimationFrame(() => setAnimClass('cmcc-dp-popover-enter'))
    } else {
      setAnimClass('cmcc-dp-popover-exit')
    }
  }, [open])

  const displayText = range?.from
    ? range.to
      ? `${format(range.from, 'MMM d, yyyy')} – ${format(range.to, 'MMM d, yyyy')}`
      : `${format(range.from, 'MMM d, yyyy')} – ...`
    : 'Select date range'

  const handlePreset = useCallback(
    (preset) => {
      onChange(preset.getValue())
      setOpen(false)
    },
    [onChange],
  )

  const handleDayPickerSelect = useCallback(
    (selected) => {
      if (selected?.from) {
        onChange({
          from: startOfDay(selected.from),
          to: selected.to ? endOfDay(selected.to) : endOfDay(selected.from),
        })
      }
      if (selected?.from && selected?.to) {
        // Delay close slightly for a smoother UX
        setTimeout(() => setOpen(false), 120)
      }
    },
    [onChange],
  )

  return (
    <div className={cn('cmcc-dp-wrapper', className)} ref={ref}>
      {/* ── MUI-Inspired Trigger ────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="cmcc-dp-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon className="cmcc-dp-trigger-icon" />
        <span className="cmcc-dp-trigger-text">{displayText}</span>
        <ChevronIcon
          className={cn('cmcc-dp-chevron', open && 'cmcc-dp-chevron-open')}
        />
      </button>

      {/* ── Calendar Popover ────────────────────────────────── */}
      {open && (
        <div
          className={cn('cmcc-dp-popover', animClass)}
          role="dialog"
          aria-label="Date range picker"
        >
          {/* Presets row */}
          <div className="cmcc-dp-presets">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="cmcc-dp-preset-btn"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="cmcc-dp-calendar-wrap">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleDayPickerSelect}
              numberOfMonths={2}
              defaultMonth={range?.from}
              classNames={{
                months: 'cmcc-dp-months',
                month: 'cmcc-dp-month',
                caption: 'cmcc-dp-caption',
                caption_label: 'cmcc-dp-caption-label',
                nav: 'cmcc-dp-nav',
                nav_button: 'cmcc-dp-nav-btn',
                nav_button_previous: 'cmcc-dp-nav-prev',
                nav_button_next: 'cmcc-dp-nav-next',
                table: 'cmcc-dp-table',
                head_row: 'cmcc-dp-head-row',
                head_cell: 'cmcc-dp-head-cell',
                row: 'cmcc-dp-row',
                cell: 'cmcc-dp-cell',
                day: 'cmcc-dp-day',
                day_selected: 'cmcc-dp-day-selected',
                day_today: 'cmcc-dp-day-today',
                day_outside: 'cmcc-dp-day-outside',
                day_disabled: 'cmcc-dp-day-disabled',
                day_range_middle: 'cmcc-dp-day-range-middle',
                day_range_end: 'cmcc-dp-day-range-end',
                day_range_start: 'cmcc-dp-day-range-start',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Icons ─────────────────────────────────────────────────────────── */

function CalendarIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

function ChevronIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
