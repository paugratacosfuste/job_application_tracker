import { useState, useEffect } from 'react'
import { Select } from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Resume } from '@/types'

interface Props {
  value: string | null | undefined
  onChange: (resumeId: string | null) => void
  className?: string
}

export default function ResumePicker({ value, onChange, className }: Props) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadResumes()
  }, [])

  const loadResumes = async () => {
    try {
      const data = await api.getResumes()
      setResumes(data)

      // If no value is set, pre-select the default resume
      if (!value && data.length > 0) {
        const defaultResume = data.find(r => r.is_default)
        if (defaultResume) {
          onChange(defaultResume.id)
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoaded(true)
    }
  }

  if (!loaded) return null

  return (
    <Select
      value={value || ''}
      onChange={e => {
        const newVal = e.target.value || null
        onChange(newVal)
        // Record usage when a resume is selected
        if (newVal) {
          api.recordResumeUsage(newVal).catch(() => {})
        }
      }}
      className={className}
    >
      <option value="">No resume selected</option>
      {resumes.map(r => (
        <option key={r.id} value={r.id}>
          {r.label} (v{r.version}){r.is_default ? ' ★' : ''}
        </option>
      ))}
    </Select>
  )
}
