import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TaskStatus, StatusConfig } from '@/types'

// Merge Tailwind classes with clsx
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date for display
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

// Format relative time (ej: "hace 2 horas")
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays < 7) return `Hace ${diffDays}d`
  return formatDate(d)
}

// Task status configuration
export const STATUS_CONFIG: StatusConfig = {
  discovery: {
    label: 'Discovery',
    color: '#3B82F6',
    bgClass: 'bg-status-discovery/20',
    textClass: 'text-status-discovery',
  },
  design: {
    label: 'Diseño',
    color: '#A855F7',
    bgClass: 'bg-status-design/20',
    textClass: 'text-status-design',
  },
  build: {
    label: 'Build',
    color: '#F59E0B',
    bgClass: 'bg-status-build/20',
    textClass: 'text-status-build',
  },
  qa: {
    label: 'QA',
    color: '#22C55E',
    bgClass: 'bg-status-qa/20',
    textClass: 'text-status-qa',
  },
  deploy: {
    label: 'Deploy',
    color: '#6366F1',
    bgClass: 'bg-status-deploy/20',
    textClass: 'text-status-deploy',
  },
  live: {
    label: 'Live',
    color: '#10B981',
    bgClass: 'bg-status-live/20',
    textClass: 'text-status-live',
  },
  optimization: {
    label: 'Optimización',
    color: '#6B7280',
    bgClass: 'bg-status-optimization/20',
    textClass: 'text-status-optimization',
  },
  blocked: {
    label: 'Bloqueado',
    color: '#EF4444',
    bgClass: 'bg-status-blocked/20',
    textClass: 'text-status-blocked',
  },
  needs_client_approval: {
    label: 'Esperando Cliente',
    color: '#F59E0B',
    bgClass: 'bg-status-approval/20',
    textClass: 'text-status-approval',
  },
  bug: {
    label: 'Bug',
    color: '#EF4444',
    bgClass: 'bg-status-bug/20',
    textClass: 'text-status-bug',
  },
  hotfix: {
    label: 'Hotfix',
    color: '#DC2626',
    bgClass: 'bg-status-hotfix/20',
    textClass: 'text-status-hotfix',
  },
}

// Get status badge class
export function getStatusBadgeClass(status: TaskStatus): string {
  return `badge badge-${status}`
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Generate random color for avatar
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-accent-primary',
    'bg-status-design',
    'bg-status-build',
    'bg-status-qa',
    'bg-status-live',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

// Kanban columns order
export const KANBAN_COLUMNS: TaskStatus[] = [
  'discovery',
  'design',
  'build',
  'qa',
  'deploy',
  'live',
  'optimization',
]

// Special status columns (shown separately or as flags)
export const SPECIAL_STATUSES: TaskStatus[] = [
  'blocked',
  'needs_client_approval',
  'bug',
  'hotfix',
]

// Check if status is a "work in progress" status
export function isActiveStatus(status: TaskStatus): boolean {
  return ['discovery', 'design', 'build', 'qa', 'deploy'].includes(status)
}

// Check if status is a "blocking" status
export function isBlockingStatus(status: TaskStatus): boolean {
  return ['blocked', 'needs_client_approval', 'bug', 'hotfix'].includes(status)
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Sleep utility for async operations
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}


// Labels amigables para los estados
export const STATUS_LABELS: Record<string, string> = {
  discovery: '🔍 Discovery',
  design: '🎨 Diseño',
  build: '🔨 Build',
  qa: '🧪 QA',
  deploy: '🚀 Deploy',
  live: '✅ Live',
  optimization: '📈 Optimización',
  blocked: '🚫 Bloqueada',
  needs_client_approval: '⏳ Aprobación Cliente',
  bug: '🐛 Bug',
  hotfix: '🔥 Hotfix'
}