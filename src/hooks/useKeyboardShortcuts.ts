import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui.store'

export function useKeyboardShortcuts() {
  const { 
    openCreateTaskModal, 
    closeCreateTaskModal,
    closeTaskDrawer,
    createTaskModalOpen,
    taskDrawerOpen 
  } = useUIStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si está escribiendo en un input/textarea
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable

      // Esc - Cerrar modal/drawer
      if (e.key === 'Escape') {
        if (createTaskModalOpen) {
          closeCreateTaskModal()
          return
        }
        if (taskDrawerOpen) {
          closeTaskDrawer()
          return
        }
      }

      // No ejecutar atajos si está escribiendo
      if (isTyping) return

      // N - Nueva tarea
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        openCreateTaskModal()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openCreateTaskModal, closeCreateTaskModal, closeTaskDrawer, createTaskModalOpen, taskDrawerOpen])
}