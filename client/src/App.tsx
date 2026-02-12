import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Kanban, Table, BarChart3, Calendar, Settings, Plus, Search, Menu, X, Sun, Moon, Monitor, LogOut, FileText, FileEdit, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import KanbanBoard from '@/components/KanbanBoard'
import ErrorBoundary from '@/components/ErrorBoundary'
import AddApplicationModal from '@/components/AddApplicationModal'
import WelcomeModal from '@/components/WelcomeModal'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// Lazy-loaded route components
const TableView = lazy(() => import('@/components/TableView'))
const Dashboard = lazy(() => import('@/components/Dashboard'))
const CalendarView = lazy(() => import('@/components/CalendarView'))
const SettingsPage = lazy(() => import('@/components/SettingsPage'))
const ApplicationDetail = lazy(() => import('@/components/ApplicationDetail'))
const ResumeManager = lazy(() => import('@/components/ResumeManager'))
const CoverLettersPage = lazy(() => import('@/components/CoverLettersPage'))
const LandingPage = lazy(() => import('@/components/LandingPage'))
const LoginPage = lazy(() => import('@/components/auth/LoginPage'))
const SignUpPage = lazy(() => import('@/components/auth/SignUpPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-[#489FB5]" />
    </div>
  )
}

const NAV_ITEMS = [
  { path: '/', icon: Kanban, label: 'Kanban', shortcut: 'K' },
  { path: '/table', icon: Table, label: 'Table', shortcut: 'T' },
  { path: '/dashboard', icon: BarChart3, label: 'Dashboard', shortcut: 'D' },
  { path: '/calendar', icon: Calendar, label: 'Calendar', shortcut: 'C' },
  { path: '/resumes', icon: FileText, label: 'Resumes', shortcut: 'R' },
  { path: '/cover-letters', icon: FileEdit, label: 'Cover Letters', shortcut: 'L' },
  { path: '/settings', icon: Settings, label: 'Settings', shortcut: 'S' },
]

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return 'system'
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()

  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), [])

  // Apply theme and listen for OS changes when in system mode
  useEffect(() => {
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', isDark)
    }

    applyTheme()
    localStorage.setItem('theme', theme)

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => { if (theme === 'system') applyTheme() }
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [theme])

  const cycleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light')
  }

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
        case 'r': e.preventDefault(); navigate('/resumes'); break
        case 'l': e.preventDefault(); navigate('/cover-letters'); break
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
        {/* User info + Sign Out */}
        <div className="p-3 border-t border-[hsl(var(--border))]">
          {sidebarOpen ? (
            <div className="space-y-2">
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate" title={user?.email || ''}>
                {user?.email}
              </p>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center p-2 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
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
            <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mb-2">{user?.email}</p>
              <button onClick={signOut} className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
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
            <Button variant="ghost" size="icon" onClick={cycleTheme} className="h-8 w-8" title={`Theme: ${theme}`}>
              {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={() => setAddModalOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Application</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<KanbanBoard searchQuery={searchQuery} refreshKey={refreshKey} onRefresh={triggerRefresh} />} />
                <Route path="/table" element={<TableView searchQuery={searchQuery} refreshKey={refreshKey} onRefresh={triggerRefresh} />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/resumes" element={<ResumeManager />} />
                <Route path="/cover-letters" element={<CoverLettersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/application/:id" element={<ApplicationDetail onRefresh={triggerRefresh} />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <AddApplicationModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onCreated={triggerRefresh} />
      <WelcomeModal />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
