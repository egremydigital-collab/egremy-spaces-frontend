import { create } from 'zustand'

interface TaskEventsStore {
  // Contador que se incrementa cada vez que hay un cambio
  refreshTrigger: number
  
  // Función para disparar un refresh
  triggerRefresh: () => void
}

export const useTaskEventsStore = create<TaskEventsStore>((set) => ({
  refreshTrigger: 0,
  
  triggerRefresh: () => {
    console.log('🔄 Task refresh triggered')
    set((state) => ({ refreshTrigger: state.refreshTrigger + 1 }))
  },
}))
