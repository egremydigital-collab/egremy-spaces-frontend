// ============================================================================
// EGREMY SPACES - TIPOS COMPARTIDOS
// ============================================================================

// Enums que coinciden con el schema de Supabase
export type TaskStatus =
  | 'discovery'
  | 'design'
  | 'build'
  | 'qa'
  | 'deploy'
  | 'live'
  | 'optimization'
  | 'blocked'
  | 'needs_client_approval'
  | 'bug'
  | 'hotfix'

export type UserRole = 'admin' | 'member'

export type TeamType = 'egremy_digital' | 'orangutan_n8n' | 'client'

export type ApprovalDecision = 'pending' | 'approved' | 'changes_requested'

export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'approval_requested'
  | 'approval_completed'
  | 'comment_mention'
  | 'handoff_received'
  | 'deadline_approaching'

// ============================================================================
// ENTITIES
// ============================================================================

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  team: TeamType
  phone: string | null
  telegram_chat_id: string | null
  is_active: boolean
  preferences: {
    notifications: {
      email: boolean
      push: boolean
    }
  }
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  organization_id: string
  name: string
  type: TeamType
  description: string | null
  notification_channel: string | null
  channel_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  organization_id: string
  team_id: string | null
  name: string
  description: string | null
  slug: string
  notion_url: string | null
  google_drive_url: string | null
  client_name: string | null
  client_contact_phone: string | null
  client_contact_email: string | null
  is_archived: boolean
  color: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  organization_id: string
  project_id: string
  parent_task_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  previous_status: TaskStatus | null
  position: number
  assignee_id: string | null
  team_id: string | null
  due_date: string | null
  started_at: string | null
  completed_at: string | null
  delivery_type: string | null
  affected_systems: string[] | null
  complexity: 'low' | 'medium' | 'high' | null
  estimated_hours: number | null
  actual_hours: number | null
  notion_page_url: string | null
  google_doc_url: string | null
  n8n_workflow_id: string | null
  blocked_reason: string | null
  blocked_by_task_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  priority: 'low' | 'medium' | 'high' | 'urgent' | null
}

export interface TaskDetailed extends Task {
  project?: Pick<Project, 'name' | 'slug' | 'client_name'>
  assignee?: Pick<Profile, 'full_name' | 'avatar_url' | 'team'>
  team?: Pick<Team, 'name'>
  subtask_count?: number
  completed_subtask_count?: number
  comment_count?: number
  latest_approval_status?: ApprovalDecision | null
}

export interface Approval {
  id: string
  organization_id: string
  task_id: string
  decision: ApprovalDecision
  feedback: string | null
  changes_requested: string | null
  decided_at: string | null
  client_ip: string | null
  client_user_agent: string | null
  requested_by: string
  requested_at: string
  internal_note: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  organization_id: string
  task_id: string
  content: string
  author_id: string | null
  is_client_comment: boolean
  parent_comment_id: string | null
  mentions: string[]
  is_edited: boolean
  edited_at: string | null
  created_at: string
  updated_at: string
  author?: Pick<Profile, 'full_name' | 'avatar_url'>
}

export interface Notification {
  id: string
  organization_id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  task_id: string | null
  project_id: string | null
  triggered_by: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApprovalDetailsResponse {
  valid: boolean
  error?: string
  task?: {
    id: string
    title: string
    description: string | null
    status: TaskStatus
    project_name: string
    client_name: string | null
    assignee_name: string | null
    internal_note: string | null
  }
  expires_at?: string
}

export interface CreateApprovalLinkResponse {
  success: boolean
  approval_url?: string
  approval_id?: string
  expires_at?: string
  error?: string
}

export interface SubmitApprovalResponse {
  success: boolean
  decision?: ApprovalDecision
  message?: string
  error?: string
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export interface KanbanColumn {
  id: TaskStatus
  title: string
  color: string
  tasks: TaskDetailed[]
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type StatusConfig = {
  [K in TaskStatus]: {
    label: string
    color: string
    bgClass: string
    textClass: string
  }
}
