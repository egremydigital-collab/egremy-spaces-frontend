import { create } from 'zustand'
import type { TaskDetailed } from '@/types'

// Detectar si es móvil al cargar
const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  
  // Task detail drawer
  selectedTask: TaskDetailed | null
  taskDrawerOpen: boolean
  
  // Modals
  createProjectModalOpen: boolean
  createTaskModalOpen: boolean
  approvalModalOpen: boolean
  approvalTaskId: string | null
  
  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  openTaskDrawer: (task: TaskDetailed) => void
  closeTaskDrawer: () => void
  updateSelectedTask: (task: TaskDetailed) => void
  
  openCreateProjectModal: () => void
  closeCreateProjectModal: () => void
  
  openCreateTaskModal: () => void
  closeCreateTaskModal: () => void
  
  openApprovalModal: (taskId: string) => void
  closeApprovalModal: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  // Initial state - sidebar cerrado en móvil, abierto en desktop
  sidebarOpen: !isMobile,
  sidebarCollapsed: false,
  selectedTask: null,
  taskDrawerOpen: false,
  createProjectModalOpen: false,
  createTaskModalOpen: false,
  approvalModalOpen: false,
  approvalTaskId: null,

  // Sidebar actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Task drawer actions
  openTaskDrawer: (task) => set({ selectedTask: task, taskDrawerOpen: true }),
  closeTaskDrawer: () => set({ selectedTask: null, taskDrawerOpen: false }),
  updateSelectedTask: (task) => set({ selectedTask: task }),

  // Modal actions
  openCreateProjectModal: () => set({ createProjectModalOpen: true }),
  closeCreateProjectModal: () => set({ createProjectModalOpen: false }),
  
  openCreateTaskModal: () => set({ createTaskModalOpen: true }),
  closeCreateTaskModal: () => set({ createTaskModalOpen: false }),
  
  openApprovalModal: (taskId) => set({ approvalModalOpen: true, approvalTaskId: taskId }),
  closeApprovalModal: () => set({ approvalModalOpen: false, approvalTaskId: null }),
}))