/**
 * Normalize a raw API queue item to core QueueItem shape.
 */
export function normalizeQueueItemForCore(item) {
  return {
    id: item.id,
    contentType: item.contentType || item.content_type || 'unknown',
    originalId: item.item_id || item.originalId || item.id,
    status: item.status || 'pending',
    spamScore: typeof item.spamScore === 'number' ? item.spamScore : parseFloat(item.spam_score) || 0,
    authorId: item.author_id || item.authorId || item.author || '',
    dateGmt: item.dateGmt || item.date_gmt || item.created_at || new Date().toISOString(),
    title: item.title || '',
    excerpt: item.excerpt || '',
  }
}

/**
 * Normalize a raw API event to core ModerationEvent shape.
 */
export function normalizeEventForCore(event) {
  return {
    id: event.id,
    timestamp: event.timestamp || event.created_at || event.date || new Date().toISOString(),
    contentType: event.contentType || event.content_type || 'unknown',
    action: event.action || event.event_action || 'unknown',
    itemId: event.itemId || event.item_id || event.contentId || '',
    userId: event.userId || event.user_id || event.author_id || '',
    blogId: event.blogId || event.blog_id,
    moderatorId: event.moderatorId || event.moderator_id || event.performedBy || '',
  }
}

/**
 * Normalize a raw activity log entry to core ActivityLogEntry shape.
 */
export function normalizeLogEntryForCore(entry) {
  return {
    id: entry.id,
    timestamp: entry.timestamp || entry.created_at || new Date().toISOString(),
    moderatorId: entry.moderatorId || entry.moderator_id || entry.performedBy || '',
    moderatorName: entry.moderatorName || entry.moderator_name || '',
    action: entry.action || 'approved',
    contentType: entry.contentType || entry.content_type || 'unknown',
    itemId: entry.itemId || entry.item_id || entry.contentId || '',
    itemTitle: entry.itemTitle || entry.item_title || '',
    previousStatus: entry.previousStatus || entry.previous_status,
    newStatus: entry.newStatus || entry.new_status,
    notes: entry.notes,
  }
}
