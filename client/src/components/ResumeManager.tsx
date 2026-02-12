import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import type { Resume } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  FileText, Upload, Star, Trash2, Download, Pencil, Plus,
  GitBranch, Clock, FileIcon, X, Check, MoreVertical
} from 'lucide-react'
import { format } from 'date-fns'

export default function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadDialog, setUploadDialog] = useState<{ open: boolean; parentId?: string }>({ open: false })
  const [editDialog, setEditDialog] = useState<{ open: boolean; resume: Resume | null }>({ open: false, resume: null })
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editLabel, setEditLabel] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    loadResumes()
  }, [])

  const loadResumes = async () => {
    try {
      const data = await api.getResumes()
      setResumes(data)
    } catch (err) {
      toast.error('Failed to load resumes')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadLabel.trim()) {
      toast.error('Please select a file and provide a label')
      return
    }
    setUploading(true)
    try {
      const tags = uploadTags.split(',').map(t => t.trim()).filter(Boolean)
      await api.uploadResume(
        selectedFile,
        uploadLabel.trim(),
        uploadDialog.parentId,
        tags,
        uploadNotes.trim() || undefined
      )
      toast.success('Resume uploaded successfully')
      setUploadDialog({ open: false })
      setSelectedFile(null)
      setUploadLabel('')
      setUploadTags('')
      setUploadNotes('')
      loadResumes()
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload resume')
    } finally {
      setUploading(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await api.setDefaultResume(id)
      toast.success('Default resume updated')
      loadResumes()
    } catch (err) {
      toast.error('Failed to set default')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resume? This cannot be undone.')) return
    try {
      await api.deleteResume(id)
      toast.success('Resume deleted')
      setResumes(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      toast.error('Failed to delete resume')
    }
  }

  const handleDownload = async (resume: Resume) => {
    try {
      const url = await api.getResumeSignedUrl(resume.storage_path)
      const a = document.createElement('a')
      a.href = url
      a.download = resume.file_name
      a.target = '_blank'
      a.click()
    } catch (err) {
      toast.error('Failed to download resume')
    }
  }

  const handleEdit = async () => {
    if (!editDialog.resume || !editLabel.trim()) return
    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
      await api.updateResume(editDialog.resume.id, {
        label: editLabel.trim(),
        tags,
        notes: editNotes.trim() || undefined,
      })
      toast.success('Resume updated')
      setEditDialog({ open: false, resume: null })
      loadResumes()
    } catch (err) {
      toast.error('Failed to update resume')
    }
  }

  const openEditDialog = (resume: Resume) => {
    setEditLabel(resume.label)
    setEditTags((resume.tags || []).join(', '))
    setEditNotes(resume.notes || '')
    setEditDialog({ open: true, resume })
  }

  // Group resumes by family (parent_id lineage)
  const getRootResumes = () => resumes.filter(r => !r.parent_id)
  const getVersions = (parentId: string) => resumes.filter(r => r.parent_id === parentId).sort((a, b) => (b.version || 0) - (a.version || 0))

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resumes</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {resumes.length} resume{resumes.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <Button onClick={() => setUploadDialog({ open: true })} className="gap-1.5">
          <Upload className="h-4 w-4" /> Upload Resume
        </Button>
      </div>

      {/* Empty state */}
      {resumes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 text-[hsl(var(--muted-foreground))] mb-4" />
          <h3 className="text-lg font-semibold mb-2">No resumes yet</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-md mb-4">
            Upload your first resume to start tracking which version you send with each application.
          </p>
          <Button onClick={() => setUploadDialog({ open: true })} className="gap-1.5">
            <Upload className="h-4 w-4" /> Upload Your First Resume
          </Button>
        </div>
      )}

      {/* Resume List - grouped by family */}
      {getRootResumes().map(resume => {
        const versions = getVersions(resume.id)
        return (
          <Card key={resume.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    resume.is_default ? "bg-[#7CB518]/10" : "bg-[hsl(var(--muted))]"
                  )}>
                    <FileIcon className={cn("h-5 w-5", resume.is_default ? "text-[#7CB518]" : "text-[hsl(var(--muted-foreground))]")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{resume.label}</h3>
                      {resume.is_default && (
                        <Badge className="bg-[#7CB518]/10 text-[#7CB518] border-[#7CB518]/30 text-[10px] px-1.5">
                          <Star className="h-3 w-3 mr-0.5 fill-current" /> Default
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">v{resume.version}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                      <span>{resume.file_name}</span>
                      <span>{formatFileSize(resume.file_size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {resume.created_at ? format(new Date(resume.created_at), 'MMM d, yyyy') : 'Unknown'}
                      </span>
                      {(resume.times_used || 0) > 0 && (
                        <span>Used {resume.times_used} time{resume.times_used !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {/* Tags */}
                    {resume.tags && resume.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {resume.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                        ))}
                      </div>
                    )}
                    {resume.notes && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 line-clamp-2">{resume.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!resume.is_default && (
                    <button
                      onClick={() => handleSetDefault(resume.id)}
                      className="p-1.5 hover:bg-[hsl(var(--accent))] rounded text-[hsl(var(--muted-foreground))] hover:text-[#7CB518]"
                      title="Set as default"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(resume)}
                    className="p-1.5 hover:bg-[hsl(var(--accent))] rounded text-[hsl(var(--muted-foreground))]"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openEditDialog(resume)}
                    className="p-1.5 hover:bg-[hsl(var(--accent))] rounded text-[hsl(var(--muted-foreground))]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setUploadDialog({ open: true, parentId: resume.id })}
                    className="p-1.5 hover:bg-[hsl(var(--accent))] rounded text-[hsl(var(--muted-foreground))]"
                    title="Upload new version"
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Versions */}
              {versions.length > 0 && (
                <div className="mt-3 ml-10 border-l-2 border-[hsl(var(--border))] pl-4 space-y-2">
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-medium">
                    Previous versions
                  </p>
                  {versions.map(v => (
                    <div key={v.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-[hsl(var(--muted))]/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                        <span className="text-sm truncate">{v.label}</span>
                        <Badge variant="secondary" className="text-[10px]">v{v.version}</Badge>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatFileSize(v.file_size)}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleDownload(v)} className="p-1 hover:bg-[hsl(var(--accent))] rounded text-[hsl(var(--muted-foreground))]">
                          <Download className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleDelete(v.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Orphan versions (whose parent was deleted) */}
      {resumes.filter(r => r.parent_id && !resumes.find(p => p.id === r.parent_id)).map(resume => (
        <Card key={resume.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-[hsl(var(--muted))]">
                  <FileIcon className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{resume.label}</h3>
                    <Badge variant="secondary" className="text-[10px]">v{resume.version}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                    <span>{resume.file_name}</span>
                    <span>{formatFileSize(resume.file_size)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleDownload(resume)} className="p-1.5 hover:bg-[hsl(var(--accent))] rounded text-[hsl(var(--muted-foreground))]">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(resume.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Upload Dialog */}
      <Dialog open={uploadDialog.open} onOpenChange={() => { setUploadDialog({ open: false }); setSelectedFile(null); setUploadLabel(''); setUploadTags(''); setUploadNotes('') }}>
        <DialogContent className="max-w-md" onClose={() => { setUploadDialog({ open: false }); setSelectedFile(null) }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-[#489FB5]" />
              {uploadDialog.parentId ? 'Upload New Version' : 'Upload Resume'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* File picker */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">File</label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  selectedFile ? "border-[#7CB518] bg-[#7CB518]/5" : "border-[hsl(var(--border))] hover:border-[#489FB5]"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileIcon className="h-5 w-5 text-[#7CB518]" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedFile(null) }}
                      className="p-0.5 hover:bg-[hsl(var(--accent))] rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-[hsl(var(--muted-foreground))] mx-auto mb-2" />
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Click to select a PDF file</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">PDF, DOC, DOCX up to 10MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setSelectedFile(file)
                    if (!uploadLabel) {
                      setUploadLabel(file.name.replace(/\.[^.]+$/, ''))
                    }
                  }
                }}
              />
            </div>

            {/* Label */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Label *</label>
              <Input
                value={uploadLabel}
                onChange={e => setUploadLabel(e.target.value)}
                placeholder="e.g. Frontend Developer CV"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags <span className="text-xs text-[hsl(var(--muted-foreground))]">(comma-separated)</span></label>
              <Input
                value={uploadTags}
                onChange={e => setUploadTags(e.target.value)}
                placeholder="e.g. frontend, react, typescript"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes <span className="text-xs text-[hsl(var(--muted-foreground))]">(optional)</span></label>
              <Textarea
                value={uploadNotes}
                onChange={e => setUploadNotes(e.target.value)}
                placeholder="Any notes about this resume version..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setUploadDialog({ open: false }); setSelectedFile(null) }}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadLabel.trim()}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={() => setEditDialog({ open: false, resume: null })}>
        <DialogContent className="max-w-md" onClose={() => setEditDialog({ open: false, resume: null })}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-[#489FB5]" />
              Edit Resume
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Label</label>
              <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags <span className="text-xs text-[hsl(var(--muted-foreground))]">(comma-separated)</span></label>
              <Input value={editTags} onChange={e => setEditTags(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes</label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, resume: null })}>Cancel</Button>
              <Button onClick={handleEdit} disabled={!editLabel.trim()}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
