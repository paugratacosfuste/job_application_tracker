import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Link, FileText, PenLine, ArrowLeft, X, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { WORK_MODES, COMPANY_SIZES, COMPENSATION_TYPES, SOURCES, PRIORITIES } from '@/lib/constants'
import { COUNTRIES } from '@/lib/countries'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types'
import ResumePicker from '@/components/ResumePicker'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const EMPTY_FORM = {
  company_name: '',
  company_website: '',
  company_size: '',
  job_title: '',
  job_url: '',
  job_description_raw: '',
  salary_min: '',
  salary_max: '',
  salary_currency: 'EUR',
  compensation_type: '',
  location_city: '',
  location_country: '',
  work_mode: '',
  status: 'saved',
  date_applied: '',
  match_score: '',
  source: '',
  contact_name: '',
  contact_email: '',
  contact_role: '',
  notes: '',
  priority: 'medium',
  follow_up_date: '',
  resume_version: '',
  cover_letter_notes: '',
  salary_not_specified: false,
  tags: '',
}

export default function AddApplicationModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [inputMode, setInputMode] = useState<'url' | 'text' | null>(null)
  const [url, setUrl] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set())
  const [confidence, setConfidence] = useState<{ extracted: number; total: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [existingTags, setExistingTags] = useState<Tag[]>([])
  const [tagInput, setTagInput] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [resumeId, setResumeId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadTags()
    } else {
      resetAll()
    }
  }, [open])

  const resetAll = () => {
    setStep(1)
    setInputMode(null)
    setUrl('')
    setPasteText('')
    setForm({ ...EMPTY_FORM })
    setAutoFilled(new Set())
    setConfidence(null)
    setSelectedTags([])
    setTagInput('')
    setCountrySearch('')
    setResumeId(null)
  }

  const loadTags = async () => {
    try {
      const tags = await api.getTags()
      setExistingTags(tags)
    } catch {}
  }

  const applyParsedData = (parsed: any, rawText: string, fieldsExtracted: number, totalFields: number, sourceUrl?: string) => {
    const newForm = { ...EMPTY_FORM }
    const filled = new Set<string>()

    const map: Record<string, string> = {
      company_name: 'company_name',
      job_title: 'job_title',
      salary_min: 'salary_min',
      salary_max: 'salary_max',
      salary_currency: 'salary_currency',
      compensation_type: 'compensation_type',
      location_city: 'location_city',
      location_country: 'location_country',
      work_mode: 'work_mode',
      company_size: 'company_size',
    }

    for (const [parseKey, formKey] of Object.entries(map)) {
      if (parsed[parseKey] && parsed[parseKey] !== null) {
        (newForm as any)[formKey] = String(parsed[parseKey])
        filled.add(formKey)
      }
    }

    if (parsed.requirements && Array.isArray(parsed.requirements)) {
      setSelectedTags(parsed.requirements)
      filled.add('tags')
    }

    if (parsed.description_summary) {
      newForm.notes = parsed.description_summary
      filled.add('notes')
    }

    if (rawText) {
      newForm.job_description_raw = rawText
      filled.add('job_description_raw')
    }

    if (sourceUrl) {
      newForm.job_url = sourceUrl
      filled.add('job_url')
    }

    // Try to match country to dropdown
    if (newForm.location_country) {
      const match = COUNTRIES.find(c => c.toLowerCase() === newForm.location_country.toLowerCase())
      if (match) {
        newForm.location_country = match
      }
      setCountrySearch(newForm.location_country)
    }

    setForm(newForm)
    setAutoFilled(filled)
    setConfidence({ extracted: fieldsExtracted, total: totalFields })
    setStep(2)
  }

  const handleParseUrl = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      const result = await api.parseUrl(url.trim())
      applyParsedData(result.parsed, result.raw_text, result.fields_extracted, result.total_fields, result.source_url)
      toast.success('Job posting parsed successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse URL')
    } finally {
      setLoading(false)
    }
  }

  const handleParseText = async () => {
    if (!pasteText.trim()) return
    setLoading(true)
    try {
      const result = await api.parseText(pasteText.trim())
      applyParsedData(result.parsed, result.raw_text, result.fields_extracted, result.total_fields)
      toast.success('Job description parsed successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse text')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipToManual = () => {
    setForm({ ...EMPTY_FORM })
    setAutoFilled(new Set())
    setConfidence(null)
    setSelectedTags([])
    setStep(2)
  }

  const updateForm = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = (tagName: string) => {
    const trimmed = tagName.trim()
    if (!trimmed || selectedTags.includes(trimmed)) return
    setSelectedTags(prev => [...prev, trimmed])
    setTagInput('')
  }

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tagName))
  }

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES

  const handleSubmit = async () => {
    if (!form.company_name.trim() || !form.job_title.trim()) {
      toast.error('Company name and job title are required')
      return
    }
    setSubmitting(true)
    try {
      const data: any = { ...form }
      if (data.salary_min) data.salary_min = parseInt(data.salary_min)
      else delete data.salary_min
      if (data.salary_max) data.salary_max = parseInt(data.salary_max)
      else delete data.salary_max
      if (data.match_score) data.match_score = parseInt(data.match_score)
      else delete data.match_score

      delete data.tags

      for (const key of Object.keys(data)) {
        if (data[key] === '') delete data[key]
      }

      data.tags = selectedTags.filter(Boolean)
      if (resumeId) data.resume_id = resumeId

      await api.createApplication(data)
      toast.success('Application created successfully')
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create application')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (field: string) => autoFilled.has(field) ? 'ring-2 ring-[#7CB518]/50 bg-[#A1C181]/5' : ''

  // Suggested tags: existing tags not already selected
  const suggestedTags = existingTags
    .filter(t => !selectedTags.includes(t.name))
    .filter(t => !tagInput || t.name.toLowerCase().includes(tagInput.toLowerCase()))
    .slice(0, 12)

  const renderStep1 = () => (
    <div className="space-y-5 py-2">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        How would you like to add this application?
      </p>

      {/* URL Input */}
      <div className={cn(
        "border rounded-lg p-4 transition-all cursor-pointer hover:border-[#489FB5]",
        inputMode === 'url' ? 'border-[#489FB5] bg-[#489FB5]/5' : 'border-[hsl(var(--border))]'
      )} onClick={() => setInputMode('url')}>
        <div className="flex items-center gap-2 mb-2">
          <Link className="h-4 w-4 text-[#489FB5]" />
          <span className="text-sm font-medium">Paste a Job URL</span>
        </div>
        {inputMode === 'url' && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              We'll scrape the page and extract job details using AI.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://www.linkedin.com/jobs/view/..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && handleParseUrl()}
                autoFocus
              />
              <Button onClick={handleParseUrl} disabled={loading || !url.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Parse'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Text Input */}
      <div className={cn(
        "border rounded-lg p-4 transition-all cursor-pointer hover:border-[#489FB5]",
        inputMode === 'text' ? 'border-[#489FB5] bg-[#489FB5]/5' : 'border-[hsl(var(--border))]'
      )} onClick={() => setInputMode('text')}>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-[#FFA62B]" />
          <span className="text-sm font-medium">Paste Job Description</span>
        </div>
        {inputMode === 'text' && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Paste the full job description text and we'll extract structured data using AI.
            </p>
            <Textarea
              placeholder="Paste the full job description here..."
              rows={6}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              autoFocus
            />
            <Button onClick={handleParseText} disabled={loading || !pasteText.trim()} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Parse Description
            </Button>
          </div>
        )}
      </div>

      {/* Skip to manual */}
      <div
        className="border border-dashed rounded-lg p-4 transition-all cursor-pointer hover:border-[#489FB5] border-[hsl(var(--border))] text-center"
        onClick={handleSkipToManual}
      >
        <div className="flex items-center justify-center gap-2">
          <PenLine className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Skip to Manual Entry</span>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          Fill in all the details yourself
        </p>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4 mt-2">
      {/* Back button */}
      <button
        onClick={() => { setStep(1); setAutoFilled(new Set()); setConfidence(null) }}
        className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to input method
      </button>

      {confidence && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#A1C181]/10 border border-[#7CB518]/30">
          <Check className="h-4 w-4 text-[#7CB518]" />
          <div className="text-sm">
            <span className="font-medium text-[#7CB518]">
              {confidence.extracted}/{confidence.total} fields extracted
            </span>
            <span className="text-[hsl(var(--muted-foreground))] ml-2">
              Green-highlighted fields were auto-filled
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Company Name *</label>
          <Input className={fieldClass('company_name')} value={form.company_name} onChange={e => updateForm('company_name', e.target.value)} placeholder="Company name" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Job Title *</label>
          <Input className={fieldClass('job_title')} value={form.job_title} onChange={e => updateForm('job_title', e.target.value)} placeholder="Job title" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Company Website</label>
          <Input className={fieldClass('company_website')} value={form.company_website} onChange={e => updateForm('company_website', e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Company Size</label>
          <Select className={fieldClass('company_size')} value={form.company_size} onChange={e => updateForm('company_size', e.target.value)}>
            <option value="">Select...</option>
            {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Job URL</label>
          <Input className={fieldClass('job_url')} value={form.job_url} onChange={e => updateForm('job_url', e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Source <span className="text-[10px] text-[hsl(var(--muted-foreground))]">(optional)</span></label>
          <Select value={form.source} onChange={e => updateForm('source', e.target.value)}>
            <option value="">Select...</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Salary Min</label>
          <Input className={fieldClass('salary_min')} type="number" value={form.salary_min} onChange={e => updateForm('salary_min', e.target.value)} placeholder="e.g. 50000" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Salary Max</label>
          <Input className={fieldClass('salary_max')} type="number" value={form.salary_max} onChange={e => updateForm('salary_max', e.target.value)} placeholder="e.g. 80000" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="salary_not_specified"
            checked={form.salary_not_specified === true}
            onChange={e => updateForm('salary_not_specified', e.target.checked)}
            className="rounded border-[hsl(var(--border))]"
          />
          <label htmlFor="salary_not_specified" className="text-xs text-[hsl(var(--muted-foreground))]">
            Salary not specified in job posting
          </label>
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Currency</label>
          <Input className={fieldClass('salary_currency')} value={form.salary_currency} onChange={e => updateForm('salary_currency', e.target.value)} placeholder="EUR" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Compensation Type</label>
          <Select className={fieldClass('compensation_type')} value={form.compensation_type} onChange={e => updateForm('compensation_type', e.target.value)}>
            <option value="">Select...</option>
            {COMPENSATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">City</label>
          <Input className={fieldClass('location_city')} value={form.location_city} onChange={e => updateForm('location_city', e.target.value)} placeholder="City" />
        </div>
        {/* Country dropdown with search */}
        <div className="relative">
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Country</label>
          <Input
            className={fieldClass('location_country')}
            value={countrySearch || form.location_country}
            onChange={e => {
              setCountrySearch(e.target.value)
              updateForm('location_country', e.target.value)
              setShowCountryDropdown(true)
            }}
            onFocus={() => setShowCountryDropdown(true)}
            onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
            placeholder="Search country..."
          />
          {showCountryDropdown && filteredCountries.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredCountries.slice(0, 20).map(country => (
                <button
                  key={country}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-[hsl(var(--accent))] transition-colors"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    updateForm('location_country', country)
                    setCountrySearch(country)
                    setShowCountryDropdown(false)
                  }}
                >
                  {country}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Work Mode</label>
          <Select className={fieldClass('work_mode')} value={form.work_mode} onChange={e => updateForm('work_mode', e.target.value)}>
            <option value="">Select...</option>
            {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Status</label>
          <Select value={form.status} onChange={e => updateForm('status', e.target.value)}>
            <option value="saved">Saved</option>
            <option value="applied">Applied</option>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Priority</label>
          <Select value={form.priority} onChange={e => updateForm('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Match Score (1-5)</label>
          <Input type="number" min="1" max="5" value={form.match_score} onChange={e => updateForm('match_score', e.target.value)} placeholder="1-5" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Contact Name</label>
          <Input value={form.contact_name} onChange={e => updateForm('contact_name', e.target.value)} placeholder="Contact name" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Contact Email</label>
          <Input value={form.contact_email} onChange={e => updateForm('contact_email', e.target.value)} placeholder="email@company.com" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Contact Role</label>
          <Input value={form.contact_role} onChange={e => updateForm('contact_role', e.target.value)} placeholder="Hiring Manager" />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Date Applied</label>
          <Input type="date" value={form.date_applied} onChange={e => updateForm('date_applied', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Follow-up Date</label>
          <Input type="date" value={form.follow_up_date} onChange={e => updateForm('follow_up_date', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Resume</label>
          <ResumePicker value={resumeId} onChange={setResumeId} />
        </div>

        {/* Tags with autocomplete and quick-select chips */}
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Tags</label>
          {/* Selected tags */}
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
            {selectedTags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:bg-black/10 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {/* Tag input */}
          <Input
            className={fieldClass('tags')}
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                handleAddTag(tagInput)
              }
            }}
            placeholder="Type a tag and press Enter..."
          />
          {/* Quick-select existing tags */}
          {suggestedTags.length > 0 && (
            <div className="mt-2">
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Quick add:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {suggestedTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.name)}
                    className="text-xs px-2 py-0.5 rounded-full border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] hover:border-[#489FB5] transition-colors"
                  >
                    + {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Notes</label>
          <Textarea className={fieldClass('notes')} rows={3} value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Notes about this application..." />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Cover Letter Notes</label>
          <Textarea rows={2} value={form.cover_letter_notes} onChange={e => updateForm('cover_letter_notes', e.target.value)} placeholder="Key points for cover letter..." />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Job Description</label>
          <Textarea className={fieldClass('job_description_raw')} rows={4} value={form.job_description_raw} onChange={e => updateForm('job_description_raw', e.target.value)} placeholder="Full job description..." />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Application
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Add Application' : 'Review & Save'}
          </DialogTitle>
        </DialogHeader>
        {step === 1 ? renderStep1() : renderStep2()}
      </DialogContent>
    </Dialog>
  )
}
