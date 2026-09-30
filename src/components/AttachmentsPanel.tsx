/**
 * AttachmentsPanel — reusable component for uploading, listing, opening, and deleting
 * file attachments linked to any record (activity, visit, audit, issue, etc.)
 *
 * Props:
 *   relatedType  — e.g. 'daily_activity', 'visit', 'issue'
 *   relatedId    — the DB ID of the parent record (null = not yet saved, disables upload)
 *   compact      — shows a minimal "N files" badge row instead of full list
 */
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Paperclip, Upload, X, ExternalLink, FileText, Image, FileSpreadsheet } from 'lucide-react'
import { cn } from '../lib/utils'

interface Attachment {
  id: number
  file_name: string
  file_path: string
  created_at: string
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png','jpg','jpeg','gif','bmp','webp'].includes(ext)) return <Image className="w-4 h-4 text-blue-400" />
  if (['xls','xlsx','csv'].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-green-500" />
  if (['pdf'].includes(ext)) return <FileText className="w-4 h-4 text-red-500" />
  return <FileText className="w-4 h-4 text-slate-400" />
}

function formatSize(path: string) {
  // Can't get size from path in renderer; just show extension
  return path.split('.').pop()?.toUpperCase() ?? 'FILE'
}

interface Props {
  relatedType: string
  relatedId: number | null
  compact?: boolean
  className?: string
}

export default function AttachmentsPanel({ relatedType, relatedId, compact = false, className }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!relatedId) return
    setLoading(true)
    const r = await window.api.attachments.getByRecord(relatedType, relatedId)
    if (r.success) setAttachments(r.data as Attachment[])
    setLoading(false)
  }, [relatedType, relatedId])

  useEffect(() => { load() }, [load])

  async function handleUpload() {
    if (!relatedId) { toast.error('Save the activity first, then attach files'); return }
    setUploading(true)
    const r = await window.api.attachments.upload(relatedType, relatedId)
    if (r.success) {
      const count = (r.data as unknown[]).length
      toast.success(`${count} file${count !== 1 ? 's' : ''} attached ✓`)
      load()
    } else if (r.error !== 'Cancelled') {
      toast.error(r.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  async function handleOpen(id: number) {
    const r = await window.api.attachments.open(id)
    if (!r.success) toast.error(r.error ?? 'Cannot open file')
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Remove attachment "${name}"?`)) return
    const r = await window.api.attachments.delete(id)
    if (r.success) { toast.success('Attachment removed'); load() }
    else toast.error(r.error ?? 'Failed')
  }

  // ─── Compact mode: small badge + click to upload ─────────────
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <button
          onClick={handleUpload}
          disabled={uploading || !relatedId}
          title="Attach files"
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition disabled:opacity-40"
        >
          <Paperclip className="w-3.5 h-3.5" />
          {attachments.length > 0 ? (
            <span className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-medium">
              {attachments.length} file{attachments.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span>Attach</span>
          )}
        </button>
        {attachments.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {attachments.map(a => (
              <button
                key={a.id}
                onClick={() => handleOpen(a.id)}
                title={a.file_name}
                className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-1.5 py-0.5 hover:bg-blue-50 hover:text-blue-700 transition max-w-[120px] truncate"
              >
                {fileIcon(a.file_name)}
                <span className="truncate">{a.file_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Full mode ─────────────────────────────────────────────────
  return (
    <div className={cn('rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Attachments
          </span>
          {attachments.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !relatedId}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading…' : 'Add Files'}
        </button>
      </div>

      {!relatedId && (
        <p className="text-xs text-slate-400 italic text-center py-2">
          Save the activity first to attach files
        </p>
      )}

      {loading && relatedId && (
        <div className="text-xs text-slate-400 text-center py-2">Loading…</div>
      )}

      {!loading && relatedId && attachments.length === 0 && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex flex-col items-center gap-2 py-4 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition group"
        >
          <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="text-xs">Click to attach files — PDF, Excel, Word, Images, etc.</span>
          <span className="text-[10px] text-slate-300">Multiple files supported</span>
        </button>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map(att => (
            <li key={att.id} className="flex items-center gap-2 bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-600 group">
              {fileIcon(att.file_name)}
              <button
                type="button"
                onClick={() => handleOpen(att.id)}
                className="flex-1 min-w-0 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 truncate"
                title={att.file_name}
              >
                {att.file_name}
              </button>
              <span className="text-[10px] text-slate-400 shrink-0">{formatSize(att.file_path)}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpen(att.id)}
                  title="Open file"
                  className="p-1 text-slate-400 hover:text-blue-600 rounded"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(att.id, att.file_name)}
                  title="Remove attachment"
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
