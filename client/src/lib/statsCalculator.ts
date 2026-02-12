import type { Application, Stats } from '@/types'
import { format, differenceInDays, parseISO } from 'date-fns'

export function calculateStats(applications: Application[]): Stats {
  const total = applications.length

  // By status
  const statusCounts: Record<string, number> = {}
  for (const app of applications) {
    const s = app.status || 'saved'
    statusCounts[s] = (statusCounts[s] || 0) + 1
  }
  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  // Response rate: applications that moved past 'applied'
  const applied = applications.filter(a => a.status !== 'saved').length
  const responded = applications.filter(a => !['saved', 'applied'].includes(a.status || '')).length
  const responseRate = applied > 0 ? Math.round((responded / applied) * 100) : 0

  // Average salary (exclude nulls and salary_not_specified)
  const salaryApps = applications.filter(a =>
    !a.salary_not_specified && (a.salary_min !== null || a.salary_max !== null)
  )
  let avgSalary: number | null = null
  if (salaryApps.length > 0) {
    const sum = salaryApps.reduce((acc, a) => {
      const min = a.salary_min || 0
      const max = a.salary_max || 0
      return acc + (min + max) / 2
    }, 0)
    avgSalary = Math.round(sum / salaryApps.length)
  }

  // Active count
  const activeCount = applications.filter(a =>
    !['rejected', 'withdrawn', 'accepted'].includes(a.status || '')
  ).length

  // Timeline (by week)
  const weekCounts: Record<string, number> = {}
  for (const app of applications) {
    if (app.date_added) {
      const week = format(parseISO(app.date_added), 'yyyy-ww')
      weekCounts[week] = (weekCounts[week] || 0) + 1
    }
  }
  const timeline = Object.entries(weekCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }))

  // Salary distribution
  const salaryDistribution = applications
    .filter(a => !a.salary_not_specified && (a.salary_min !== null || a.salary_max !== null))
    .map(a => ({
      salary_min: a.salary_min || 0,
      salary_max: a.salary_max || 0,
    }))

  // Average days per stage (from status history)
  const stageMap: Record<string, number[]> = {}
  for (const app of applications) {
    const history = app.status_history || []
    for (let i = 0; i < history.length - 1; i++) {
      const current = history[i]
      const next = history[i + 1]
      if (current.changed_at && next.changed_at) {
        const days = differenceInDays(parseISO(next.changed_at), parseISO(current.changed_at))
        if (days >= 0) {
          const stage = current.to_status
          if (!stageMap[stage]) stageMap[stage] = []
          stageMap[stage].push(days)
        }
      }
    }
  }
  const avgDaysPerStage = Object.entries(stageMap).map(([stage, days]) => ({
    stage,
    avg_days: Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10,
  }))

  // Top tags
  const tagCounts: Record<string, number> = {}
  for (const app of applications) {
    const tags = app.tags || []
    for (const tag of tags) {
      tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  // Source effectiveness
  const sourceMap: Record<string, { total: number; interviews: number; offers: number }> = {}
  for (const app of applications) {
    if (!app.source) continue
    if (!sourceMap[app.source]) sourceMap[app.source] = { total: 0, interviews: 0, offers: 0 }
    sourceMap[app.source].total++
    if (!['saved', 'applied', 'rejected', 'withdrawn'].includes(app.status || '')) {
      sourceMap[app.source].interviews++
    }
    if (['offer', 'accepted'].includes(app.status || '')) {
      sourceMap[app.source].offers++
    }
  }
  const sourceStats = Object.entries(sourceMap).map(([source, data]) => ({
    source,
    ...data,
  }))

  return {
    total,
    byStatus,
    responseRate,
    avgSalary,
    activeCount,
    timeline,
    salaryDistribution,
    avgDaysPerStage,
    topTags,
    sourceStats,
  }
}
