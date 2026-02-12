const BASE = '/api';

async function request(url: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res;
}

export const api = {
  // Applications
  getApplications: async (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return (await request(`/applications${query}`)).json();
  },
  getCalendarEvents: async () => (await request('/applications/calendar-events')).json(),
  getApplication: async (id: number) => (await request(`/applications/${id}`)).json(),
  createApplication: async (data: any) => (await request('/applications', { method: 'POST', body: JSON.stringify(data) })).json(),
  updateApplication: async (id: number, data: any) => (await request(`/applications/${id}`, { method: 'PUT', body: JSON.stringify(data) })).json(),
  deleteApplication: async (id: number) => (await request(`/applications/${id}`, { method: 'DELETE' })).json(),
  updateStatus: async (id: number, status: string, notes?: string) => (await request(`/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) })).json(),
  bulkDelete: async (ids: number[]) => (await request('/applications/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) })).json(),
  bulkStatus: async (ids: number[], status: string) => (await request('/applications/bulk-status', { method: 'POST', body: JSON.stringify({ ids, status }) })).json(),

  // Parsing
  parseUrl: async (url: string) => (await request('/parse/url', { method: 'POST', body: JSON.stringify({ url }) })).json(),
  parseText: async (text: string) => (await request('/parse/text', { method: 'POST', body: JSON.stringify({ text }) })).json(),

  // Tags
  getTags: async () => (await request('/tags')).json(),
  createTag: async (name: string) => (await request('/tags', { method: 'POST', body: JSON.stringify({ name }) })).json(),
  deleteTag: async (id: number) => (await request(`/tags/${id}`, { method: 'DELETE' })).json(),
  updateTag: async (id: number, name: string) => (await request(`/tags/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })).json(),
  mergeTags: async (sourceId: number, targetId: number) => (await request('/tags/merge', { method: 'POST', body: JSON.stringify({ sourceId, targetId }) })).json(),

  // Stats
  getStats: async (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return (await request(`/stats${query}`)).json();
  },

  // Export/Import
  exportCsv: async () => {
    const res = await fetch(`${BASE}/export/csv`);
    return res.blob();
  },
  exportJson: async () => {
    const res = await fetch(`${BASE}/export/json`);
    return res.blob();
  },
  importCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/import/csv`, { method: 'POST', body: formData });
    return res.json();
  },

  // Settings
  getApiKeyStatus: async () => (await request('/settings/api-key-status')).json(),
  setApiKey: async (apiKey: string) => (await request('/settings/api-key', { method: 'POST', body: JSON.stringify({ apiKey }) })).json(),
  clearData: async () => (await request('/settings/clear-data', { method: 'POST' })).json(),
};
