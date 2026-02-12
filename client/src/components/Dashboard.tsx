import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { STATUS_LABELS, CHART_COLORS } from '@/lib/constants'
import type { Stats } from '@/types'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Briefcase, TrendingUp, DollarSign, Activity } from 'lucide-react'

// Ordered color palette matching the user's scheme
const PIE_COLORS = [
  CHART_COLORS.navy,
  CHART_COLORS.blue,
  CHART_COLORS.orange,
  CHART_COLORS.green,
  CHART_COLORS.greenLight,
  CHART_COLORS.red,
  CHART_COLORS.cyan,
  CHART_COLORS.indigo,
  CHART_COLORS.slate,
]

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadStats()
  }, [dateFrom, dateTo])

  const loadStats = async () => {
    try {
      const params: Record<string, string> = {}
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo
      const data = await api.getStats(params)
      setStats(data)
    } catch (err) {
      toast.error('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    )
  }

  const statusData = stats.byStatus.map(s => ({
    name: STATUS_LABELS[s.status as keyof typeof STATUS_LABELS] || s.status,
    value: s.count,
  }))

  const timelineData = stats.timeline.map(t => ({
    week: t.week,
    applications: t.count,
  }))

  // Salary distribution: sorted low to high
  const salaryBuckets: { range: string; count: number; sortKey: number }[] = []
  if (stats.salaryDistribution.length > 0) {
    const buckets: Record<string, { count: number; sortKey: number }> = {}
    for (const s of stats.salaryDistribution) {
      const avg = ((s.salary_min || 0) + (s.salary_max || 0)) / 2
      const bucketStart = Math.floor(avg / 20000) * 20
      const key = `${bucketStart}k-${bucketStart + 20}k`
      if (!buckets[key]) {
        buckets[key] = { count: 0, sortKey: bucketStart }
      }
      buckets[key].count++
    }
    for (const [range, data] of Object.entries(buckets)) {
      salaryBuckets.push({ range, count: data.count, sortKey: data.sortKey })
    }
    // Sort ascending by salary range
    salaryBuckets.sort((a, b) => a.sortKey - b.sortKey)
  }

  const stageData = stats.avgDaysPerStage
    .filter(s => s.avg_days != null && s.avg_days > 0)
    .map(s => ({
      stage: STATUS_LABELS[s.stage as keyof typeof STATUS_LABELS] || s.stage,
      days: Math.round(s.avg_days * 10) / 10,
    }))

  // Source effectiveness: remove "total" bar, show only interviews & offers with distinct colors
  const sourceData = stats.sourceStats.map(s => ({
    source: s.source,
    interviews: s.interviews,
    offers: s.offers,
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Date range filter */}
      <div className="flex gap-3 items-center">
        <span className="text-sm text-[hsl(var(--muted-foreground))]">Date range:</span>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 h-8 text-sm" />
        <span className="text-sm text-[hsl(var(--muted-foreground))]">to</span>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 h-8 text-sm" />
      </div>

      {/* Top row cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.responseRate}%</div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Moved past applied</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Offer Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgSalary ? `€${stats.avgSalary.toLocaleString()}` : 'N/A'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCount}</div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">In pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications over time */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Applications Over Time</CardTitle></CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[hsl(var(--border))]" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-[hsl(var(--muted-foreground))]" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="applications" stroke={CHART_COLORS.blue} strokeWidth={2} dot={{ fill: CHART_COLORS.blue }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-12">No data yet</p>}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80} fill="#8884d8" dataKey="value">
                    {statusData.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-12">No data yet</p>}
          </CardContent>
        </Card>

        {/* Salary distribution - sorted low to high */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Salary Distribution</CardTitle></CardHeader>
          <CardContent>
            {salaryBuckets.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salaryBuckets}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[hsl(var(--border))]" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-12">No salary data yet</p>}
          </CardContent>
        </Card>

        {/* Average days per stage */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Avg Days Per Stage</CardTitle></CardHeader>
          <CardContent>
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[hsl(var(--border))]" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="days" fill={CHART_COLORS.navy} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-12">No stage data yet</p>}
          </CardContent>
        </Card>

        {/* Top tags */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Most Common Tags</CardTitle></CardHeader>
          <CardContent>
            {stats.topTags.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topTags} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[hsl(var(--border))]" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS.cyan} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-12">No tags yet</p>}
          </CardContent>
        </Card>

        {/* Source effectiveness - no "total" bar, use palette colors */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Source Effectiveness</CardTitle></CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sourceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[hsl(var(--border))]" />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="interviews" fill={CHART_COLORS.blue} name="Interviews" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="offers" fill={CHART_COLORS.green} name="Offers" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-12">No source data yet</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
