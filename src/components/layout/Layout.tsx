import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { CreateProjectModal } from '@/components/modals/CreateProjectModal'
import { TaskCreateModal } from '@/components/tasks/TaskCreateModal'
import { TaskDrawer } from '@/components/tasks/TaskDrawer'

export function Layout() {
  return (
    <div className="flex h-screen bg-bg-primary">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
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