import * as React from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react'

// ============================================
// TOAST TYPES
// ============================================
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

// ============================================
// TOAST PROVIDER
// ============================================
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    setToasts((prev) => [...prev, { id, type, message, duration }])

    // Auto-remove después de duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================
export function useToast() {
  const context = React.useContext(ToastContext)
  
  if (!context) {
    // Fallback si no hay provider (para compatibilidad)
    return {
      toasts: [],
      addToast: (type: ToastType, message: string) => {
        console.log(`[Toast ${type}]:`, message)
      },
      removeToast: () => {},
      success: (message: string) => console.log('[Toast success]:', message),
      error: (message: string) => console.error('[Toast error]:', message),
      warning: (message: string) => console.warn('[Toast warning]:', message),
      info: (message: string) => console.log('[Toast info]:', message),
    }
  }

  return {
    ...context,
    success: (message: string, duration?: number) => context.addToast('success', message, duration),
    error: (message: string, duration?: number) => context.addToast('error', message, duration ?? 6000),
    warning: (message: string, duration?: number) => context.addToast('warning', message, duration),
    info: (message: string, duration?: number) => context.addToast('info', message, duration),
  }
}

// ============================================
// TOAST CONTAINER
// ============================================
function ToastContainer({ 
  toasts, 
  onRemove 
}: { 
  toasts: Toast[]
  onRemove: (id: string) => void 
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

// ============================================
// TOAST ITEM
// ============================================
function ToastItem({ 
  toast, 
  onRemove 
}: { 
  toast: Toast
  onRemove: (id: string) => void 
}) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const colors = {
    success: 'bg-accent-success/10 border-accent-success/30 text-accent-success',
    error: 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger',
    warning: 'bg-accent-warning/10 border-accent-warning/30 text-accent-warning',
    info: 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary',
  }

  const Icon = icons[toast.type]

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'bg-bg-secondary backdrop-blur-sm',
        'animate-in slide-in-from-right-5 fade-in duration-300',
        colors[toast.type]
      )}
      role="alert"
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-1 rounded hover:bg-bg-tertiary transition-colors"
      >
        <X className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  )
}

// ============================================
// STANDALONE TOAST (sin context)
// ============================================
let toastContainer: HTMLDivElement | null = null
let toastRoot: any = null

export function toast(type: ToastType, message: string, duration = 4000) {
  // Crear container si no existe
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'toast-standalone'
    toastContainer.className = 'fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm'
    document.body.appendChild(toastContainer)
  }

  // Crear toast element
  const toastEl = document.createElement('div')
  toastEl.className = cn(
    'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
    'bg-[#1a1a2e] backdrop-blur-sm',
    'animate-in slide-in-from-right-5 fade-in duration-300',
    type === 'success' && 'border-green-500/30 text-green-400',
    type === 'error' && 'border-red-500/30 text-red-400',
    type === 'warning' && 'border-yellow-500/30 text-yellow-400',
    type === 'info' && 'border-blue-500/30 text-blue-400'
  )

  const iconSvg = {
    success: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
    error: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
    warning: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
    info: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  }

  toastEl.innerHTML = `
    ${iconSvg[type]}
    <p class="flex-1 text-sm text-gray-100">${message}</p>
  `

  toastContainer.appendChild(toastEl)

  // Auto-remove
  setTimeout(() => {
    toastEl.classList.add('opacity-0', 'translate-x-4')
    setTimeout(() => {
      toastEl.remove()
    }, 300)
  }, duration)
}

// Helpers
toast.success = (message: string, duration?: number) => toast('success', message, duration)
toast.error = (message: string, duration?: number) => toast('error', message, duration ?? 6000)
toast.warning = (message: string, duration?: number) => toast('warning', message, duration)
toast.info = (message: string, duration?: number) => toast('info', message, duration)
