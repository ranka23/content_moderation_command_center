import React, { useEffect } from 'react'

export interface NotificationBadgeProps {
  count: number
  type: 'pending' | 'spam' | 'alert'
  onClick?: () => void
  size?: 'sm' | 'md'
  pulse?: boolean
}

const BADGE_KEYFRAMES_ID = 'cmcc-badge-pulse-keyframes'

function injectPulseKeyframes(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(BADGE_KEYFRAMES_ID)) return

  const style = document.createElement('style')
  style.id = BADGE_KEYFRAMES_ID
  style.textContent =
    '@keyframes cmcc-badge-pulse{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}'
  document.head.appendChild(style)
}

const TYPE_COLORS: Record<
  NotificationBadgeProps['type'],
  { background: string; text: string }
> = {
  pending: { background: '#eab308', text: '#1c1917' },
  spam: { background: '#dc2626', text: '#ffffff' },
  alert: { background: '#ea580c', text: '#ffffff' },
}

const SIZE_STYLES: Record<
  NonNullable<NotificationBadgeProps['size']>,
  React.CSSProperties
> = {
  sm: {
    minWidth: '18px',
    height: '18px',
    fontSize: '10px',
    padding: '0 4px',
  },
  md: {
    minWidth: '22px',
    height: '22px',
    fontSize: '12px',
    padding: '0 6px',
  },
}

function formatCount(count: number): string {
  if (count > 99) return '99+'
  if (count < 0) return '0'
  return String(count)
}

const TYPE_LABELS: Record<NotificationBadgeProps['type'], string> = {
  pending: 'Pending items',
  spam: 'Spam items',
  alert: 'Alerts',
}

export function NotificationBadge({
  count,
  type,
  onClick,
  size = 'md',
  pulse = false,
}: NotificationBadgeProps): React.ReactElement {
  useEffect(() => {
    if (pulse) {
      injectPulseKeyframes()
    }
  }, [pulse])

  const colors = TYPE_COLORS[type]
  const sizeStyle = SIZE_STYLES[size]
  const label = TYPE_LABELS[type]

  return (
    <span
      role="status"
      aria-label={`${label}: ${count}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '9999px',
        fontWeight: 700,
        lineHeight: 1,
        cursor: onClick ? 'pointer' : undefined,
        backgroundColor: colors.background,
        color: colors.text,
        animation: pulse
          ? 'cmcc-badge-pulse 1.5s ease-in-out infinite'
          : undefined,
        ...sizeStyle,
      }}
    >
      {formatCount(count)}
    </span>
  )
}

export default NotificationBadge
