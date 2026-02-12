import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { STATUSES, STATUS_LABELS, STATUS_COLORS, WORK_MODES, COMPANY_SIZES, COMPENSATION_TYPES, SOURCES, PRIORITIES, STATUS_NEEDS_DATE, STATUS_NO_PROMPT } from '@/lib/constants'
import type { Application } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, ExternalLink, Save, Trash2, Clock, Building, MapPin, Briefcase, User, Mail, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  onRefresh: () => void
}

export default function ApplicationDetail({ onRefresh }: Props) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean
    targetStatus: string
    dateValue: string
  } | null>(null)

  useEffect(() => {
    if (id) loadApplication()
  }, [id])

  const loadApplication = async () => {
    try {
      const data = await api.getApplication(id!)
      setApp(data)
      setForm(data)
    } catch (err) {
      toast.error('Failed to load application')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const tags = form.tags?.map((t: any) => t.name) || []
      const { status_history, ...data } = form
      await api.updateApplication(id!, { ...data, tags })
      toast.success('Application updated')
      setEditing(false)
      loadApplication()
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = (newStatus: string) => {
    if (app && newStatus === app.status) return

    if (STATUS_NO_PROMPT.includes(newStatus)) {
      // Rejected/Withdrawn: no prompt
      executeStatusChange(newStatus)
    } else if (STATUS_NEEDS_DATE[newStatus]) {
      // Show date prompt dialog
      const config = STATUS_NEEDS_DATE[newStatus]
      let defaultDate = ''
      if (config.type === 'datetime-local') {
        const now = new Date()
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
        defaultDate = now.toISOString().slice(0, 16)
      } else {
        defaultDate = new Date().toISOString().slice(0, 10)
      }
      setTransitionDialog({ open: true, targetStatus: newStatus, dateValue: defaultDate })
    } else {
      // No date needed (e.g., saved)
      executeStatusChange(newStatus)
    }
  }

  const executeStatusChange = async (newStatus: string, notes?: string) => {
    try {
      await api.updateStatus(id!, newStatus, notes)
      toast.success(`Status updated to ${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}`)
      loadApplication()
      onRefresh()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleTransitionConfirm = () => {
    if (!transitionDialog) return
    const config = STATUS_NEEDS_DATE[transitionDialog.targetStatus]
    const notes = transitionDialog.dateValue && config
      ? `${config.label}: ${transitionDialog.dateValue}`
      : undefined
    executeStatusChange(transitionDialog.targetStatus, notes)
    setTransitionDialog(null)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this application?')) return
    try {
      await api.deleteApplication(id!)
      toast.success('Application deleted')
      onRefresh()
      navigate('/')
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const updateForm = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!app) return null

  const tags = app.tags || []
  const history = app.status_history || []

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {app.company_website && (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(app.company_website).hostname } catch { return '' } })()}&sz=24`}
                  alt="" className="w-6 h-6 rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <h1 className="text-2xl font-bold">{app.job_title}</h1>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] flex items-center gap-2">
              <Building className="h-4 w-4" />
              {app.company_name}
              {app.job_url && (
                <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setForm(app) }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              <Button variant="destructive" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Status Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STATUSES.map((status, i) => {
              const isActive = app.status === status
              const isPast = STATUSES.indexOf(app.status as any) > i
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                    isActive && STATUS_COLORS[status],
                    isPast && "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                    !isActive && !isPast && "bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]/50 hover:bg-[hsl(var(--muted))]",
                  )}
                >
                  {STATUS_LABELS[status]}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Company Name</label>
                    <Input value={form.company_name || ''} onChange={e => updateForm('company_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Job Title</label>
                    <Input value={form.job_title || ''} onChange={e => updateForm('job_title', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Company Website</label>
                    <Input value={form.company_website || ''} onChange={e => updateForm('company_website', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Company Size</label>
                    <Select value={form.company_size || ''} onChange={e => updateForm('company_size', e.target.value)}>
                      <option value="">Select...</option>
                      {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Salary Min</label>
                    <Input type="number" value={form.salary_min || ''} onChange={e => updateForm('salary_min', e.target.value ? parseInt(e.target.value) : null)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Salary Max</label>
                    <Input type="number" value={form.salary_max || ''} onChange={e => updateForm('salary_max', e.target.value ? parseInt(e.target.value) : null)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">City</label>
                    <Input value={form.location_city || ''} onChange={e => updateForm('location_city', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Country</label>
                    <Input value={form.location_country || ''} onChange={e => updateForm('location_country', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Work Mode</label>
                    <Select value={form.work_mode || ''} onChange={e => updateForm('work_mode', e.target.value)}>
                      <option value="">Select...</option>
                      {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Priority</label>
                    <Select value={form.priority || 'medium'} onChange={e => updateForm('priority', e.target.value)}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Source</label>
                    <Select value={form.source || ''} onChange={e => updateForm('source', e.target.value)}>
                      <option value="">Select...</option>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Match Score</label>
                    <Input type="number" min="1" max="5" value={form.match_score || ''} onChange={e => updateForm('match_score', e.target.value ? parseInt(e.target.value) : null)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Notes</label>
                    <Textarea rows={4} value={form.notes || ''} onChange={e => updateForm('notes', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Cover Letter Notes</label>
                    <Textarea rows={3} value={form.cover_letter_notes || ''} onChange={e => updateForm('cover_letter_notes', e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span>{[app.location_city, app.location_country].filter(Boolean).join(', ') || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span>{app.work_mode || 'Not specified'}</span>
                  </div>
                  {(app.salary_min || app.salary_max) && (
                    <div className="col-span-2">
                      <span className="text-[hsl(var(--muted-foreground))]">Salary:</span>{' '}
                      {app.salary_min?.toLocaleString() || '?'} - {app.salary_max?.toLocaleString() || '?'} {app.salary_currency}
                      {app.compensation_type && ` (${app.compensation_type})`}
                    </div>
                  )}
                  {app.source && <div><span className="text-[hsl(var(--muted-foreground))]">Source:</span> {app.source}</div>}
                  {app.company_size && <div><span className="text-[hsl(var(--muted-foreground))]">Company Size:</span> {app.company_size}</div>}
                  {app.match_score && <div><span className="text-[hsl(var(--muted-foreground))]">Match Score:</span> {'⭐'.repeat(app.match_score)}</div>}
                  {app.date_applied && <div><span className="text-[hsl(var(--muted-foreground))]">Applied:</span> {new Date(app.date_applied).toLocaleDateString()}</div>}
                  {app.resume_version && <div><span className="text-[hsl(var(--muted-foreground))]">Resume:</span> {app.resume_version}</div>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {!editing && app.notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{app.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Job Description */}
          {app.job_description_raw && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Job Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">{app.job_description_raw}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact */}
          {(app.contact_name || app.contact_email) && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Contact</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {app.contact_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <span>{app.contact_name}</span>
                    {app.contact_role && <span className="text-xs text-[hsl(var(--muted-foreground))]">({app.contact_role})</span>}
                  </div>
                )}
                {app.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <a href={`mailto:${app.contact_email}`} className="text-blue-600 hover:underline">{app.contact_email}</a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Tags</CardTitle></CardHeader>
            <CardContent>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag: any) => (
                    <Badge key={tag.id || tag.name} variant="secondary">{tag.name}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No tags</p>
              )}
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Status History</CardTitle></CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((h: any) => (
                    <div key={h.id} className="flex items-start gap-2">
                      <Clock className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs">
                          {h.from_status ? (
                            <>
                              <Badge className={cn('text-[10px] px-1 py-0', STATUS_COLORS[h.from_status as keyof typeof STATUS_COLORS])}>
                                {STATUS_LABELS[h.from_status as keyof typeof STATUS_LABELS] || h.from_status}
                              </Badge>
                              {' → '}
                            </>
                          ) : null}
                          <Badge className={cn('text-[10px] px-1 py-0', STATUS_COLORS[h.to_status as keyof typeof STATUS_COLORS])}>
                            {STATUS_LABELS[h.to_status as keyof typeof STATUS_LABELS] || h.to_status}
                          </Badge>
                        </p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                          {h.changed_at ? format(new Date(h.changed_at), 'MMM d, yyyy HH:mm') : ''}
                        </p>
                        {h.notes && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{h.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No history</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Transition Dialog */}
      {transitionDialog && (
        <Dialog open={transitionDialog.open} onOpenChange={() => setTransitionDialog(null)}>
          <DialogContent className="max-w-md" onClose={() => setTransitionDialog(null)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#489FB5]" />
                Moving to {STATUS_LABELS[transitionDialog.targetStatus as keyof typeof STATUS_LABELS] || transitionDialog.targetStatus}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                <span className="font-medium text-[hsl(var(--foreground))]">{app.job_title} at {app.company_name}</span>
              </p>
              {STATUS_NEEDS_DATE[transitionDialog.targetStatus] && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    {STATUS_NEEDS_DATE[transitionDialog.targetStatus].label}
                  </label>
                  <Input
                    type={STATUS_NEEDS_DATE[transitionDialog.targetStatus].type}
                    value={transitionDialog.dateValue}
                    onChange={e => setTransitionDialog(prev => prev ? { ...prev, dateValue: e.target.value } : null)}
                    className="w-full"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setTransitionDialog(null)}>Cancel</Button>
                <Button onClick={handleTransitionConfirm}>Confirm Move</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
