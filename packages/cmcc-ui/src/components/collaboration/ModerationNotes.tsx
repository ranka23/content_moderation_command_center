import React, { useState } from 'react'
import { cn } from '../../lib/cn'

// ─── Types ───────────────────────────────────────────────────────────────

export interface Note {
  id: string
  itemId: string
  authorId: string | number
  authorName: string
  content: string
  createdAt: string
  updatedAt?: string
  isInternal: boolean
  type: 'general' | 'question' | 'instruction' | 'resolution'
}

export interface ModerationNotesProps {
  /** List of notes for the current item */
  notes: Note[]
  /** Called when a new note is submitted */
  onAddNote: (content: string, isInternal: boolean, type: Note['type']) => void
  /** Whether the current user can add notes */
  canAdd?: boolean
  /** Current user's display name */
  currentUserName?: string
  /** Loading state */
  isLoading?: boolean
  className?: string
}

const NOTE_TYPE_STYLES: Record<Note['type'], string> = {
  general: 'tw-border-l-blue-400',
  question: 'tw-border-l-amber-400',
  instruction: 'tw-border-l-purple-400',
  resolution: 'tw-border-l-green-400',
}

const NOTE_TYPE_LABELS: Record<Note['type'], string> = {
  general: 'General',
  question: 'Question',
  instruction: 'Instruction',
  resolution: 'Resolution',
}

/**
 * ModerationNotes component for communicating between moderators
 * on specific queue items. Supports different note types and internal
 * (moderator-only) notes.
 */
export function ModerationNotes({
  notes,
  onAddNote,
  canAdd = true,
  currentUserName: _currentUserName = 'You',
  isLoading = false,
  className,
}: ModerationNotesProps): React.ReactElement {
  const [newNote, setNewNote] = useState('')
  const [isInternal, setIsInternal] = useState(true)
  const [noteType, setNoteType] = useState<Note['type']>('general')

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!newNote.trim()) return
    onAddNote(newNote.trim(), isInternal, noteType)
    setNewNote('')
  }

  return (
    <div className={cn('tw-space-y-4', className)}>
      <h4 className="tw-text-sm tw-font-semibold tw-text-gray-700">
        📝 Moderation Notes
      </h4>

      {/* Notes list */}
      <div className="tw-space-y-3 tw-max-h-80 tw-overflow-y-auto">
        {isLoading ? (
          <div className="tw-text-sm tw-text-gray-400 tw-text-center tw-py-4">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="tw-text-sm tw-text-gray-400 tw-text-center tw-py-4">
            No notes yet. Add the first note to communicate with other
            moderators.
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                'tw-pl-3 tw-border-l-2 tw-py-1',
                NOTE_TYPE_STYLES[note.type],
              )}
            >
              <div className="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
                <span className="tw-text-xs tw-font-medium tw-text-gray-800">
                  {note.authorName}
                </span>
                <span className="tw-text-[10px] tw-text-gray-400">
                  {new Date(note.createdAt).toLocaleString()}
                </span>
                {note.isInternal && (
                  <span className="tw-text-[10px] tw-bg-gray-100 tw-text-gray-500 tw-px-1.5 tw-py-0.5 tw-rounded">
                    Internal
                  </span>
                )}
                <span className="tw-text-[10px] tw-bg-gray-50 tw-text-gray-400 tw-px-1.5 tw-py-0.5 tw-rounded">
                  {NOTE_TYPE_LABELS[note.type]}
                </span>
              </div>
              <p className="tw-text-sm tw-text-gray-600 tw-mt-1 tw-leading-relaxed">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add note form */}
      {canAdd && (
        <form
          onSubmit={handleSubmit}
          className="tw-space-y-2 tw-pt-2 tw-border-t tw-border-gray-100"
        >
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note for other moderators..."
            rows={3}
            className="tw-w-full tw-text-sm tw-border tw-border-gray-200 tw-rounded-md tw-p-2 tw-resize-none focus:tw-outline-none focus:tw-ring-1 focus:tw-ring-primary-500 focus:tw-border-primary-500"
          />
          <div className="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-flex-wrap">
            <div className="tw-flex tw-items-center tw-gap-3">
              <label className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-gray-500 tw-cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="tw-rounded"
                />
                Internal note
              </label>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as Note['type'])}
                className="tw-text-xs tw-border tw-border-gray-200 tw-rounded tw-px-2 tw-py-1 tw-text-gray-500"
              >
                <option value="general">General</option>
                <option value="question">Question</option>
                <option value="instruction">Instruction</option>
                <option value="resolution">Resolution</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={!newNote.trim()}
              className="tw-text-xs tw-bg-primary-500 tw-text-white tw-rounded-md tw-px-3 tw-py-1.5 hover:tw-bg-primary-600 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-transition-colors"
            >
              Add Note
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default ModerationNotes
