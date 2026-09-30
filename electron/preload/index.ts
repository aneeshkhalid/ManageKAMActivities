import { contextBridge, ipcRenderer } from 'electron'

// ─── Typed IPC Bridge ─────────────────────────────────────────
// This is the ONLY way the renderer can communicate with main process.
// All channels use namespace:action pattern.

const api = {
  // ── Auth ──────────────────────────────────────────────────────
  auth: {
    login: (args: { username: string; password: string }) =>
      ipcRenderer.invoke('auth:login', args),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    changePassword: (args: { currentPassword: string; newPassword: string }) =>
      ipcRenderer.invoke('auth:changePassword', args),
  },

  // ── Users ─────────────────────────────────────────────────────
  users: {
    getAll: (filters?: object) => ipcRenderer.invoke('users:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('users:getById', id),
    create: (data: object) => ipcRenderer.invoke('users:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('users:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('users:delete', id),
    resetPassword: (id: number, newPassword: string) =>
      ipcRenderer.invoke('users:resetPassword', { id, newPassword }),
  },

  // ── Institutes ────────────────────────────────────────────────
  institutes: {
    getAll: (filters?: object) => ipcRenderer.invoke('institutes:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('institutes:getById', id),
    create: (data: object) => ipcRenderer.invoke('institutes:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('institutes:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('institutes:delete', id),
    getStats: (id: number) => ipcRenderer.invoke('institutes:getStats', id),
  },

  // ── Locations ─────────────────────────────────────────────────
  locations: {
    getAll: (filters?: object) => ipcRenderer.invoke('locations:getAll', filters),
    getByInstitute: (instituteId: number) => ipcRenderer.invoke('locations:getByInstitute', instituteId),
    getById: (id: number) => ipcRenderer.invoke('locations:getById', id),
    create: (data: object) => ipcRenderer.invoke('locations:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('locations:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('locations:delete', id),
  },

  // ── Departments ───────────────────────────────────────────────
  departments: {
    getAll: (filters?: object) => ipcRenderer.invoke('departments:getAll', filters),
    getByInstitute: (instituteId: number) => ipcRenderer.invoke('departments:getByInstitute', instituteId),
    getById: (id: number) => ipcRenderer.invoke('departments:getById', id),
    create: (data: object) => ipcRenderer.invoke('departments:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('departments:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('departments:delete', id),
  },

  // ── Modules ───────────────────────────────────────────────────
  modules: {
    getAll: (filters?: object) => ipcRenderer.invoke('modules:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('modules:getById', id),
    create: (data: object) => ipcRenderer.invoke('modules:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('modules:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('modules:delete', id),
  },

  // ── Assignments ───────────────────────────────────────────────
  assignments: {
    getAll: () => ipcRenderer.invoke('assignments:getAll'),
    getById: (id: number) => ipcRenderer.invoke('assignments:getById', id),
    create: (data: object) => ipcRenderer.invoke('assignments:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('assignments:update', { id, data }),
    getCurrent: () => ipcRenderer.invoke('assignments:getCurrent'),
  },

  // ── Daily Activities (Primary Entry Point) ────────────────────
  activities: {
    create: (data: object) => ipcRenderer.invoke('activities:create', data),
    getAll: (filters?: object) => ipcRenderer.invoke('activities:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('activities:getById', id),
    update: (id: number, data: object) => ipcRenderer.invoke('activities:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('activities:delete', id),
    getToday: () => ipcRenderer.invoke('activities:getToday'),
    getByDate: (date: string) => ipcRenderer.invoke('activities:getByDate', date),
  },

  // ── Visits ────────────────────────────────────────────────────
  visits: {
    getAll: (filters?: object) => ipcRenderer.invoke('visits:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('visits:getById', id),
    create: (data: object) => ipcRenderer.invoke('visits:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('visits:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('visits:delete', id),
  },

  // ── Audits ────────────────────────────────────────────────────
  audits: {
    getAll: (filters?: object) => ipcRenderer.invoke('audits:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('audits:getById', id),
    create: (data: object) => ipcRenderer.invoke('audits:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('audits:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('audits:delete', id),
    getAdoptionMatrix: (filters?: object) => ipcRenderer.invoke('audits:getAdoptionMatrix', filters),
    getInstituteAdoption: (instituteId: number) => ipcRenderer.invoke('audits:getInstituteAdoption', instituteId),
  },

  // ── Module Adoption ───────────────────────────────────────────
  adoption: {
    getAll: (filters?: object) => ipcRenderer.invoke('adoption:getAll', filters),
    upsert: (data: object) => ipcRenderer.invoke('adoption:upsert', data),
    getMatrix: (filters?: object) => ipcRenderer.invoke('adoption:getMatrix', filters),
  },

  // ── Training ─────────────────────────────────────────────────
  training: {
    getSessions: (filters?: object) => ipcRenderer.invoke('training:getSessions', filters),
    getSessionById: (id: number) => ipcRenderer.invoke('training:getSessionById', id),
    createSession: (data: object) => ipcRenderer.invoke('training:createSession', data),
    updateSession: (id: number, data: object) => ipcRenderer.invoke('training:updateSession', { id, data }),
    deleteSession: (id: number) => ipcRenderer.invoke('training:deleteSession', id),
    getParticipants: (sessionId: number) => ipcRenderer.invoke('training:getParticipants', sessionId),
    addParticipants: (sessionId: number, participants: object[]) =>
      ipcRenderer.invoke('training:addParticipants', { sessionId, participants }),
    updateParticipant: (id: number, data: object) => ipcRenderer.invoke('training:updateParticipant', { id, data }),
    removeParticipant: (id: number) => ipcRenderer.invoke('training:removeParticipant', id),
  },

  // ── Pain Areas ────────────────────────────────────────────────
  painAreas: {
    getAll: (filters?: object) => ipcRenderer.invoke('painAreas:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('painAreas:getById', id),
    create: (data: object) => ipcRenderer.invoke('painAreas:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('painAreas:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('painAreas:delete', id),
  },

  // ── Issues ────────────────────────────────────────────────────
  issues: {
    getAll: (filters?: object) => ipcRenderer.invoke('issues:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('issues:getById', id),
    create: (data: object) => ipcRenderer.invoke('issues:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('issues:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('issues:delete', id),
    changeStatus: (id: number, status: string, resolution?: string) =>
      ipcRenderer.invoke('issues:changeStatus', { id, status, resolution }),
  },

  // ── Requirements ─────────────────────────────────────────────
  requirements: {
    getAll: (filters?: object) => ipcRenderer.invoke('requirements:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('requirements:getById', id),
    create: (data: object) => ipcRenderer.invoke('requirements:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('requirements:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('requirements:delete', id),
    advanceStatus: (id: number, toStatus: string, notes?: string) =>
      ipcRenderer.invoke('requirements:advanceStatus', { id, toStatus, notes }),
    getHistory: (id: number) => ipcRenderer.invoke('requirements:getHistory', id),
    saveEstimation: (requirementId: number, data: object) =>
      ipcRenderer.invoke('requirements:saveEstimation', { requirementId, data }),
    saveApproval: (requirementId: number, data: object) =>
      ipcRenderer.invoke('requirements:saveApproval', { requirementId, data }),
    saveSprint: (requirementId: number, data: object) =>
      ipcRenderer.invoke('requirements:saveSprint', { requirementId, data }),
    getUATRecords: (requirementId: number) => ipcRenderer.invoke('requirements:getUATRecords', requirementId),
    saveUATRecord: (data: object) => ipcRenderer.invoke('requirements:saveUATRecord', data),
    getPipelineStats: () => ipcRenderer.invoke('requirements:getPipelineStats'),
  },

  // ── Implementations ───────────────────────────────────────────
  implementations: {
    getAll: (filters?: object) => ipcRenderer.invoke('implementations:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('implementations:getById', id),
    create: (data: object) => ipcRenderer.invoke('implementations:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('implementations:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('implementations:delete', id),
    getTasks: (implementationId: number) => ipcRenderer.invoke('implementations:getTasks', implementationId),
    upsertTask: (data: object) => ipcRenderer.invoke('implementations:upsertTask', data),
    deleteTask: (id: number) => ipcRenderer.invoke('implementations:deleteTask', id),
  },

  // ── Pending Modules ───────────────────────────────────────────
  pendingModules: {
    getAll: (filters?: object) => ipcRenderer.invoke('pendingModules:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('pendingModules:getById', id),
    create: (data: object) => ipcRenderer.invoke('pendingModules:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('pendingModules:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('pendingModules:delete', id),
  },

  // ── Leadership Meetings ───────────────────────────────────────
  meetings: {
    getAll: (filters?: object) => ipcRenderer.invoke('meetings:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('meetings:getById', id),
    create: (data: object) => ipcRenderer.invoke('meetings:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('meetings:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('meetings:delete', id),
  },

  // ── Compliance ────────────────────────────────────────────────
  compliance: {
    getAll: (filters?: object) => ipcRenderer.invoke('compliance:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('compliance:getById', id),
    create: (data: object) => ipcRenderer.invoke('compliance:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('compliance:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('compliance:delete', id),
  },

  // ── Actions ───────────────────────────────────────────────────
  actions: {
    getAll: (filters?: object) => ipcRenderer.invoke('actions:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('actions:getById', id),
    create: (data: object) => ipcRenderer.invoke('actions:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('actions:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('actions:delete', id),
    complete: (id: number, remarks?: string) => ipcRenderer.invoke('actions:complete', { id, remarks }),
    getOverdue: () => ipcRenderer.invoke('actions:getOverdue'),
  },

  // ── Risks ─────────────────────────────────────────────────────
  risks: {
    getAll: (filters?: object) => ipcRenderer.invoke('risks:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('risks:getById', id),
    create: (data: object) => ipcRenderer.invoke('risks:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('risks:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('risks:delete', id),
  },

  // ── Dependencies ──────────────────────────────────────────────
  dependencies: {
    getAll: (filters?: object) => ipcRenderer.invoke('dependencies:getAll', filters),
    create: (data: object) => ipcRenderer.invoke('dependencies:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('dependencies:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('dependencies:delete', id),
  },

  // ── Dashboard ─────────────────────────────────────────────────
  dashboard: {
    getKPIs: (filters?: object) => ipcRenderer.invoke('dashboard:getKPIs', filters),
    getAttentionItems: () => ipcRenderer.invoke('dashboard:getAttentionItems'),
    getMyWorkToday: () => ipcRenderer.invoke('dashboard:getMyWorkToday'),
    getInstituteEngagement: (filters?: object) => ipcRenderer.invoke('dashboard:getInstituteEngagement', filters),
    getBenchmarkAdoption: (filters?: object) => ipcRenderer.invoke('dashboard:getBenchmarkAdoption', filters),
    getModuleAdoptionStats: (filters?: object) => ipcRenderer.invoke('dashboard:getModuleAdoptionStats', filters),
    getRequirementPipeline: () => ipcRenderer.invoke('dashboard:getRequirementPipeline'),
    getImplementationProgress: (filters?: object) => ipcRenderer.invoke('dashboard:getImplementationProgress', filters),
    getTrainingSummary: (filters?: object) => ipcRenderer.invoke('dashboard:getTrainingSummary', filters),
    getMonthlyTrend: (filters?: object) => ipcRenderer.invoke('dashboard:getMonthlyTrend', filters),
    getCalendarEvents: (from: string, to: string) => ipcRenderer.invoke('dashboard:getCalendarEvents', { from, to }),
  },

  // ── Reports ───────────────────────────────────────────────────
  reports: {
    generatePDF: (params: object) => ipcRenderer.invoke('reports:generatePDF', params),
    generateExcel: (params: object) => ipcRenderer.invoke('reports:generateExcel', params),
    getData: (params: object) => ipcRenderer.invoke('reports:getData', params),
    getBaselineMetrics: () => ipcRenderer.invoke('reports:getBaselineMetrics'),
    saveBaselineMetric: (data: object) => ipcRenderer.invoke('reports:saveBaselineMetric', data),
    getBeforeAfterComparison: () => ipcRenderer.invoke('reports:getBeforeAfterComparison'),
  },

  // ── Settings ─────────────────────────────────────────────────
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', { key, value }),
    setMany: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:setMany', settings),
  },

  // ── Backup & Restore ─────────────────────────────────────────
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (filePath: string) => ipcRenderer.invoke('backup:restore', filePath),
    selectRestoreFile: () => ipcRenderer.invoke('backup:selectRestoreFile'),
    listBackups: () => ipcRenderer.invoke('backup:listBackups'),
  },

  // ── Import / Export ───────────────────────────────────────────
  importExport: {
    importExcel: (type: string, filePath: string) => ipcRenderer.invoke('importExport:importExcel', { type, filePath }),
    exportExcel: (type: string, filters?: object) => ipcRenderer.invoke('importExport:exportExcel', { type, filters }),
    selectFile: () => ipcRenderer.invoke('importExport:selectFile'),
    downloadTemplate: (type: string) => ipcRenderer.invoke('importExport:downloadTemplate', type),
  },

  // ── Attachments ───────────────────────────────────────────────
  attachments: {
    upload: (relatedType: string, relatedId: number) =>
      ipcRenderer.invoke('attachments:upload', { relatedType, relatedId }),
    getByRecord: (relatedType: string, relatedId: number) =>
      ipcRenderer.invoke('attachments:getByRecord', { relatedType, relatedId }),
    open: (id: number) => ipcRenderer.invoke('attachments:open', id),
    delete: (id: number) => ipcRenderer.invoke('attachments:delete', id),
  },

  // ── Audit Logs ────────────────────────────────────────────────
  auditLogs: {
    getAll: (filters?: object) => ipcRenderer.invoke('auditLogs:getAll', filters),
  },

  // ── Notifications ─────────────────────────────────────────────
  notifications: {
    getAll: () => ipcRenderer.invoke('notifications:getAll'),
    getUnread: () => ipcRenderer.invoke('notifications:getUnread'),
    markRead: (id: number) => ipcRenderer.invoke('notifications:markRead', id),
    markAllRead: () => ipcRenderer.invoke('notifications:markAllRead'),
  },

  // ── App ───────────────────────────────────────────────────────
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
    selectDirectory: () => ipcRenderer.invoke('app:selectDirectory'),
    showInFolder: (filePath: string) => ipcRenderer.invoke('app:showInFolder', filePath),
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
  }
}

// Expose typed API to renderer
contextBridge.exposeInMainWorld('api', api)

// Type declaration for renderer usage (referenced in renderer via window.api)
export type ElectronAPI = typeof api
