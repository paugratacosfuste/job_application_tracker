import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/constants'
import type { Application } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ExternalLink } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addHours } from 'date-fns'

interface CalendarEvent {
  id: number
  date: Date
  endDate?: Date
  title: string
  company: string
  type: 'interview' | 'follow_up' | 'applied' | 'deadline'
  status?: string
  applicationId: string
}

function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  const title = encodeURIComponent(event.title)
  const details = encodeURIComponent(`Company: ${event.company}\nManaged via Job Application Tracker`)

  // Format dates for Google Calendar (YYYYMMDDTHHmmssZ or YYYYMMDD for all-day)
  const startDate = event.date
  const endDate = event.endDate || addHours(startDate, 1)

  const isAllDay = startDate.getHours() === 0 && startDate.getMinutes() === 0

  let dates: string
  if (isAllDay) {
    const startStr = format(startDate, 'yyyyMMdd')
    const endStr = format(addHours(startDate, 24), 'yyyyMMdd')
    dates = `${startStr}/${endStr}`
  } else {
    const startStr = format(startDate, "yyyyMMdd'T'HHmmss")
    const endStr = format(endDate, "yyyyMMdd'T'HHmmss")
    dates = `${startStr}/${endStr}`
  }

  return `${base}&text=${title}&dates=${dates}&details=${details}`
}

export default function CalendarView() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    try {
      const data = await api.getCalendarEvents()
      setApplications(data)
    } catch (err) {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const events = useMemo(() => {
    const evts: CalendarEvent[] = []
    for (const app of applications) {
      if (app.date_applied) {
        evts.push({
          id: evts.length,
          date: new Date(app.date_applied),
          title: `Applied: ${app.job_title}`,
          company: app.company_name,
          type: 'applied',
          status: app.status || undefined,
          applicationId: app.id,
        })
      }
      if (app.follow_up_date) {
        evts.push({
          id: evts.length,
          date: new Date(app.follow_up_date),
          title: `Follow-up: ${app.job_title}`,
          company: app.company_name,
          type: 'follow_up',
          status: app.status || undefined,
          applicationId: app.id,
        })
      }

      // Parse dates from status history notes (set during Kanban transitions)
      if (app.status_history) {
        for (const entry of app.status_history) {
          if (entry.notes) {
            // Pattern: "Phone Screen Date & Time: 2024-01-15T10:00"
            const dateMatch = entry.notes.match(/:\s*(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)/)
            if (dateMatch) {
              const parsedDate = new Date(dateMatch[1])
              if (!isNaN(parsedDate.getTime())) {
                const isDeadline = entry.notes.toLowerCase().includes('deadline')
                evts.push({
                  id: evts.length,
                  date: parsedDate,
                  title: `${STATUS_LABELS[entry.to_status as keyof typeof STATUS_LABELS] || entry.to_status}: ${app.job_title}`,
                  company: app.company_name,
                  type: isDeadline ? 'deadline' : 'interview',
                  status: entry.to_status,
                  applicationId: app.id,
                })
              }
            }
          }
        }
      }

      // Infer interview dates from current status (fallback for apps without status history dates)
      if (app.status && ['phone_screen', 'technical_interview', 'final_round'].includes(app.status)) {
        const hasHistoryDate = app.status_history?.some(h =>
          h.to_status === app.status && h.notes?.match(/:\s*\d{4}-\d{2}-\d{2}/)
        )
        if (!hasHistoryDate && app.date_added) {
          evts.push({
            id: evts.length,
            date: new Date(app.date_added),
            title: `${STATUS_LABELS[app.status as keyof typeof STATUS_LABELS]}: ${app.job_title}`,
            company: app.company_name,
            type: 'interview',
            status: app.status || undefined,
            applicationId: app.id,
          })
        }
      }
    }
    return evts
  }, [applications])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDay = (day: Date) => events.filter(e => isSameDay(e.date, day))

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : []

  const eventTypeColors: Record<string, string> = {
    interview: 'bg-[#489FB5]',
    follow_up: 'bg-[#FFA62B]',
    applied: 'bg-[#102542]',
    deadline: 'bg-[#E53D00]',
  }

  const eventTypeDotColors: Record<string, string> = {
    interview: 'bg-[#489FB5]',
    follow_up: 'bg-[#FFA62B]',
    applied: 'bg-[#102542]',
    deadline: 'bg-[#E53D00]',
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentMonth(new Date())}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#102542]" />
          <span>Applied</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#489FB5]" />
          <span>Interview</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFA62B]" />
          <span>Follow-up</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E53D00]" />
          <span>Deadline</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-[hsl(var(--border))] rounded-lg overflow-hidden">
        {/* Day headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="bg-[hsl(var(--muted))] px-2 py-2 text-center text-xs font-medium text-[hsl(var(--muted-foreground))]">
            {day}
          </div>
        ))}

        {/* Calendar cells */}
        {calendarDays.map(day => {
          const dayEvents = getEventsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDate && isSameDay(day, selectedDate)

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "bg-[hsl(var(--card))] min-h-[100px] p-1.5 cursor-pointer transition-colors hover:bg-[hsl(var(--accent))]/50",
                !isCurrentMonth && "opacity-40",
                isSelected && "ring-2 ring-inset ring-[#489FB5]",
              )}
              onClick={() => setSelectedDate(day)}
            >
              <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                isToday(day) && "bg-[#489FB5] text-white"
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(evt => (
                  <div
                    key={evt.id}
                    className={cn("text-[10px] px-1 py-0.5 rounded truncate text-white", eventTypeColors[evt.type])}
                    onClick={(e) => { e.stopPropagation(); navigate(`/application/${evt.applicationId}`) }}
                  >
                    {evt.company}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] px-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected date events */}
      {selectedDate && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">
            Events on {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No events on this date.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(evt => (
                <div
                  key={evt.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))]/50 group"
                >
                  <div className={cn("w-2 h-8 rounded-full shrink-0", eventTypeDotColors[evt.type])} />
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/application/${evt.applicationId}`)}
                  >
                    <p className="text-sm font-medium">{evt.title}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {evt.company}
                      {evt.date.getHours() !== 0 && ` • ${format(evt.date, 'h:mm a')}`}
                    </p>
                  </div>
                  {evt.status && (
                    <Badge className={cn('text-xs shrink-0', STATUS_COLORS[evt.status as keyof typeof STATUS_COLORS])}>
                      {STATUS_LABELS[evt.status as keyof typeof STATUS_LABELS] || evt.status}
                    </Badge>
                  )}
                  {/* Add to Google Calendar button */}
                  <a
                    href={buildGoogleCalendarUrl(evt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1.5 rounded hover:bg-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Add to Google Calendar"
                    onClick={e => e.stopPropagation()}
                  >
                    <CalendarIcon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
