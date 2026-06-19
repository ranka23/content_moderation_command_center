export const ACTION_LABELS = {
  approve: 'approved',
  unapprove: 'unapproved',
  spam: 'marked as spam',
  unspam: 'unmarked as spam',
  delete: 'deleted',
  trash: 'moved to trash',
  untrash: 'restored from trash',
  defer: 'deferred',
  flag: 'flagged',
  'deactivate-user': 'user deactivated',
  'activate-user': 'user activated',
  change_role: 'role changed',
}

export function normalizeAction(action) {
  if (!action) return 'Unknown action'
  const lower = action.toLowerCase().trim()
  return ACTION_LABELS[lower] || lower
}
