import React from 'react'
import {
  Shield,
  Moon,
  Sun,
  Heart,
  ListChecks,
  BarChart3,
  History,
  FileText,
  Settings,
  Eye,
  CheckCircle,
  XCircle,
  Flag,
  Clock,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  Inbox,
  AlertTriangle,
  MessageSquare,
  Edit3,
  Zap,
  Users,
  User,
  Cpu,
  Bot,
  Keyboard,
  X,
  Info,
  Calendar,
  CalendarRange,
  Globe,
  Ban,
  ClipboardList,
  ShoppingCart,
  Image,
  Database,
  type LucideIcon,
} from 'lucide-react'

// ─── Icon mapping: semantic name → lucide-react component ───────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, any> = {
  // Navigation / Tabs
  shield: Shield,
  queue: ListChecks,
  'activity-log': History,
  analytics: BarChart3,
  reports: FileText,
  settings: Settings,
  donate: Heart,

  // Theme
  moon: Moon,
  sun: Sun,

  // Actions
  approve: CheckCircle,
  reject: XCircle,
  spam: Flag,
  defer: Clock,
  'view-details': Eye,
  refresh: RefreshCw,
  download: Download,
  upload: Upload,
  search: Search,
  filter: Filter,
  save: Settings,

  // Status / Feedback
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  close: X,

  // Content Types
  comment: MessageSquare,
  post: Edit3,
  page: FileText,
  media: ImageIcon,
  user: User,
  form_entry: ClipboardList,
  woocommerce_review: Star,

  // Quick Filter Presets
  'last-hour': Clock,
  today: Calendar,
  'this-week': CalendarRange,
  pending: Clock,
  'high-spam': Ban,
  flagged: Flag,

  // Settings sections
  general: Settings,
  moderation: Shield,
  ai_moderation: Cpu,
  backup_restore: Download,
  notifications: Bell,
  collaboration: Users,
  firewall: Shield,
  reporting: BarChart3,
  advanced: Settings,
  appearance: Palette,
  security: Lock,
  performance: Zap,
  integration: Globe,
  spam_firewall: Shield,
  integrations: Globe,
  auto_moderation: Cpu,
  moderator_management: Users,
  data_retention: Archive,
  api_webhooks: Globe,

  // Collaboration
  activity: History,
  note: MessageSquare,
  assignment: User,
  escalation: AlertTriangle,
  team_change: Users,

  // Misc
  empty: Inbox,
  keyboard: Keyboard,
  bot: Bot,
  ai: Bot,
  globe: Globe,
  calendar: Calendar,
  plus: Plus,

  // Platform icons
  shopify: ShoppingCart,
  storyblok: Image,
  strapi: Database,
  wix: Globe,
  wordpress: Globe,
}

// Fallback icon
const FallbackIcon: LucideIcon = Shield

// Simple SVG icon for media (not in lucide-react)
function ImageIcon({
  size = 16,
  className = '',
  ...props
}: {
  size?: number
  className?: string
}): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21,15 16,10 5,21" />
    </svg>
  )
}

function Star({
  size = 16,
  className = '',
  ...props
}: {
  size?: number
  className?: string
}): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )
}

function Bell({
  size = 16,
  className = '',
  ...props
}: {
  size?: number
  className?: string
}): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 4 11 4 11H2s4-4 4-11" />
      <path d="M9 21h6" />
    </svg>
  )
}

function Palette({
  size = 16,
  className = '',
  ...props
}: {
  size?: number
  className?: string
}): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="13.5" cy="6.5" r="0.5" />
      <circle cx="17.5" cy="10.5" r="0.5" />
      <circle cx="8.5" cy="7.5" r="0.5" />
      <circle cx="6.5" cy="12.5" r="0.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.5-4.5-10-10-10z" />
    </svg>
  )
}

function Lock({
  size = 16,
  className = '',
  ...props
}: {
  size?: number
  className?: string
}): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function Archive({
  size = 16,
  className = '',
  ...props
}: {
  size?: number
  className?: string
}): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  )
}

function Plus({
  size = 16,
  className = '',
  ...props
}: {
  size?: number
  className?: string
}): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ─── Icon Component ────────────────────────────────────────────────────

export interface IconProps {
  name: string
  size?: number
  className?: string
  color?: string
  'aria-label'?: string
}

/**
 * CMCC Icon component — renders a lucide-react SVG icon by semantic name.
 *
 * @example
 * <Icon name="queue" size={20} />
 * <Icon name="approve" className="tw-text-green-600" />
 */
export function Icon({
  name,
  size = 16,
  className = '',
  color,
  'aria-label': ariaLabel,
}: IconProps): React.ReactElement {
  const LucideIconComponent = iconMap[name] || FallbackIcon

  // For custom SVG icons (not from lucide-react), use a different approach
  if (name === 'media') {
    return (
      <ImageIcon size={size} className={className} aria-label={ariaLabel} />
    )
  }

  return (
    <LucideIconComponent
      size={size}
      className={className}
      color={color}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    />
  )
}

export default Icon
