import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Key, Download, Upload, Trash2, Tag, Sun, Moon, Monitor, Pencil, AlertTriangle, FileDown, FileUp, Database } from 'lucide-react'
import type { Tag as TagType } from '@/types'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [apiKeyStatus, setApiKeyStatus] = useState<{ configured: boolean; masked: string | null }>({ configured: false, masked: null })
  const [tags, setTags] = useState<TagType[]>([])
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editTagName, setEditTagName] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system')
  const [importLoading, setImportLoading] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  useEffect(() => {
    loadApiKeyStatus()
    loadTags()
  }, [])

  const loadApiKeyStatus = async () => {
    try {
      const status = await api.getApiKeyStatus()
      setApiKeyStatus(status)
    } catch (err) {
      // silently fail
    }
  }

  const loadTags = async () => {
    try {
      const data = await api.getTags()
      setTags(data)
    } catch (err) {
      toast.error('Failed to load tags')
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return
    try {
      await api.setApiKey(apiKey.trim())
      toast.success('API key saved')
      setApiKey('')
      loadApiKeyStatus()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save API key')
    }
  }

  const handleExportCsv = async () => {
    try {
      const blob = await api.exportCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'applications.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported')
    } catch (err) {
      toast.error('Failed to export CSV')
    }
  }

  const handleExportJson = async () => {
    try {
      const blob = await api.exportJson()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'applications.json'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('JSON exported')
    } catch (err) {
      toast.error('Failed to export JSON')
    }
  }

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    try {
      const result = await api.importCsv(file)
      toast.success(`Imported ${result.imported} applications`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to import')
    } finally {
      setImportLoading(false)
      e.target.value = ''
    }
  }

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to delete ALL application data? This cannot be undone.')) return
    if (!confirm('This will permanently delete all applications, tags, and history. Continue?')) return
    try {
      await api.clearData()
      toast.success('All data cleared')
      loadTags()
    } catch (err) {
      toast.error('Failed to clear data')
    }
  }

  const handleDeleteTag = async (id: string) => {
    try {
      await api.deleteTag(id)
      setTags(prev => prev.filter(t => t.id !== id))
      toast.success('Tag deleted')
    } catch (err) {
      toast.error('Failed to delete tag')
    }
  }

  const handleUpdateTag = async (id: string) => {
    const trimmed = editTagName.trim()
    if (!trimmed) return
    // Check for duplicate
    const duplicate = tags.find(t => t.name.toLowerCase() === trimmed.toLowerCase() && t.id !== id)
    if (duplicate) {
      toast.error(`Tag "${trimmed}" already exists. Tags must be unique.`)
      return
    }
    try {
      await api.updateTag(id, trimmed)
      setTags(prev => prev.map(t => t.id === id ? { ...t, name: trimmed } : t))
      setEditingTag(null)
      toast.success('Tag updated')
    } catch (err) {
      toast.error('Failed to update tag')
    }
  }

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim()
    if (!trimmed) return
    // Check for duplicate
    const duplicate = tags.find(t => t.name.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) {
      toast.error(`Tag "${trimmed}" already exists. Tags must be unique.`)
      return
    }
    try {
      const newTag = await api.createTag(trimmed)
      setTags(prev => [...prev, newTag])
      setNewTagName('')
      toast.success('Tag created')
    } catch (err: any) {
      toast.error(err.message || 'Failed to create tag')
    }
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', isDark)
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Key className="h-4 w-4" /> Anthropic API Key</CardTitle>
          <CardDescription>Required for AI-powered job description parsing (URL and text parsing)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {apiKeyStatus.configured && (
            <p className="text-sm text-[#7CB518]">
              ✓ API key configured: {apiKeyStatus.masked}
            </p>
          )}
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveApiKey} disabled={!apiKey.trim()}>Save</Button>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Your API key is stored securely in your user settings. It is used only for AI-powered job parsing.
          </p>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { value: 'light', icon: Sun, label: 'Light' },
              { value: 'dark', icon: Moon, label: 'Dark' },
              { value: 'system', icon: Monitor, label: 'System' },
            ].map(({ value, icon: Icon, label }) => (
              <Button
                key={value}
                variant={theme === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange(value)}
                className="gap-1.5"
              >
                <Icon className="h-4 w-4" /> {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Data Management</CardTitle>
          <CardDescription>Export, import, or reset your application data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Export */}
          <div>
            <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">Export</h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
              Download all your applications as a file. CSV is great for spreadsheets (Excel, Google Sheets). JSON preserves all data structure for backups.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <FileDown className="h-4 w-4 mr-1" /> Export as CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJson}>
                <FileDown className="h-4 w-4 mr-1" /> Export as JSON
              </Button>
            </div>
          </div>

          {/* Import */}
          <div>
            <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">Import</h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
              Import applications from a CSV file. New applications will be added — existing data won't be overwritten. The CSV should have headers matching the field names (company_name, job_title, etc.).
            </p>
            <div className="relative inline-block">
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCsv}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={importLoading}
              />
              <Button variant="outline" size="sm" disabled={importLoading}>
                <FileUp className="h-4 w-4 mr-1" /> Import from CSV
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-[hsl(var(--border))] pt-4">
            <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Danger Zone
            </h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
              Permanently delete all applications, tags, status history, and related data. This cannot be undone. Consider exporting your data first.
            </p>
            <Button variant="destructive" size="sm" onClick={handleClearData}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tags Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Tag className="h-4 w-4" /> Tags Management</CardTitle>
          <CardDescription>{tags.length} tag{tags.length !== 1 ? 's' : ''} — Tags are auto-created when added to applications. Duplicates are not allowed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add new tag */}
          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder="Create a new tag..."
              className="flex-1 h-8 text-sm"
              onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
            />
            <Button size="sm" className="h-8" onClick={handleCreateTag} disabled={!newTagName.trim()}>
              Add Tag
            </Button>
          </div>

          {tags.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))] py-2">No tags yet. Tags are created when you add them to applications.</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-[hsl(var(--muted))]/50">
                  {editingTag === tag.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editTagName}
                        onChange={e => setEditTagName(e.target.value)}
                        className="h-7 text-sm"
                        onKeyDown={e => e.key === 'Enter' && handleUpdateTag(tag.id)}
                        autoFocus
                      />
                      <Button size="sm" className="h-7" onClick={() => handleUpdateTag(tag.id)}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingTag(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{tag.name}</Badge>
                        {tag.usage_count !== undefined && (
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">{tag.usage_count} use{tag.usage_count !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingTag(tag.id); setEditTagName(tag.name) }}
                          className="p-1 hover:bg-[hsl(var(--accent))] rounded"
                          title="Rename tag"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                          title="Delete tag"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Keyboard Shortcuts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['N', 'New application'],
              ['K', 'Kanban view'],
              ['T', 'Table view'],
              ['D', 'Dashboard'],
              ['C', 'Calendar view'],
              ['R', 'Resumes'],
              ['S', 'Settings'],
              ['/', 'Focus search'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="text-xs font-mono bg-[hsl(var(--muted))] px-2 py-0.5 rounded border border-[hsl(var(--border))]">{key}</kbd>
                <span className="text-[hsl(var(--muted-foreground))]">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
