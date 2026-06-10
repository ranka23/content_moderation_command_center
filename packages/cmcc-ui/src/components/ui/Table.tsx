import React, { useState, useCallback, useRef } from 'react'
import { cn } from '../../lib/cn'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ColumnDef<T = Record<string, unknown>> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  minWidth?: string
  align?: 'left' | 'center' | 'right'
  cell?: (row: T) => React.ReactNode
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export interface TableProps<T = Record<string, unknown>> {
  columns: ColumnDef<T>[]
  data: T[]
  sortConfig?: SortConfig
  onSort?: (field: string) => void
  onColumnResize?: (columnKey: string, width: number) => void
  isLoading?: boolean
  emptyMessage?: string
  rowKey?: (row: T, index: number) => string
  className?: string
}

// ─── Column Resize Hook ────────────────────────────────────────────────────

interface ResizeState {
  columnKey: string | null
  startX: number
  startWidth: number
}

export function useColumnResize(initialWidths: Record<string, string>): [
  Record<string, string>,
  (columnKey: string) => {
    onMouseDown: (e: React.MouseEvent) => void
  },
] {
  const [columnWidths, setColumnWidths] =
    useState<Record<string, string>>(initialWidths)
  const resizeRef = useRef<ResizeState | null>(null)

  const getResizeHandlers = useCallback(
    (columnKey: string) => ({
      onMouseDown: (e: React.MouseEvent): void => {
        e.preventDefault()
        const headerEl = (e.currentTarget as HTMLElement).parentElement
        if (!headerEl) return
        const startWidth = headerEl.offsetWidth
        resizeRef.current = {
          columnKey,
          startX: e.clientX,
          startWidth,
        }

        const onMouseMove = (ev: MouseEvent): void => {
          if (!resizeRef.current) return
          const diff = ev.clientX - resizeRef.current.startX
          const newWidth = Math.max(40, resizeRef.current.startWidth + diff)
          setColumnWidths((prev) => ({
            ...prev,
            [columnKey]: `${newWidth}px`,
          }))
        }

        const onMouseUp = (): void => {
          resizeRef.current = null
          document.removeEventListener('mousemove', onMouseMove)
          document.removeEventListener('mouseup', onMouseUp)
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
      },
    }),
    [],
  )

  return [columnWidths, getResizeHandlers]
}

// ─── Sort Icon ─────────────────────────────────────────────────────────────

function SortIcon({
  direction,
}: {
  direction?: 'asc' | 'desc' | undefined
}): React.ReactElement {
  return (
    <span className="tw-inline-flex tw-flex-col tw-leading-none tw-ml-1 tw-opacity-40">
      <svg
        width="8"
        height="4"
        viewBox="0 0 8 4"
        fill="currentColor"
        className={cn(
          direction === 'asc' ? 'tw-text-blue-600 tw-opacity-100' : '',
        )}
      >
        <path d="M4 0L8 4H0z" />
      </svg>
      <svg
        width="8"
        height="4"
        viewBox="0 0 8 4"
        fill="currentColor"
        className={cn(
          'tw-mt-px',
          direction === 'desc' ? 'tw-text-blue-600 tw-opacity-100' : '',
        )}
      >
        <path d="M4 4L0 0h8z" />
      </svg>
    </span>
  )
}

// ─── Table Component ───────────────────────────────────────────────────────

function TableInner<T extends Record<string, unknown>>({
  columns,
  data,
  sortConfig,
  onSort,
  columnWidths,
  getResizeHandlers,
  isLoading,
  emptyMessage = 'No data available',
  rowKey,
  className,
}: TableProps<T> & {
  columnWidths: Record<string, string>
  getResizeHandlers: (columnKey: string) => {
    onMouseDown: (e: React.MouseEvent) => void
  }
}): React.ReactElement {
  return (
    <div className="tw-w-full tw-overflow-x-auto tw-border tw-border-gray-200 tw-rounded-lg">
      <table
        className={cn('tw-w-full tw-border-collapse tw-text-sm', className)}
        style={{ tableLayout: 'fixed' }}
      >
        <thead>
          <tr className="tw-border-b tw-border-gray-200 tw-bg-gray-50">
            {columns.map((col) => {
              const handlers = getResizeHandlers(col.key)
              const width = columnWidths[col.key] ?? col.width
              const isSorted = sortConfig?.field === col.key
              const sortDir = isSorted ? sortConfig?.direction : undefined

              return (
                <th
                  key={col.key}
                  className={cn(
                    'tw-relative tw-h-11 tw-px-4 tw-text-xs tw-font-semibold tw-text-gray-600 tw-uppercase tw-tracking-wider',
                    col.align === 'left' && 'tw-text-left',
                    col.align === 'right' && 'tw-text-right',
                    !col.align && 'tw-text-center',
                    col.sortable &&
                      'tw-cursor-pointer tw-select-none hover:tw-bg-gray-100',
                  )}
                  style={{ width: width ?? undefined, minWidth: col.minWidth }}
                  onClick={() => {
                    if (col.sortable && onSort) {
                      onSort(col.key)
                    }
                  }}
                >
                  <div className="tw-inline-flex tw-items-center tw-gap-1">
                    <span>{col.label}</span>
                    {col.sortable && <SortIcon direction={sortDir} />}
                  </div>
                  {/* Resize handle */}
                  <div
                    className="tw-absolute tw-top-0 tw-right-0 tw-bottom-0 tw-w-1 tw-cursor-col-resize hover:tw-bg-blue-400 tw-opacity-0 hover:tw-opacity-100 tw-transition-opacity"
                    onMouseDown={handlers.onMouseDown}
                  />
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading && data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="tw-h-32 tw-text-center tw-text-gray-400"
              >
                <div className="tw-flex tw-items-center tw-justify-center tw-gap-2">
                  <svg
                    className="tw-h-5 tw-w-5 tw-animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="tw-opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="tw-opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="tw-h-32 tw-text-center tw-text-gray-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const key = rowKey ? rowKey(row, idx) : idx
              return (
                <tr
                  key={key}
                  className="tw-border-b tw-border-gray-100 hover:tw-bg-gray-50 tw-transition-colors last:tw-border-0"
                >
                  {columns.map((col) => {
                    const value = (row as Record<string, unknown>)[col.key]
                    const cellContent = col.cell
                      ? col.cell(row)
                      : String(value ?? '')
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'tw-px-4 tw-py-3 tw-text-sm tw-text-gray-700',
                          col.align === 'left' && 'tw-text-left',
                          col.align === 'right' && 'tw-text-right',
                          !col.align && 'tw-text-center',
                        )}
                      >
                        {cellContent}
                      </td>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Wrapper with column resize state ──────────────────────────────────────

export function Table<T extends Record<string, unknown>>(
  props: TableProps<T>,
): React.ReactElement {
  const initialWidths: Record<string, string> = {}
  for (const col of props.columns) {
    if (col.width) {
      initialWidths[col.key] = col.width
    }
  }

  const [columnWidths, getResizeHandlers] = useColumnResize(initialWidths)

  return (
    <TableInner
      {...props}
      columnWidths={columnWidths}
      getResizeHandlers={getResizeHandlers}
    />
  )
}
