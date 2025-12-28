import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { Button, Spinner } from '@/components/ui'
import { cn, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Paperclip,
  Upload,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Trash2,
  Download,
  X,
} from 'lucide-react'

// ============================================
// Types
// ============================================
interface Attachment {
  id: string
  task_id: string
  organization_id: string
  uploaded_by: string
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  created_at: string
  uploader?: {
    full_name: string
    avatar_url: string | null
  }
}

interface TaskAttachmentsProps {
  taskId: string
  organizationId: string
}

// ============================================
// Helper Functions
// ============================================
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return FileImage
  if (fileType.startsWith('video/')) return FileVideo
  if (fileType.startsWith('audio/')) return FileAudio
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return FileArchive
  return File
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// ============================================
// Component
// ============================================
export function TaskAttachments({ taskId, organizationId }: TaskAttachmentsProps) {
  const { profile } = useAuthStore()
  const [attachments, setAttachments] = React.useState<Attachment[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ============================================
  // Load Attachments
  // ============================================
  const loadAttachments = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select(`
          *,
          uploader:profiles!attachments_uploaded_by_fkey(full_name, avatar_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAttachments(data || [])
    } catch (err) {
      console.error('Error loading attachments:', err)
      toast.error('Error al cargar archivos')
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  React.useEffect(() => {
    loadAttachments()
  }, [loadAttachments])

  // ============================================
  // Upload File
  // ============================================
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('El archivo es muy grande. Máximo 10MB.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      // Upload to Supabase Storage
      setUploadProgress(30)
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      setUploadProgress(70)

      // Save record to database
      const { data: attachment, error: dbError } = await supabase
        .from('attachments')
        .insert({
          task_id: taskId,
          organization_id: organizationId,
          uploaded_by: profile.id,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          storage_path: fileName,
        })
        .select(`
          *,
          uploader:profiles!attachments_uploaded_by_fkey(full_name, avatar_url)
        `)
        .single()

      if (dbError) throw dbError

      setUploadProgress(100)
      setAttachments((prev) => [attachment, ...prev])
      toast.success('Archivo subido correctamente')

    } catch (err: any) {
      console.error('Error uploading file:', err)
      toast.error(err.message || 'Error al subir archivo')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // ============================================
  // Download File
  // ============================================
  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(attachment.storage_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Error downloading file:', err)
      toast.error('Error al descargar archivo')
    }
  }

  // ============================================
  // Delete File
  // ============================================
  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`¿Eliminar "${attachment.file_name}"?`)) return

    setDeletingId(attachment.id)

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.storage_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Continue to delete DB record anyway
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id)

      if (dbError) throw dbError

      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
      toast.success('Archivo eliminado')

    } catch (err) {
      console.error('Error deleting file:', err)
      toast.error('Error al eliminar archivo')
    } finally {
      setDeletingId(null)
    }
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="px-4 md:px-6 py-4 border-b border-bg-tertiary">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Archivos adjuntos ({attachments.length})
        </h3>
        
        {/* Upload Button */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Spinner size="sm" className="mr-1" />
                {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-1" />
                Subir
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="mb-3">
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : attachments.length === 0 ? (
        /* Empty State */
        <div className="text-center py-6">
          <Paperclip className="w-8 h-8 text-text-secondary/30 mx-auto mb-2" />
          <p className="text-sm text-text-secondary/50">
            No hay archivos adjuntos
          </p>
          <p className="text-xs text-text-secondary/30 mt-1">
            Máximo 10MB por archivo
          </p>
        </div>
      ) : (
        /* Attachments List */
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type)
            const isDeleting = deletingId === attachment.id
            const canDelete = attachment.uploaded_by === profile?.id

            return (
              <div
                key={attachment.id}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg bg-bg-secondary/50 border border-bg-tertiary',
                  'hover:border-bg-tertiary/80 transition-colors group'
                )}
              >
                {/* File Icon */}
                <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0">
                  <FileIcon className="w-5 h-5 text-text-secondary" />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate" title={attachment.file_name}>
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatFileSize(attachment.file_size)} • {formatRelativeTime(attachment.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-accent-primary transition-colors"
                    title="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(attachment)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-accent-danger transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      {isDeleting ? (
                        <Spinner size="sm" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
