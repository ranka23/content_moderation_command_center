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
    <div className="cmcc-queue-table-wrapper">
      <table
        className={cn('cmcc-queue-table-inner', className)}
        style={{ tableLayout: 'auto', width: '100%' }}
      >
        <thead>
          <tr>
            {columns.map((col) => {
              const handlers = getResizeHandlers(col.key)
              const width = columnWidths[col.key] ?? col.width
              const isSorted = sortConfig?.field === col.key
              const sortDir = isSorted ? sortConfig?.direction : undefined

              const colStyle: React.CSSProperties = {}
              if (width) colStyle.width = width
              if (col.minWidth) colStyle.minWidth = col.minWidth

              return (
                <th
                  key={col.key}
                  className={`cmcc-th-${col.key} ${col.sortable ? 'cmcc-th-sortable' : ''}`}
                  style={
                    Object.keys(colStyle).length > 0 ? colStyle : undefined
                  }
                  onClick={() => {
                    if (col.sortable && onSort) {
                      onSort(col.key)
                    }
                  }}
                >
                  <div className="cmcc-th-content">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <span className="cmcc-sort-icons">
                        <span
                          className={
                            isSorted && sortDir === 'asc'
                              ? 'cmcc-sort-active'
                              : ''
                          }
                        >
                          ▲
                        </span>
                        <span
                          className={
                            isSorted && sortDir === 'desc'
                              ? 'cmcc-sort-active'
                              : ''
                          }
                        >
                          ▼
                        </span>
                      </span>
                    )}
                  </div>
                  {/* Resize handle */}
                  <div
                    className="cmcc-col-resize-handle"
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
              <td colSpan={columns.length} className="cmcc-empty-row">
                <div className="cmcc-empty-state">
                  <span className="cmcc-empty-icon">
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
                  </span>
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="cmcc-empty-row">
                <div className="cmcc-empty-state">
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const key = rowKey ? rowKey(row, idx) : idx
              return (
                <tr key={key} className="cmcc-table-row">
                  {columns.map((col) => {
                    const value = (row as Record<string, unknown>)[col.key]
                    const cellContent = col.cell
                      ? col.cell(row)
                      : String(value ?? '')
                    return (
                      <td
                        key={col.key}
                        style={{
                          textAlign:
                            col.align === 'right'
                              ? 'right'
                              : col.align === 'center'
                                ? 'center'
                                : 'left',
                        }}
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
