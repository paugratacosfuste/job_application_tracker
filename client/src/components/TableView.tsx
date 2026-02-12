import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { STATUSES, STATUS_LABELS, STATUS_COLORS, PRIORITIES, WORK_MODES, SOURCE_LABELS } from '@/lib/constants'
import type { Application } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ArrowUpDown, Trash2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

interface Props {
  searchQuery: string
  refreshKey: number
  onRefresh: () => void
}

const columnHelper = createColumnHelper<Application>()

export default function TableView({ searchQuery, refreshKey, onRefresh }: Props) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [statusFilter, setStatusFilter] = useState('')
  const [workModeFilter, setWorkModeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const navigate = useNavigate()

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

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.updateStatus(id, newStatus)
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
      toast.success('Status updated')
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this application?')) return
    try {
      await api.deleteApplication(id)
      setApplications(prev => prev.filter(a => a.id !== id))
      toast.success('Application deleted')
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection).map(idx => filteredData[parseInt(idx)]?.id).filter(Boolean) as number[]
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} applications?`)) return
    try {
      await api.bulkDelete(selectedIds)
      setApplications(prev => prev.filter(a => !selectedIds.includes(a.id)))
      setRowSelection({})
      toast.success(`Deleted ${selectedIds.length} applications`)
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const handleBulkStatus = async (status: string) => {
    const selectedIds = Object.keys(rowSelection).map(idx => filteredData[parseInt(idx)]?.id).filter(Boolean) as number[]
    if (selectedIds.length === 0) return
    try {
      await api.bulkStatus(selectedIds, status)
      setApplications(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, status } : a))
      setRowSelection({})
      toast.success(`Updated ${selectedIds.length} applications`)
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} className="rounded" />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} className="rounded" />
      ),
      size: 40,
    }),
    columnHelper.accessor('company_name', {
      header: 'Company',
      cell: info => (
        <div className="flex items-center gap-2">
          {info.row.original.company_website && (
            <img
              src={`https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(info.row.original.company_website!).hostname } catch { return '' } })()}&sz=16`}
              alt="" className="w-4 h-4 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span className="font-medium">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('job_title', {
      header: 'Title',
      cell: info => (
        <button className="text-left font-medium hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[200px] block" onClick={() => navigate(`/application/${info.row.original.id}`)}>
          {info.getValue()}
        </button>
      ),
    }),
    columnHelper.accessor(row => row.salary_min || row.salary_max ? `${row.salary_min?.toLocaleString() || '?'}-${row.salary_max?.toLocaleString() || '?'} ${row.salary_currency}` : '-', {
      id: 'salary',
      header: 'Salary',
    }),
    columnHelper.accessor(row => [row.location_city, row.location_country].filter(Boolean).join(', ') || '-', {
      id: 'location',
      header: 'Location',
    }),
    columnHelper.accessor('work_mode', {
      header: 'Mode',
      cell: info => info.getValue() ? <Badge variant="secondary" className="text-xs">{info.getValue()}</Badge> : '-',
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <Select value={info.getValue()} onChange={e => handleStatusChange(info.row.original.id, e.target.value)}
          className={cn('text-xs h-7 w-36', STATUS_COLORS[info.getValue() as keyof typeof STATUS_COLORS])}>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
      ),
    }),
    columnHelper.accessor('priority', {
      header: 'Priority',
      cell: info => {
        const colors: Record<string, string> = { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-green-600' }
        return <span className={cn('text-xs font-medium capitalize', colors[info.getValue()])}>{info.getValue()}</span>
      },
    }),
    columnHelper.accessor('date_applied', {
      header: 'Applied',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '-',
    }),
    columnHelper.accessor('source', {
      header: 'Source',
      cell: info => info.getValue() ? SOURCE_LABELS[info.getValue()!] || info.getValue() : '-',
    }),
    columnHelper.accessor('tag_names', {
      header: 'Tags',
      cell: info => {
        const tags = info.getValue()?.split(',').map(t => t.trim()).filter(Boolean) || []
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
            {tags.length > 2 && <Badge variant="outline" className="text-[10px]">+{tags.length - 2}</Badge>}
          </div>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => (
        <div className="flex gap-1">
          {info.row.original.job_url && (
            <a href={info.row.original.job_url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[hsl(var(--accent))] rounded">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button onClick={() => handleDelete(info.row.original.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    }),
  ], [navigate])

  const filteredData = useMemo(() => {
    let data = applications
    if (statusFilter) data = data.filter(a => a.status === statusFilter)
    if (workModeFilter) data = data.filter(a => a.work_mode === workModeFilter)
    if (priorityFilter) data = data.filter(a => a.priority === priorityFilter)
    return data
  }, [applications, statusFilter, workModeFilter, priorityFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    enableRowSelection: true,
  })

  useEffect(() => { table.setPageSize(pageSize) }, [pageSize, table])

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  const selectedCount = Object.keys(rowSelection).length

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-8 w-40 text-xs">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
        <Select value={workModeFilter} onChange={e => setWorkModeFilter(e.target.value)} className="h-8 w-36 text-xs">
          <option value="">All Modes</option>
          {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="h-8 w-32 text-xs">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">{selectedCount} selected</span>
            <Select onChange={e => { if (e.target.value) handleBulkStatus(e.target.value); e.target.value = '' }} className="h-8 w-36 text-xs">
              <option value="">Change Status...</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </Select>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-8 text-xs">Delete Selected</Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[hsl(var(--border))] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
                {hg.headers.map(header => (
                  <th key={header.id} className="px-3 py-2 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] cursor-pointer hover:bg-[hsl(var(--accent))]"
                    onClick={header.column.getToggleSortingHandler()}>
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/30 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-[hsl(var(--muted-foreground))]">No applications found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Rows per page:</span>
          <Select value={String(pageSize)} onChange={e => setPageSize(Number(e.target.value))} className="h-7 w-16 text-xs">
            <option value="25">25</option><option value="50">50</option><option value="100">100</option>
          </Select>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-7"><ChevronLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-7"><ChevronRight className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  )
}
