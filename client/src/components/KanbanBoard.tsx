import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { KANBAN_STATUSES, STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, STATUS_NEEDS_DATE, STATUS_NO_PROMPT } from '@/lib/constants'
import type { Application } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { GripVertical, ExternalLink, MapPin, Briefcase, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  searchQuery: string
  refreshKey: number
  onRefresh: () => void
}

function KanbanCard({ app, overlay }: { app: Application; overlay?: boolean }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
    data: { status: app.status },
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const tags = app.tag_names ? app.tag_names.split(',') : []
  const salaryRange = app.salary_min || app.salary_max
    ? `${app.salary_min ? app.salary_min.toLocaleString() : '?'} - ${app.salary_max ? app.salary_max.toLocaleString() : '?'} ${app.salary_currency || 'EUR'}`
    : null

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      className={cn(
        "bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow border-l-4",
        PRIORITY_COLORS[app.priority] || 'border-l-yellow-500'
      )}
      {...(overlay ? {} : { ...attributes, ...listeners })}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {app.company_website && (
              <img
                src={`https://www.google.com/s2/favicons?domain=${new URL(app.company_website).hostname}&sz=16`}
                alt=""
                className="w-4 h-4 rounded-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] truncate">{app.company_name}</span>
          </div>
          <h4
            className="text-sm font-semibold truncate cursor-pointer hover:text-[#489FB5] transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/application/${app.id}`) }}
          >
            {app.job_title}
          </h4>
        </div>
      </div>

      {salaryRange && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 flex items-center gap-1">
          <Briefcase className="h-3 w-3" /> {salaryRange}
        </p>
      )}

      {(app.location_city || app.location_country) && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {[app.location_city, app.location_country].filter(Boolean).join(', ')}
        </p>
      )}

      <div className="flex flex-wrap gap-1 mt-2">
        {app.work_mode && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{app.work_mode}</Badge>
        )}
        {tags.slice(0, 3).map(tag => (
          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag.trim()}</Badge>
        ))}
        {tags.length > 3 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{tags.length - 3}</Badge>
        )}
      </div>

      {app.date_added && (
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-2">
          Added {formatDistanceToNow(new Date(app.date_added), { addSuffix: true })}
        </p>
      )}
    </div>
  )
}

