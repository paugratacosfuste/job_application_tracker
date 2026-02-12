import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Kanban, Table, BarChart3, Calendar, Settings, Plus, Search, Menu, X, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import KanbanBoard from '@/components/KanbanBoard'
import TableView from '@/components/TableView'
import Dashboard from '@/components/Dashboard'
import CalendarView from '@/components/CalendarView'
import SettingsPage from '@/components/SettingsPage'
import ApplicationDetail from '@/components/ApplicationDetail'
import AddApplicationModal from '@/components/AddApplicationModal'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { path: '/', icon: Kanban, label: 'Kanban', shortcut: 'K' },
  { path: '/table', icon: Table, label: 'Table', shortcut: 'T' },
  { path: '/dashboard', icon: BarChart3, label: 'Dashboard', shortcut: 'D' },
  { path: '/calendar', icon: Calendar, label: 'Calendar', shortcut: 'C' },
  { path: '/settings', icon: Settings, label: 'Settings', shortcut: 'S' },
]

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()

  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key.toLowerCase()) {
        case 'n': e.preventDefault(); setAddModalOpen(true); break
        case 'k': e.preventDefault(); navigate('/'); break
        case 't': e.preventDefault(); navigate('/table'); break
        case 'd': e.preventDefault(); navigate('/dashboard'); break
        case 'c': e.preventDefault(); navigate('/calendar'); break
        case 's': e.preventDefault(); navigate('/settings'); break
        case '/': e.preventDefault(); document.getElementById('global-search')?.focus(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  return (
    <div className="flex h-screen bg-[hsl(var(--background))]">
      {/* Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] transition-all duration-200",
        sidebarOpen ? "w-56" : "w-16"
      )}>
        <div className="p-4 flex items-center gap-2 border-b border-[hsl(var(--border))]">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-[hsl(var(--accent))] rounded">
            <Menu className="h-5 w-5" />
          </button>
          {sidebarOpen && <span className="font-semibold text-sm">Job Tracker</span>}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                location.pathname === item.path
                  ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                  : "hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
              {sidebarOpen && (
                <kbd className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded">{item.shortcut}</kbd>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-56 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] z-50 p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">Job Tracker</span>
              <button onClick={() => setMobileSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMobileSidebarOpen(false) }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    location.pathname === item.path
                      ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                      : "hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[hsl(var(--border))] flex items-center px-4 gap-3 bg-[hsl(var(--card))]">
          <button className="md:hidden" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 flex items-center gap-3 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                id="global-search"
                placeholder="Search applications... ( / )"
                className="pl-9 h-8"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)} className="h-8 w-8">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={() => setAddModalOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Application</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<KanbanBoard searchQuery={searchQuery} refreshKey={refreshKey} onRefresh={triggerRefresh} />} />
            <Route path="/table" element={<TableView searchQuery={searchQuery} refreshKey={refreshKey} onRefresh={triggerRefresh} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/application/:id" element={<ApplicationDetail onRefresh={triggerRefresh} />} />
          </Routes>
        </main>
      </div>

      <AddApplicationModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onCreated={triggerRefresh} />
    </div>
  )
}

export default App
