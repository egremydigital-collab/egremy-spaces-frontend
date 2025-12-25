import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { CreateProjectModal } from '@/components/modals/CreateProjectModal'
import { TaskCreateModal } from '@/components/tasks/TaskCreateModal'
import { TaskDrawer } from '@/components/tasks/TaskDrawer'

export function Layout() {
  return (
    <div className="flex h-screen bg-bg-primary">
      {/* Sidebar - Fixed en móvil, static en desktop */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Header */}
        <Header />

        {/* Page content - padding responsive */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <CreateProjectModal />
      <TaskCreateModal />
      
      {/* Task Drawer - Global */}
      <TaskDrawer />
    </div>
  )
}
