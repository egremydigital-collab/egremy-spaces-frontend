import * as React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Layout, AuthGuard, GuestGuard } from '@/components/layout'
import { PageLoader } from '@/components/ui'
import {
  LoginPage,
  DashboardPage,
  ProjectsPage,
  ProjectDetailPage,
  InboxPage,
  MyTasksPage,
  ApprovalPage,
} from '@/pages'

export default function App() {
  const { initialize, isInitialized } = useAuthStore()

  // Initialize auth on app load
  React.useEffect(() => {
    initialize()
  }, [initialize])

  // Show loader while initializing
  if (!isInitialized) {
    return <PageLoader />
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        }
      />
      
      {/* Public approval page (zero-auth) */}
      <Route path="/approval/:token" element={<ApprovalPage />} />

      {/* Protected app routes */}
      <Route
        path="/app"
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="my-tasks" element={<MyTasksPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
      </Route>

      {/* Catch all - redirect to app */}
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
