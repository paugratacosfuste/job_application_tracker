import { supabase } from './supabase'
import type { Application, Tag, Resume, CoverLetter } from '@/types'

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// Helper to flatten application_tags nested structure into tag_names and tags
function flattenApplication(app: any): Application {
  const tags: Tag[] = (app.application_tags || [])
    .map((at: any) => at.tags)
    .filter(Boolean)
  const tag_names = tags.map(t => t.name).join(',')
  return { ...app, tags, tag_names }
}

export const api = {
  // ========== Applications ==========

  getApplications: async (params?: Record<string, string>) => {
    let query = supabase
      .from('applications')
      .select('*, application_tags(tag_id, tags(id, name, user_id))')
      .order('date_added', { ascending: false })

    if (params?.search) {
      query = query.or(`company_name.ilike.%${params.search}%,job_title.ilike.%${params.search}%,notes.ilike.%${params.search}%`)
    }
    if (params?.status) {
      query = query.eq('status', params.status)
    }
    if (params?.priority) {
      query = query.eq('priority', params.priority)
    }
    if (params?.work_mode) {
      query = query.eq('work_mode', params.work_mode)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []).map(flattenApplication)
  },

  getCalendarEvents: async () => {
    const { data, error } = await supabase
      .from('applications')
      .select('*, application_tags(tag_id, tags(id, name, user_id)), status_history(*)')
      .order('date_added', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(flattenApplication)
  },

  getApplication: async (id: string) => {
    const { data, error } = await supabase
      .from('applications')
      .select('*, application_tags(tag_id, tags(id, name, user_id)), status_history(*)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return flattenApplication(data)
  },

  createApplication: async (formData: any) => {
    const userId = await getCurrentUserId()
    const { tags: tagNames, tag_names, application_tags, status_history, ...data } = formData

    // Clean up empty strings to nulls
    const cleaned: any = { ...data, user_id: userId }
    for (const key of Object.keys(cleaned)) {
      if (cleaned[key] === '') cleaned[key] = null
    }
    // Ensure required fields
    if (!cleaned.company_name || !cleaned.job_title) throw new Error('Company name and job title are required')

    const { data: newApp, error } = await supabase
      .from('applications')
      .insert(cleaned)
      .select()
      .single()
    if (error) throw new Error(error.message)

    // Log initial status
    await supabase.from('status_history').insert({
      application_id: newApp.id,
      user_id: userId,
      from_status: null,
      to_status: newApp.status || 'saved',
      notes: 'Application created',
    })

    // Handle tags
    if (tagNames && Array.isArray(tagNames)) {
      for (const tagName of tagNames) {
        if (!tagName.trim()) continue
        // Upsert tag
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('user_id', userId)
          .eq('name', tagName.trim())
          .maybeSingle()

        let tagId: string
        if (existingTag) {
          tagId = existingTag.id
        } else {
          const { data: newTag, error: tagError } = await supabase
            .from('tags')
            .insert({ name: tagName.trim(), user_id: userId })
            .select('id')
            .single()
          if (tagError) continue
          tagId = newTag.id
        }

        await supabase.from('application_tags').insert({
          application_id: newApp.id,
          tag_id: tagId,
        })
      }
    }

    return newApp
  },

  updateApplication: async (id: string, formData: any) => {
    const userId = await getCurrentUserId()
    const { tags: tagNames, tag_names, application_tags, status_history, id: _id, user_id: _uid, ...data } = formData

    // Clean empty strings
    const cleaned: any = { ...data }
    for (const key of Object.keys(cleaned)) {
      if (cleaned[key] === '') cleaned[key] = null
    }

    const { data: updated, error } = await supabase
      .from('applications')
      .update(cleaned)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)

    // Handle tags if provided
    if (tagNames && Array.isArray(tagNames)) {
      // Remove existing tags
      await supabase.from('application_tags').delete().eq('application_id', id)

      // Re-add tags
      for (const tagName of tagNames) {
        if (!tagName.trim()) continue
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('user_id', userId)
          .eq('name', tagName.trim())
          .maybeSingle()

        let tagId: string
        if (existingTag) {
          tagId = existingTag.id
        } else {
          const { data: newTag, error: tagError } = await supabase
            .from('tags')
            .insert({ name: tagName.trim(), user_id: userId })
            .select('id')
            .single()
          if (tagError) continue
          tagId = newTag.id
        }

        await supabase.from('application_tags').insert({
          application_id: id,
          tag_id: tagId,
        })
      }
    }

    return updated
  },

  deleteApplication: async (id: string) => {
    const { error } = await supabase.from('applications').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  },

  updateStatus: async (id: string, status: string, notes?: string) => {
    const userId = await getCurrentUserId()

    // Get current status
    const { data: current, error: fetchError } = await supabase
      .from('applications')
      .select('status, date_applied')
      .eq('id', id)
      .single()
    if (fetchError) throw new Error(fetchError.message)

    const fromStatus = current.status

    // Update application status
    const updateData: any = { status }
    if (status === 'applied' && !current.date_applied) {
      updateData.date_applied = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)

    // Insert status history
    await supabase.from('status_history').insert({
      application_id: id,
      user_id: userId,
      from_status: fromStatus,
      to_status: status,
      notes: notes || null,
    })

    return updated
  },

  bulkDelete: async (ids: string[]) => {
    const { error } = await supabase.from('applications').delete().in('id', ids)
    if (error) throw new Error(error.message)
    return { success: true, deleted: ids.length }
  },

  bulkStatus: async (ids: string[], status: string) => {
    const userId = await getCurrentUserId()

    for (const id of ids) {
      const { data: current } = await supabase
        .from('applications')
        .select('status')
        .eq('id', id)
        .single()

      if (current) {
        await supabase.from('applications').update({ status }).eq('id', id)
        await supabase.from('status_history').insert({
          application_id: id,
          user_id: userId,
          from_status: current.status,
          to_status: status,
        })
      }
    }

    return { success: true, updated: ids.length }
  },

  // ========== Parsing ==========

  parseUrl: async (url: string, cvText?: string) => {
    const { data, error } = await supabase.functions.invoke('parse-job', {
      body: { type: 'url', content: url, cv_text: cvText || undefined },
    })
    if (error) throw new Error(error.message || 'Failed to parse URL')
    if (data?.error) throw new Error(data.error)
    return data
  },

  parseText: async (text: string, cvText?: string) => {
    const { data, error } = await supabase.functions.invoke('parse-job', {
      body: { type: 'text', content: text, cv_text: cvText || undefined },
    })
    if (error) throw new Error(error.message || 'Failed to parse text')
    if (data?.error) throw new Error(data.error)
    return data
  },

  // ========== Tags ==========

  getTags: async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*, application_tags(count)')
      .order('name')
    if (error) throw new Error(error.message)
    return (data || []).map((tag: any) => ({
      ...tag,
      usage_count: tag.application_tags?.[0]?.count || 0,
    }))
  },

  createTag: async (name: string) => {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, user_id: userId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { ...data, usage_count: 0 }
  },

  deleteTag: async (id: string) => {
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  },

  updateTag: async (id: string, name: string) => {
    const { error } = await supabase.from('tags').update({ name }).eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  },

  mergeTags: async (sourceId: string, targetId: string) => {
    const { data: appTags } = await supabase
      .from('application_tags')
      .select('application_id')
      .eq('tag_id', sourceId)

    if (appTags) {
      for (const at of appTags) {
        const { data: existing } = await supabase
          .from('application_tags')
          .select('application_id')
          .eq('application_id', at.application_id)
          .eq('tag_id', targetId)
          .maybeSingle()

        if (!existing) {
          await supabase.from('application_tags').insert({
            application_id: at.application_id,
            tag_id: targetId,
          })
        }
      }
    }

    await supabase.from('tags').delete().eq('id', sourceId)
    return { success: true }
  },

  // ========== Stats ==========

  getStats: async (params?: Record<string, string>) => {
    let query = supabase
      .from('applications')
      .select('*, application_tags(tag_id, tags(id, name, user_id)), status_history(*)')
      .order('date_added', { ascending: false })

    if (params?.from) {
      query = query.gte('date_added', params.from)
    }
    if (params?.to) {
      query = query.lte('date_added', params.to)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const { calculateStats } = await import('./statsCalculator')
    return calculateStats((data || []).map(flattenApplication))
  },

  // ========== Export/Import ==========

  exportCsv: async () => {
    const { data, error } = await supabase
      .from('applications')
      .select('*, application_tags(tag_id, tags(id, name, user_id)), resumes(label)')
      .order('date_added', { ascending: false })
    if (error) throw new Error(error.message)

    const apps = (data || []).map(flattenApplication)
    if (apps.length === 0) throw new Error('No applications to export')

    const headers = [
      'company_name', 'company_website', 'company_size', 'job_title', 'job_url',
      'job_description_raw', 'salary_min', 'salary_max', 'salary_currency', 'salary_not_specified',
      'compensation_type', 'location_city', 'location_country', 'work_mode',
      'status', 'date_applied', 'date_added', 'match_score', 'source',
      'contact_name', 'contact_email', 'contact_role', 'notes', 'priority',
      'follow_up_date', 'resume_version', 'resume_label', 'cover_letter_notes', 'tags'
    ]

    const csvRows = [headers.join(',')]
    for (const app of apps) {
      const values = headers.map(h => {
        if (h === 'tags') return (app.tag_names || '').replace(/"/g, '""')
        if (h === 'resume_label') return (app as any).resumes?.label || ''
        const val = (app as any)[h]
        if (val === null || val === undefined) return ''
        if (typeof val === 'boolean') return val ? 'true' : 'false'
        const str = String(val).replace(/"/g, '""')
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
      })
      csvRows.push(values.join(','))
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    return blob
  },

  exportJson: async () => {
    const { data, error } = await supabase
      .from('applications')
      .select('*, application_tags(tag_id, tags(id, name, user_id))')
      .order('date_added', { ascending: false })
    if (error) throw new Error(error.message)
    const apps = (data || []).map(flattenApplication)
    const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' })
    return blob
  },

  importCsv: async (file: File) => {
    const userId = await getCurrentUserId()
    const content = await file.text()
    const lines = content.split('\n').filter(l => l.trim())

    if (lines.length < 2) throw new Error('CSV file is empty or has no data rows')

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const allowedFields = [
      'company_name', 'company_website', 'company_size', 'job_title', 'job_url',
      'job_description_raw', 'salary_min', 'salary_max', 'salary_currency', 'salary_not_specified',
      'compensation_type', 'location_city', 'location_country', 'work_mode',
      'status', 'date_applied', 'match_score', 'source', 'contact_name',
      'contact_email', 'contact_role', 'notes', 'priority', 'follow_up_date',
      'resume_version', 'cover_letter_notes', 'tags'
    ]

    let imported = 0

    for (let i = 1; i < lines.length; i++) {
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of lines[i]) {
        if (char === '"') { inQuotes = !inQuotes; continue }
        if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
        current += char
      }
      values.push(current.trim())

      const row: any = { user_id: userId }
      const tagNames: string[] = []

      headers.forEach((h, idx) => {
        if (h === 'tags' && values[idx]) {
          tagNames.push(...values[idx].split(',').map(t => t.trim()).filter(Boolean))
        } else if (allowedFields.includes(h) && values[idx]) {
          row[h] = values[idx]
        }
      })

      if (!row.company_name || !row.job_title) continue

      if (row.salary_min) row.salary_min = parseInt(row.salary_min)
      if (row.salary_max) row.salary_max = parseInt(row.salary_max)
      if (row.match_score) row.match_score = parseInt(row.match_score)
      if (row.salary_not_specified) row.salary_not_specified = row.salary_not_specified === 'true'

      const { data: newApp, error } = await supabase
        .from('applications')
        .insert(row)
        .select('id')
        .single()
      if (error || !newApp) continue

      for (const tagName of tagNames) {
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('user_id', userId)
          .eq('name', tagName)
          .maybeSingle()

        let tagId: string
        if (existingTag) {
          tagId = existingTag.id
        } else {
          const { data: newTag, error: tagError } = await supabase
            .from('tags')
            .insert({ name: tagName, user_id: userId })
            .select('id')
            .single()
          if (tagError) continue
          tagId = newTag.id
        }

        await supabase.from('application_tags').insert({
          application_id: newApp.id,
          tag_id: tagId,
        })
      }

      imported++
    }

    return { success: true, imported }
  },

  // ========== Resumes ==========

  getResumes: async (): Promise<Resume[]> => {
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  },

  getResume: async (id: string): Promise<Resume> => {
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  uploadResume: async (file: File, label: string, parentId?: string, tags?: string[], notes?: string): Promise<Resume> => {
    const userId = await getCurrentUserId()
    const ext = file.name.split('.').pop() || 'pdf'
    const storagePath = `${userId}/${Date.now()}_${file.name}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(storagePath, file, { contentType: file.type })
    if (uploadError) throw new Error(uploadError.message)

    // Determine version number
    let version = 1
    if (parentId) {
      const { data: parent } = await supabase
        .from('resumes')
        .select('version')
        .eq('id', parentId)
        .single()
      if (parent) version = (parent.version || 1) + 1
    }

    // Check if this is the first resume (auto-set as default)
    const { count } = await supabase
      .from('resumes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    const isFirst = (count || 0) === 0

    // Insert record
    const { data, error } = await supabase
      .from('resumes')
      .insert({
        user_id: userId,
        label,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type || 'application/pdf',
        version,
        parent_id: parentId || null,
        is_default: isFirst,
        tags: tags || [],
        notes: notes || null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  updateResume: async (id: string, updates: { label?: string; tags?: string[]; notes?: string }): Promise<Resume> => {
    const { data, error } = await supabase
      .from('resumes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  deleteResume: async (id: string) => {
    // Get the storage path first
    const { data: resume } = await supabase
      .from('resumes')
      .select('storage_path')
      .eq('id', id)
      .single()

    // Delete from storage
    if (resume?.storage_path) {
      await supabase.storage.from('resumes').remove([resume.storage_path])
    }

    // Delete record
    const { error } = await supabase.from('resumes').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  },

  setDefaultResume: async (id: string) => {
    const { error } = await supabase.rpc('set_default_resume', { p_resume_id: id })
    if (error) throw new Error(error.message)
    return { success: true }
  },

  recordResumeUsage: async (id: string) => {
    const { error } = await supabase.rpc('record_resume_usage', { p_resume_id: id })
    if (error) throw new Error(error.message)
    return { success: true }
  },

  getResumeSignedUrl: async (storagePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('resumes')
      .createSignedUrl(storagePath, 3600) // 1 hour
    if (error) throw new Error(error.message)
    return data.signedUrl
  },

  // ========== Cover Letters ==========

  getCoverLetters: async (applicationId?: string): Promise<CoverLetter[]> => {
    let query = supabase
      .from('cover_letters')
      .select('*')
      .order('created_at', { ascending: false })
    if (applicationId) {
      query = query.eq('application_id', applicationId)
    }
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data || []
  },

  createCoverLetter: async (coverLetter: {
    label: string
    content?: string
    application_id?: string
    resume_id?: string
  }): Promise<CoverLetter> => {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase
      .from('cover_letters')
      .insert({ ...coverLetter, user_id: userId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  updateCoverLetter: async (id: string, updates: { label?: string; content?: string; generated_text?: string }): Promise<CoverLetter> => {
    const { data, error } = await supabase
      .from('cover_letters')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  deleteCoverLetter: async (id: string) => {
    const { error } = await supabase.from('cover_letters').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  },

  // ========== Settings ==========

  getApiKeyStatus: async () => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('anthropic_api_key')
      .single()
    if (error) return { configured: false, masked: null }
    const key = data?.anthropic_api_key
    return {
      configured: !!key,
      masked: key ? key.slice(0, 10) + '...' + key.slice(-4) : null,
    }
  },

  setApiKey: async (apiKey: string) => {
    const userId = await getCurrentUserId()
    const { error } = await supabase
      .from('user_settings')
      .update({ anthropic_api_key: apiKey })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { success: true }
  },

  deleteApiKey: async () => {
    const userId = await getCurrentUserId()
    const { error } = await supabase
      .from('user_settings')
      .update({ anthropic_api_key: null })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { success: true }
  },

  // ========== Master CV ==========

  getMasterCV: async () => {
    const { data, error } = await supabase
      .from('master_cvs')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  },

  uploadMasterCV: async (file: File, extractedText?: string) => {
    const userId = await getCurrentUserId()

    // Deactivate existing active CV
    await supabase
      .from('master_cvs')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true)

    const storagePath = `${userId}/${Date.now()}_${file.name}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('master-cvs')
      .upload(storagePath, file, { contentType: file.type })
    if (uploadError) throw new Error(uploadError.message)

    // Insert record
    const { data, error } = await supabase
      .from('master_cvs')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type || 'application/pdf',
        extracted_text: extractedText || null,
        is_active: true,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  updateMasterCVText: async (id: string, extractedText: string) => {
    const { data, error } = await supabase
      .from('master_cvs')
      .update({ extracted_text: extractedText })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  deleteMasterCV: async (id: string) => {
    const { data: cv } = await supabase
      .from('master_cvs')
      .select('file_path')
      .eq('id', id)
      .single()

    if (cv?.file_path) {
      await supabase.storage.from('master-cvs').remove([cv.file_path])
    }

    const { error } = await supabase.from('master_cvs').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { success: true }
  },

  // ========== AI Functions ==========

  analyzeMatch: async (applicationId: string) => {
    const { data, error } = await supabase.functions.invoke('analyze-match', {
      body: { application_id: applicationId },
    })
    if (error) throw new Error(error.message || 'Failed to analyze match')
    if (data?.error) throw new Error(data.error)
    return data
  },

  generateCoverLetter: async (applicationId: string, instructions?: string) => {
    const { data, error } = await supabase.functions.invoke('generate-cover', {
      body: { application_id: applicationId, instructions },
    })
    if (error) throw new Error(error.message || 'Failed to generate cover letter')
    if (data?.error) throw new Error(data.error)
    return data
  },

  clearData: async () => {
    await supabase.from('applications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tags').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    return { success: true }
  },
}
