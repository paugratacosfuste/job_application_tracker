import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { FileText, Search, Copy, Trash2, Pencil, Download, Building, CheckCircle, X, ArrowUpDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import jsPDF from 'jspdf'
import type { Application } from '@/types'

interface CoverLetterWithApp {
  id: string
  label: string
  content: string | null
  generated_text: string | null
  instructions: string | null
  application_id: string | null
  created_at: string | null
  updated_at: string | null
  // Joined from application
  company_name?: string
  job_title?: string
  app_status?: string
}

export default function CoverLettersPage() {
  const navigate = useNavigate()
  const [coverLetters, setCoverLetters] = useState<CoverLetterWithApp[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAppId, setFilterAppId] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'company'>('date')

  // Detail/Edit modal
  const [selectedCL, setSelectedCL] = useState<CoverLetterWithApp | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [cls, apps] = await Promise.all([
        api.getCoverLetters(),
        api.getApplications(),
      ])

      // Join cover letters with application data
      const appMap = new Map(apps.map((a: Application) => [a.id, a]))
      const enriched = cls.map((cl: any) => {
        const app = cl.application_id ? appMap.get(cl.application_id) : null
        return {
          ...cl,
          company_name: app?.company_name || 'Unknown',
          job_title: app?.job_title || 'Unknown',
          app_status: app?.status || '',
        }
      })

      setCoverLetters(enriched)
      setApplications(apps)
    } catch (err) {
      toast.error('Failed to load cover letters')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = [...coverLetters]

    if (filterAppId) {
      result = result.filter(cl => cl.application_id === filterAppId)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(cl =>
        cl.company_name?.toLowerCase().includes(q) ||
        cl.job_title?.toLowerCase().includes(q) ||
        cl.label?.toLowerCase().includes(q) ||
        cl.generated_text?.toLowerCase().includes(q) ||
        cl.content?.toLowerCase().includes(q)
      )
    }

    if (sortBy === 'company') {
      result.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''))
    } else {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    }

    return result
  }, [coverLetters, search, filterAppId, sortBy])

  const getText = (cl: CoverLetterWithApp) => cl.generated_text || cl.content || ''

  const handleCopy = (cl: CoverLetterWithApp) => {
    navigator.clipboard.writeText(getText(cl))
    toast.success('Copied to clipboard')
  }

  const handleDelete = async (cl: CoverLetterWithApp) => {
    if (!confirm('Delete this cover letter?')) return
    try {
      await api.deleteCoverLetter(cl.id)
      setCoverLetters(prev => prev.filter(c => c.id !== cl.id))
      toast.success('Cover letter deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleExportPdf = (cl: CoverLetterWithApp) => {
    const text = getText(cl)
    if (!text) { toast.error('No content to export'); return }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const margin = 25
    const pageWidth = doc.internal.pageSize.getWidth()
    const maxWidth = pageWidth - margin * 2

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)

    const lines = doc.splitTextToSize(text, maxWidth)
    let y = margin

    for (const line of lines) {
      if (y > 270) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += 5.5
    }

    const company = (cl.company_name || 'Company').replace(/[^a-zA-Z0-9]/g, '_')
    const title = (cl.job_title || 'Position').replace(/[^a-zA-Z0-9]/g, '_')
    doc.save(`Cover_Letter_${company}_${title}.pdf`)
    toast.success('PDF exported')
  }

  const openDetail = (cl: CoverLetterWithApp) => {
    setSelectedCL(cl)
    setEditText(getText(cl))
    setEditLabel(cl.label)
    setEditMode(false)
  }

  const handleSaveEdit = async () => {
    if (!selectedCL) return
    setSaving(true)
    try {
      await api.updateCoverLetter(selectedCL.id, {
        generated_text: editText,
        label: editLabel,
      })
      setCoverLetters(prev => prev.map(cl =>
        cl.id === selectedCL.id
          ? { ...cl, generated_text: editText, label: editLabel, updated_at: new Date().toISOString() }
          : cl
      ))
      setSelectedCL(prev => prev ? { ...prev, generated_text: editText, label: editLabel, updated_at: new Date().toISOString() } : null)
      setEditMode(false)
      toast.success('Cover letter updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Unique applications that have cover letters
  const appOptions = useMemo(() => {
    const ids = new Set(coverLetters.map(cl => cl.application_id).filter(Boolean))
    return applications.filter(a => ids.has(a.id))
  }, [coverLetters, applications])

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-[hsl(var(--muted))] rounded animate-pulse" />
        <div className="h-10 w-full bg-[hsl(var(--muted))] rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 w-full bg-[hsl(var(--muted))] rounded animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Cover Letters</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">All your generated and saved cover letters</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Search by company, title, or content..."
            className="pl-9 h-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={filterAppId}
          onChange={e => setFilterAppId(e.target.value)}
          className="w-full sm:w-64 h-9"
        >
          <option value="">All applications</option>
          {appOptions.map(a => (
            <option key={a.id} value={a.id}>{a.company_name} — {a.job_title}</option>
          ))}
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 shrink-0"
          onClick={() => setSortBy(prev => prev === 'date' ? 'company' : 'date')}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortBy === 'date' ? 'By Date' : 'By Company'}
        </Button>
      </div>

      {/* Cover Letters List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {coverLetters.length === 0 ? 'No cover letters yet' : 'No matching cover letters'}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              {coverLetters.length === 0
                ? "Generate your first cover letter from any application's detail page"
                : 'Try adjusting your search or filter'}
            </p>
            {coverLetters.length === 0 && (
              <Button onClick={() => navigate('/')} size="sm">Go to Kanban Board</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(cl => (
            <Card key={cl.id} className="hover:border-[#489FB5]/50 transition-colors cursor-pointer" onClick={() => openDetail(cl)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                      <span className="text-sm font-medium truncate">{cl.company_name}</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">·</span>
                      <span className="text-sm text-[hsl(var(--muted-foreground))] truncate">{cl.job_title}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{cl.label}</span>
                      {cl.updated_at && cl.updated_at !== cl.created_at && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Edited</Badge>
                      )}
                      {cl.created_at && (
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                          {formatDistanceToNow(new Date(cl.created_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
                      {getText(cl).slice(0, 150)}{getText(cl).length > 150 ? '...' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(cl)} title="Copy">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExportPdf(cl)} title="Export PDF">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDelete(cl)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedCL && (
        <Dialog open={!!selectedCL} onOpenChange={() => setSelectedCL(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClose={() => setSelectedCL(null)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#489FB5]" />
                Cover Letter — {selectedCL.company_name}
              </DialogTitle>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{selectedCL.job_title}</p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-2">
              {/* Label */}
              {editMode ? (
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Label</label>
                  <Input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedCL.label}</Badge>
                  {selectedCL.updated_at && selectedCL.updated_at !== selectedCL.created_at && (
                    <Badge variant="secondary" className="text-[10px]">Edited</Badge>
                  )}
                  {selectedCL.instructions && (
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Instructions: "{selectedCL.instructions}"</span>
                  )}
                </div>
              )}

              {/* Content */}
              {editMode ? (
                <textarea
                  className="w-full min-h-[300px] p-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm resize-y"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                />
              ) : (
                <div className="p-4 rounded-lg bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]">
                  <p className="text-sm whitespace-pre-wrap">{getText(selectedCL)}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCopy(selectedCL)} className="gap-1">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportPdf(selectedCL)} className="gap-1">
                  <Download className="h-3.5 w-3.5" /> Export PDF
                </Button>
              </div>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedCL(null)}>Close</Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
