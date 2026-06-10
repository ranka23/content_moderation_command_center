import React, { useState, useRef, useEffect, useCallback } from 'react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import { cn } from '@cmcc/ui'
import { Button } from '@cmcc/ui'
/**
 * Date range picker with a popover calendar.
 * Default: last 7 days.
 */
export function DateRangePicker({ value, onChange, className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Default range: last 7 days
  const defaultRange = {
    from: subDays(startOfDay(new Date()), 6),
    to: endOfDay(new Date()),
  }

  const range = value || defaultRange

  // Preset options
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
        setOpen(false)
      }
    },
    [onChange],
  )

  return (
    <div className={cn('tw-relative', className)} ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="tw-w-[280px] tw-justify-start tw-text-left tw-font-normal"
      >
        <CalendarIcon className="tw-mr-2 tw-h-4 tw-w-4" />
        <span>{displayText}</span>
      </Button>

      {open && (
        <div className="tw-absolute tw-z-50 tw-mt-1 tw-rounded-lg tw-border tw-border-border tw-bg-background tw-shadow-lg">
          {/* Presets */}
          <div className="tw-flex tw-border-b tw-border-border">
            {presets.map((preset) => (
              <button
                key={preset.label}
                className="tw-flex-1 tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-text-muted-foreground hover:tw-bg-muted hover:tw-text-foreground tw-transition-colors first:tw-rounded-tl-lg last:tw-rounded-tr-lg"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* Calendar */}
          <div className="tw-p-2">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleDayPickerSelect}
              numberOfMonths={2}
              defaultMonth={range?.from}
              className="!tw-m-0"
              classNames={{
                months: 'tw-flex tw-gap-4',
                month: 'tw-m-0',
                caption:
                  'tw-flex tw-items-center tw-justify-between tw-px-1 tw-py-2 tw-text-sm tw-font-semibold',
                nav: 'tw-flex tw-gap-1',
                nav_button:
                  'tw-h-7 tw-w-7 tw-bg-transparent tw-p-0 tw-opacity-50 hover:tw-opacity-100',
                nav_button_previous: 'tw-mr-auto',
                nav_button_next: 'tw-ml-auto',
                table: 'tw-w-full tw-border-collapse',
                head_row: 'tw-flex',
                head_cell:
                  'tw-w-9 tw-text-xs tw-font-medium tw-text-muted-foreground tw-text-center tw-pb-2',
                row: 'tw-flex tw-w-full tw-mt-0',
                cell: 'tw-h-9 tw-w-9 tw-text-center tw-text-sm tw-p-0 tw-relative',
                day: 'tw-h-9 tw-w-9 tw-rounded-md tw-p-0 tw-text-sm tw-font-normal tw-aria-selected:tw-opacity-100 hover:tw-bg-muted',
                day_selected:
                  'tw-bg-primary-600 tw-text-white hover:tw-bg-primary-600 hover:tw-text-white',
                day_today: 'tw-bg-muted tw-font-semibold',
                day_outside: 'tw-text-muted-foreground tw-opacity-50',
                day_disabled: 'tw-text-muted-foreground tw-opacity-50',
                day_range_middle: 'tw-bg-primary-100 tw-text-primary-800',
                day_range_end: 'tw-bg-primary-600 tw-text-white',
                day_range_start: 'tw-bg-primary-600 tw-text-white',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

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