function KanbanColumn({ status, apps, label }: { status: string; apps: Application[]; label: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: 'column', status },
  })

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <div className="flex items-center gap-2">
          <Badge className={cn('text-xs', STATUS_COLORS[status as keyof typeof STATUS_COLORS])}>{label}</Badge>
          <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium">{apps.length}</span>
        </div>
      </div>
      <SortableContext items={apps.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex flex-col gap-2 p-1 min-h-[200px] rounded-lg bg-[hsl(var(--muted))]/30 transition-colors",
            isOver && "bg-[#489FB5]/10 ring-2 ring-[#489FB5]/30"
          )}
        >
          {apps.map(app => (
            <KanbanCard key={app.id} app={app} />
          ))}
          {apps.length === 0 && (
            <div className="flex items-center justify-center h-24 text-xs text-[hsl(var(--muted-foreground))]">
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// Status Transition Dialog
function StatusTransitionDialog({
  open,
  onClose,
  targetStatus,
  appName,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  targetStatus: string
  appName: string
  onConfirm: (dateValue?: string) => void
}) {
  const config = STATUS_NEEDS_DATE[targetStatus]
  const [dateValue, setDateValue] = useState('')
  const statusLabel = STATUS_LABELS[targetStatus as keyof typeof STATUS_LABELS] || targetStatus

  useEffect(() => {
    if (open) {
      // Pre-fill with current date/time
      if (config?.type === 'datetime-local') {
        const now = new Date()
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
        setDateValue(now.toISOString().slice(0, 16))
      } else if (config?.type === 'date') {
        setDateValue(new Date().toISOString().slice(0, 10))
      }
    }
  }, [open, config])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#489FB5]" />
            Moving to {statusLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            <span className="font-medium text-[hsl(var(--foreground))]">{appName}</span>
          </p>
          {config && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{config.label}</label>
              <Input
                type={config.type}
                value={dateValue}
                onChange={e => setDateValue(e.target.value)}
                className="w-full"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onConfirm(dateValue)}>
              Confirm Move
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function KanbanBoard({ searchQuery, refreshKey, onRefresh }: Props) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeApp, setActiveApp] = useState<Application | null>(null)

  // Status transition dialog state
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean
    appId: number
    appName: string
    fromStatus: string
    targetStatus: string
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    loadApplications()
  }, [searchQuery, refreshKey])

  const loadApplications = async () => {
    try {
      const params: Record<string, string> = {}
      if (searchQuery) params.search = searchQuery
      const data = await api.getApplications(params)
      setApplications(data)
    } catch (err) {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event: any) => {
    const app = applications.find(a => a.id === event.active.id)
    if (app) setActiveApp(app)
  }

  const handleDragEnd = async (event: any) => {
    setActiveApp(null)
    const { active, over } = event

    if (!over) return

    const draggedApp = applications.find(a => a.id === active.id)
    if (!draggedApp) return

    // Find which column the item was dropped over
    let targetStatus: string | null = null

    // Check if dropped over a column droppable (id format: "column-{status}")
    if (typeof over.id === 'string' && over.id.startsWith('column-')) {
      targetStatus = over.id.replace('column-', '')
    }

    // Check if dropped over another card
    if (!targetStatus) {
      const overApp = applications.find(a => a.id === over.id)
      if (overApp) {
        targetStatus = overApp.status
      }
    }

    // Also check the droppable data for column status
    if (!targetStatus && over.data?.current?.status) {
      targetStatus = over.data.current.status
    }

    if (!targetStatus || targetStatus === draggedApp.status) return

    // Check if this status needs a date prompt
    if (STATUS_NO_PROMPT.includes(targetStatus)) {
      // Rejected/Withdrawn: no prompt, just move immediately
      executeStatusChange(draggedApp, targetStatus)
    } else if (STATUS_NEEDS_DATE[targetStatus]) {
      // Show dialog for date input
      setTransitionDialog({
        open: true,
        appId: draggedApp.id,
        appName: `${draggedApp.job_title} at ${draggedApp.company_name}`,
        fromStatus: draggedApp.status,
        targetStatus,
      })
    } else {
      // No date needed (e.g., saved), just move
      executeStatusChange(draggedApp, targetStatus)
    }
  }

  const executeStatusChange = async (app: Application, targetStatus: string, notes?: string) => {
    // Optimistic update
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: targetStatus } : a))

    try {
      await api.updateStatus(app.id, targetStatus, notes)
      toast.success(`Moved to ${STATUS_LABELS[targetStatus as keyof typeof STATUS_LABELS] || targetStatus}`)
    } catch (err) {
      // Revert
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: app.status } : a))
      toast.error('Failed to update status')
    }
  }

  const handleTransitionConfirm = (dateValue?: string) => {
    if (!transitionDialog) return

    const app = applications.find(a => a.id === transitionDialog.appId)
    if (!app) return

    const config = STATUS_NEEDS_DATE[transitionDialog.targetStatus]
    const notes = dateValue && config ? `${config.label}: ${dateValue}` : undefined

    executeStatusChange(app, transitionDialog.targetStatus, notes)
    setTransitionDialog(null)
  }

  if (loading) {
    return (
      <div className="p-4 flex gap-4 overflow-x-auto">
        {KANBAN_STATUSES.slice(0, 6).map(s => (
          <div key={s} className="min-w-[280px] w-[280px] shrink-0">
            <Skeleton className="h-8 w-32 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (applications.length === 0 && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-xl font-semibold mb-2">No applications yet</h2>
        <p className="text-[hsl(var(--muted-foreground))] max-w-md">
          Start tracking your job search by clicking "Add Application" above. You can paste a job URL, description, or enter details manually.
        </p>
      </div>
    )
  }

  const appsByStatus = KANBAN_STATUSES.reduce((acc, status) => {
    acc[status] = applications.filter(a => a.status === status)
    return acc
  }, {} as Record<string, Application[]>)

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="p-4 flex gap-4 overflow-x-auto h-full">
          {KANBAN_STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              apps={appsByStatus[status]}
              label={STATUS_LABELS[status]}
            />
          ))}
        </div>
        <DragOverlay>
          {activeApp ? <KanbanCard app={activeApp} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Status Transition Dialog */}
      {transitionDialog && (
        <StatusTransitionDialog
          open={transitionDialog.open}
          onClose={() => setTransitionDialog(null)}
          targetStatus={transitionDialog.targetStatus}
          appName={transitionDialog.appName}
          onConfirm={handleTransitionConfirm}
        />
      )}
    </>
  )
}
