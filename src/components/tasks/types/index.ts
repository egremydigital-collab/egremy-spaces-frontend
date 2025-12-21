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

export interface Project {
  id: string
  organization_id: string
  team_id: string | null
  name: string
  description: string | null
  status: 'active' | 'archived' | 'completed'
  client_name: string | null
  client_phone: string | null
  client_email: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface TaskDetailed {
  id: string
  project_id: string
  organization_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  position: number
  assignee_id: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  assignee?: {
    full_name: string
    avatar_url: string | null
    team: string | null
  }
  project?: {
    name: string
    slug: string | null
    client_name: string | null
  }
  comment_count?: number
  complexity?: 'low' | 'medium' | 'high'
}