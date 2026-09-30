/**
 * Web API client — mirrors the shape of window.api from the Electron preload.
 * Every page component calls window.api.namespace.method(args).
 * In web mode window.api is undefined, so this module patches it globally.
 */

const BASE = '/api'

// ─── HTTP helpers ─────────────────────────────────────────────────────

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('ceim-auth')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    // Clear stored auth on 401
    localStorage.removeItem('ceim-auth')
    window.location.href = '/'
    return { success: false, error: 'Session expired' }
  }

  return res.json()
}

async function uploadFile(
  path: string,
  formData: FormData
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })
  return res.json()
}

const get = (path: string) => request('GET', path)
const post = (path: string, body?: unknown) => request('POST', path, body)
const put = (path: string, body?: unknown) => request('PUT', path, body)
const del = (path: string) => request('DELETE', path)

// ─── Query builder ────────────────────────────────────────────────────

function qs(params?: Record<string, unknown>): string {
  if (!params) return ''
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return q ? `?${q}` : ''
}

// ─── API namespace object (matches window.api shape exactly) ──────────

export const api = {
  auth: {
    login: (creds: { username: string; password: string }) => post('/auth/login', creds),
    logout: () => post('/auth/logout'),
    getCurrentUser: () => get('/auth/me'),
    changePassword: (data: { currentPassword: string; newPassword: string }) => post('/auth/change-password', data),
  },

  users: {
    getAll: () => get('/users'),
    getById: (id: number) => get(`/users/${id}`),
    create: (data: unknown) => post('/users', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/users/${id}`, data),
    delete: (id: number) => del(`/users/${id}`),
    resetPassword: ({ id, newPassword }: { id: number; newPassword: string }) => post(`/users/${id}/reset-password`, { newPassword }),
  },

  institutes: {
    getAll: (filters?: { search?: string; status?: string }) => get(`/institutes${qs(filters)}`),
    getById: (id: number) => get(`/institutes/${id}`),
    create: (data: unknown) => post('/institutes', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/institutes/${id}`, data),
    delete: (id: number) => del(`/institutes/${id}`),
    getStats: (id: number) => get(`/institutes/${id}/stats`),
  },

  locations: {
    getAll: (filters?: { instituteId?: number; status?: string }) => get(`/locations${qs(filters)}`),
    getByInstitute: (instituteId: number) => get(`/locations/by-institute/${instituteId}`),
    getById: (id: number) => get(`/locations/${id}`),
    create: (data: unknown) => post('/locations', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/locations/${id}`, data),
    delete: (id: number) => del(`/locations/${id}`),
  },

  departments: {
    getAll: () => get('/departments'),
    getByInstitute: (instituteId: number) => get(`/departments/by-institute/${instituteId}`),
    getById: (id: number) => get(`/departments/${id}`),
    create: (data: unknown) => post('/departments', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/departments/${id}`, data),
    delete: (id: number) => del(`/departments/${id}`),
  },

  modules: {
    getAll: (filters?: { status?: string }) => get(`/modules${qs(filters)}`),
    getById: (id: number) => get(`/modules/${id}`),
    create: (data: unknown) => post('/modules', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/modules/${id}`, data),
    delete: (id: number) => del(`/modules/${id}`),
  },

  assignments: {
    getAll: () => get('/assignments'),
    getCurrent: () => get('/assignments/current'),
    getById: (id: number) => get(`/assignments/${id}`),
    create: (data: unknown) => post('/assignments', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/assignments/${id}`, data),
  },

  activities: {
    create: (data: unknown) => post('/activities', data),
    getAll: (filters?: Record<string, unknown>) => get(`/activities${qs(filters)}`),
    getToday: () => get('/activities/today'),
    getByDate: (date: string) => get(`/activities/by-date/${date}`),
    getById: (id: number) => get(`/activities/${id}`),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/activities/${id}`, data),
    delete: (id: number) => del(`/activities/${id}`),
  },

  visits: {
    getAll: (filters?: Record<string, unknown>) => get(`/visits${qs(filters)}`),
    getById: (id: number) => get(`/visits/${id}`),
    create: (data: unknown) => post('/visits', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/visits/${id}`, data),
    delete: (id: number) => del(`/visits/${id}`),
  },

  audits: {
    getAll: (filters?: Record<string, unknown>) => get(`/audits${qs(filters)}`),
    getById: (id: number) => get(`/audits/${id}`),
    create: (data: unknown) => post('/audits', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/audits/${id}`, data),
    delete: (id: number) => del(`/audits/${id}`),
    getAdoptionMatrix: () => get('/audits/adoption-matrix'),
    getInstituteAdoption: (id: number) => get(`/audits/${id}/institute-adoption`),
  },

  adoption: {
    getAll: (filters?: Record<string, unknown>) => get(`/adoption${qs(filters)}`),
    getMatrix: () => get('/adoption/matrix'),
    upsert: (data: unknown) => post('/adoption/upsert', data),
  },

  training: {
    getAll: (filters?: Record<string, unknown>) => get(`/training${qs(filters)}`),
    getById: (id: number) => get(`/training/${id}`),
    create: (data: unknown) => post('/training', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/training/${id}`, data),
    delete: (id: number) => del(`/training/${id}`),
    getParticipants: (sessionId: number) => get(`/training/${sessionId}/participants`),
    addParticipants: ({ sessionId, participants }: { sessionId: number; participants: unknown[] }) => post(`/training/${sessionId}/participants`, { participants }),
    updateParticipant: ({ id, data }: { id: number; data: unknown }) => put(`/training/participants/${id}`, data),
    deleteParticipant: (id: number) => del(`/training/participants/${id}`),
  },

  painAreas: {
    getAll: (filters?: Record<string, unknown>) => get(`/pain-areas${qs(filters)}`),
    getById: (id: number) => get(`/pain-areas/${id}`),
    create: (data: unknown) => post('/pain-areas', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/pain-areas/${id}`, data),
    delete: (id: number) => del(`/pain-areas/${id}`),
  },

  issues: {
    getAll: (filters?: Record<string, unknown>) => get(`/issues${qs(filters)}`),
    getById: (id: number) => get(`/issues/${id}`),
    create: (data: unknown) => post('/issues', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/issues/${id}`, data),
    changeStatus: ({ id, status, resolution }: { id: number; status: string; resolution?: string }) => post(`/issues/${id}/change-status`, { status, resolution }),
    delete: (id: number) => del(`/issues/${id}`),
  },

  requirements: {
    getAll: (filters?: Record<string, unknown>) => get(`/requirements${qs(filters)}`),
    getById: (id: number) => get(`/requirements/${id}`),
    getPipelineStats: () => get('/requirements/pipeline-stats'),
    create: (data: unknown) => post('/requirements', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/requirements/${id}`, data),
    advanceStatus: ({ id, toStatus, notes }: { id: number; toStatus: string; notes?: string }) => post(`/requirements/${id}/advance-status`, { toStatus, notes }),
    saveEstimation: ({ id, data }: { id: number; data: unknown }) => post(`/requirements/${id}/estimation`, data),
    saveApproval: ({ id, data }: { id: number; data: unknown }) => post(`/requirements/${id}/approval`, data),
    createSprint: ({ id, data }: { id: number; data: unknown }) => post(`/requirements/${id}/sprint`, data),
    addUatRecord: (data: unknown) => post('/requirements/uat-record', data),
    getHistory: (id: number) => get(`/requirements/${id}/history`),
    getUat: (id: number) => get(`/requirements/${id}/uat`),
    delete: (id: number) => del(`/requirements/${id}`),
  },

  implementations: {
    getAll: (filters?: Record<string, unknown>) => get(`/implementations${qs(filters)}`),
    getById: (id: number) => get(`/implementations/${id}`),
    create: (data: unknown) => post('/implementations', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/implementations/${id}`, data),
    delete: (id: number) => del(`/implementations/${id}`),
    getTasks: (implId: number) => get(`/implementations/${implId}/tasks`),
    saveTask: (data: unknown) => post('/implementations/tasks', data),
    deleteTask: (id: number) => del(`/implementations/tasks/${id}`),
  },

  pendingModules: {
    getAll: (filters?: Record<string, unknown>) => get(`/implementations/pending-modules${qs(filters)}`),
    create: (data: unknown) => post('/implementations/pending-modules', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/implementations/pending-modules/${id}`, data),
    delete: (id: number) => del(`/implementations/pending-modules/${id}`),
  },

  meetings: {
    getAll: (filters?: Record<string, unknown>) => get(`/meetings${qs(filters)}`),
    getById: (id: number) => get(`/meetings/${id}`),
    create: (data: unknown) => post('/meetings', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/meetings/${id}`, data),
    delete: (id: number) => del(`/meetings/${id}`),
  },

  actions: {
    getAll: (filters?: Record<string, unknown>) => get(`/actions${qs(filters)}`),
    getById: (id: number) => get(`/actions/${id}`),
    getOverdue: () => get('/actions/overdue'),
    create: (data: unknown) => post('/actions', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/actions/${id}`, data),
    complete: ({ id, remarks }: { id: number; remarks?: string }) => post(`/actions/${id}/complete`, { remarks }),
    delete: (id: number) => del(`/actions/${id}`),
  },

  risks: {
    getAll: (filters?: Record<string, unknown>) => get(`/risks${qs(filters)}`),
    getById: (id: number) => get(`/risks/${id}`),
    create: (data: unknown) => post('/risks', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/risks/${id}`, data),
    delete: (id: number) => del(`/risks/${id}`),
  },

  dependencies: {
    getAll: (filters?: Record<string, unknown>) => get(`/misc/dependencies${qs(filters)}`),
    create: (data: unknown) => post('/misc/dependencies', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/misc/dependencies/${id}`, data),
    delete: (id: number) => del(`/misc/dependencies/${id}`),
  },

  compliance: {
    getAll: () => get('/misc/compliance'),
    getById: (id: number) => get(`/misc/compliance/${id}`),
    create: (data: unknown) => post('/misc/compliance', data),
    update: ({ id, data }: { id: number; data: unknown }) => put(`/misc/compliance/${id}`, data),
    delete: (id: number) => del(`/misc/compliance/${id}`),
  },

  dashboard: {
    getKPIs: () => get('/dashboard/kpis'),
    getAttentionItems: () => get('/dashboard/attention-items'),
    getMyWorkToday: () => get('/dashboard/my-work-today'),
    getInstituteEngagement: () => get('/dashboard/institute-engagement'),
    getBenchmarkAdoption: () => get('/dashboard/benchmark-adoption'),
    getRequirementPipeline: () => get('/dashboard/requirement-pipeline'),
    getImplementationProgress: () => get('/dashboard/implementation-progress'),
    getModuleAdoptionStats: () => get('/dashboard/module-adoption-stats'),
    getTrainingSummary: () => get('/dashboard/training-summary'),
    getMonthlyTrend: () => get('/dashboard/monthly-trend'),
    getCalendarEvents: (params?: { from?: string; to?: string }) => get(`/dashboard/calendar-events${qs(params)}`),
  },

  reports: {
    getData: (params: Record<string, unknown>) => post('/reports/data', params),
    getBaselineMetrics: () => get('/reports/baseline-metrics'),
    saveBaselineMetric: (data: unknown) => post('/reports/baseline-metrics', data),
    getBeforeAfterComparison: () => get('/reports/before-after'),
    generateExcel: (params: unknown) => post('/reports/generate-excel', params),
    generatePDF: (_params: unknown) => Promise.resolve({ success: false, error: 'PDF: download Excel and save as PDF' }),
  },

  settings: {
    getAll: () => get('/settings'),
    get: (key: string) => get(`/settings/${key}`),
    set: (key: string, value: unknown) => post('/settings/set', { key, value }),
    setMany: (settings: Record<string, unknown>) => post('/settings/set-many', settings),
  },

  backup: {
    create: () => post('/backup/create'),
    listBackups: () => get('/backup/list'),
    // In web mode, restore is done by downloading the file then re-uploading
    selectRestoreFile: () => Promise.resolve({ success: false, error: 'Use download link to get backup file' }),
    downloadUrl: (filename: string) => `${BASE}/backup/download/${filename}`,
  },

  importExport: {
    export: () => post('/backup/create'),
    import: (_data: unknown) => Promise.resolve({ success: false, error: 'Not implemented' }),
  },

  attachments: {
    upload: async ({ relatedType, relatedId, files }: { relatedType: string; relatedId: number; files: FileList | File[] }) => {
      const formData = new FormData()
      const fileArray = Array.from(files)
      fileArray.forEach(f => formData.append('files', f))
      return uploadFile(`/attachments/upload?relatedType=${relatedType}&relatedId=${relatedId}`, formData)
    },
    getByRecord: ({ relatedType, relatedId }: { relatedType: string; relatedId: number }) =>
      get(`/attachments?relatedType=${relatedType}&relatedId=${relatedId}`),
    open: (_id: number) => Promise.resolve({ success: false, error: 'Use browser to download files in web mode' }),
    delete: (id: number) => del(`/attachments/${id}`),
  },

  auditLogs: {
    getAll: (filters?: Record<string, unknown>) => get(`/audit-logs${qs(filters)}`),
  },

  notifications: {
    getAll: () => get('/notifications'),
    getUnread: () => get('/notifications/unread'),
    markRead: (id: number) => post(`/notifications/${id}/mark-read`),
    markAllRead: () => post('/notifications/mark-all-read'),
  },

  app: {
    getVersion: () => Promise.resolve({ success: true, data: '1.0.0-web' }),
    openExternal: (url: string) => { window.open(url, '_blank'); return Promise.resolve({ success: true }) },
    minimize: () => Promise.resolve({ success: true }),
    maximize: () => Promise.resolve({ success: true }),
    close: () => Promise.resolve({ success: true }),
  },
}

// Patch window.api for backward compatibility with all page components
if (typeof window !== 'undefined' && !window.api) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).api = api
}

export default api
