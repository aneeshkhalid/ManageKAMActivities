// ============================================================
// CEIM Portal – Shared TypeScript Types
// Used by both Electron main process (IPC handlers)
// and React renderer (via window.api bridge)
// ============================================================

// ─── Auth ────────────────────────────────────────────────────
export type UserRole = 'admin' | 'portfolio_manager' | 'management' | 'user'
export type UserStatus = 'active' | 'inactive'

export interface User {
  id: number
  username: string
  fullName: string
  email: string | null
  role: UserRole
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface AuthSession {
  user: User
  loginAt: string
}

// ─── Common ──────────────────────────────────────────────────
export type RAGStatus = 'green' | 'amber' | 'red' | 'grey'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type Status = 'active' | 'inactive' | 'archived'
export type RecordStatus = 'open' | 'in_progress' | 'completed' | 'overdue' | 'cancelled' | 'closed' | 'on_hold'

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  validationErrors?: Record<string, string>
}

// ─── Filters ─────────────────────────────────────────────────
export interface CommonFilters extends PaginationParams {
  search?: string
  instituteId?: number
  locationId?: number
  deptId?: number
  moduleId?: number
  status?: string
  priority?: string
  ragStatus?: RAGStatus
  dateFrom?: string
  dateTo?: string
  owner?: string
}

// ─── Master Data ─────────────────────────────────────────────
export type InstituteType = 'School' | 'Education Group' | 'Training Centre' | 'Corporate' | 'Other'

export interface Institute {
  id: number
  code: string
  name: string
  type: InstituteType
  org: string | null
  description: string | null
  status: string
  primaryContact: string | null
  email: string | null
  phone: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Location {
  id: number
  instituteId: number
  instituteName?: string
  name: string
  city: string | null
  emirate: string | null
  address: string | null
  contactPerson: string | null
  contactNumber: string | null
  email: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Department {
  id: number
  instituteId: number
  locationId: number | null
  instituteName?: string
  locationName?: string
  name: string
  head: string | null
  contact: string | null
  status: string
  createdAt: string
}

export interface Module {
  id: number
  code: string
  name: string
  product: string | null
  category: string | null
  description: string | null
  status: string
  owner: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// ─── Assignment ───────────────────────────────────────────────
export interface Assignment {
  id: number
  name: string
  startDate: string
  endDate: string
  objectives: string[]
  assignedPerson: string
  sponsor: string | null
  status: string
  createdAt: string
  updatedAt: string
}

// ─── Daily Activity ───────────────────────────────────────────
export type ActivityType =
  | 'institute_visit'
  | 'training_session'
  | 'benchmark_audit'
  | 'issue_identified'
  | 'requirement_captured'
  | 'pain_area_identified'
  | 'leadership_meeting'
  | 'action_created'
  | 'implementation_update'
  | 'uat_activity'
  | 'follow_up'
  | 'support'
  | 'documentation'
  | 'other'

export interface DailyActivity {
  id: number
  date: string
  instituteId: number | null
  locationId: number | null
  deptId: number | null
  moduleId: number | null
  activityType: ActivityType
  description: string
  peopleMet: string | null
  findings: string | null
  relatedId: number | null
  relatedType: string | null
  actionRequired: string | null
  owner: string | null
  dueDate: string | null
  status: string
  remarks: string | null
  createdBy: number | null
  createdAt: string
  updatedAt: string
  // Joined
  instituteName?: string
  locationName?: string
  moduleName?: string
}

export interface CreateDailyActivityInput {
  date: string
  instituteId?: number | null
  locationId?: number | null
  deptId?: number | null
  moduleId?: number | null
  activityType: ActivityType
  description: string
  peopleMet?: string | null
  findings?: string | null
  actionRequired?: string | null
  owner?: string | null
  dueDate?: string | null
  remarks?: string | null
  // Sub-form data for auto-routing
  visitData?: CreateVisitInput
  trainingData?: CreateTrainingInput
  auditData?: CreateAuditInput
  issueData?: CreateIssueInput
  requirementData?: CreateRequirementInput
  painAreaData?: CreatePainAreaInput
  meetingData?: CreateMeetingInput
  actionData?: CreateActionInput
}

// ─── Institute Visit ─────────────────────────────────────────
export interface InstituteVisit {
  id: number
  visitDate: string
  instituteId: number
  locationId: number | null
  purpose: string
  participants: string | null
  modulesDiscussed: string | null
  findings: string | null
  painAreasNoted: string | null
  trainingRequired: string | null
  nextVisitDate: string | null
  remarks: string | null
  status: string
  dailyActivityId: number | null
  createdBy: number | null
  createdAt: string
  updatedAt: string
  // Joined
  instituteName?: string
  locationName?: string
}

export interface CreateVisitInput {
  visitDate: string
  instituteId: number
  locationId?: number | null
  purpose: string
  participants?: string | null
  modulesDiscussed?: string | null
  findings?: string | null
  painAreasNoted?: string | null
  trainingRequired?: string | null
  nextVisitDate?: string | null
  remarks?: string | null
}

// ─── Audit ────────────────────────────────────────────────────
export type UsageStatus = 'fully_used' | 'partially_used' | 'not_used' | 'not_applicable'
export type AdoptionLevel = 'high' | 'medium' | 'low' | 'none'
export type DataQuality = 'good' | 'needs_improvement' | 'poor'
export type TrainingStatus = 'trained' | 'partially_trained' | 'not_trained'

export interface Audit {
  id: number
  auditDate: string
  instituteId: number
  locationId: number | null
  moduleId: number
  usageStatus: UsageStatus
  userAdoption: AdoptionLevel
  dataQuality: DataQuality
  trainingStatus: TrainingStatus
  hasIssues: boolean
  hasRequirements: boolean
  recommendation: string | null
  ragStatus: RAGStatus
  overallScore: number | null
  auditedBy: string | null
  notes: string | null
  dailyActivityId: number | null
  createdAt: string
  updatedAt: string
  // Joined
  instituteName?: string
  locationName?: string
  moduleName?: string
}

export interface CreateAuditInput {
  auditDate: string
  instituteId: number
  locationId?: number | null
  moduleId: number
  usageStatus: UsageStatus
  userAdoption: AdoptionLevel
  dataQuality: DataQuality
  trainingStatus: TrainingStatus
  hasIssues?: boolean
  hasRequirements?: boolean
  recommendation?: string | null
  ragStatus: RAGStatus
  auditedBy?: string | null
  notes?: string | null
}

// ─── Module Adoption ─────────────────────────────────────────
export interface ModuleAdoption {
  id: number
  instituteId: number
  locationId: number | null
  moduleId: number
  isAvailable: boolean
  isConfigured: boolean
  isLive: boolean
  isActivelyUsed: boolean
  userCount: number | null
  lastUsageDate: string | null
  usageFrequency: string | null
  adoptionPct: number | null
  gapDescription: string | null
  actionRequired: string | null
  owner: string | null
  targetDate: string | null
  status: string
  updatedAt: string
  // Joined
  instituteName?: string
  locationName?: string
  moduleName?: string
}

// ─── Training ────────────────────────────────────────────────
export type TrainingType =
  | 'new_user'
  | 'brush_up'
  | 'module_training'
  | 'advanced'
  | 'demo'
  | 'one_to_one'
  | 'group'

export interface TrainingSession {
  id: number
  trainingDate: string
  instituteId: number
  locationId: number | null
  moduleId: number | null
  topic: string
  trainer: string | null
  targetAudience: string | null
  participantCount: number | null
  actualAttendance: number | null
  durationHours: number | null
  trainingType: TrainingType
  feedback: string | null
  issuesRaised: string | null
  followUpRequired: boolean
  nextTrainingDate: string | null
  status: string
  dailyActivityId: number | null
  createdBy: number | null
  createdAt: string
  updatedAt: string
  // Joined
  instituteName?: string
  locationName?: string
  moduleName?: string
  participantsCount?: number
}

export interface CreateTrainingInput {
  trainingDate: string
  instituteId: number
  locationId?: number | null
  moduleId?: number | null
  topic: string
  trainer?: string | null
  targetAudience?: string | null
  participantCount?: number | null
  actualAttendance?: number | null
  durationHours?: number | null
  trainingType: TrainingType
  feedback?: string | null
  issuesRaised?: string | null
  followUpRequired?: boolean
  nextTrainingDate?: string | null
}

export interface TrainingParticipant {
  id: number
  sessionId: number
  participantName: string
  department: string | null
  role: string | null
  attended: boolean
  feedback: string | null
  followUpRequired: boolean
}

// ─── Pain Area ───────────────────────────────────────────────
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type Frequency = 'rarely' | 'sometimes' | 'often' | 'always'

export interface PainArea {
  id: number
  dateIdentified: string
  instituteId: number
  locationId: number | null
  deptId: number | null
  moduleId: number | null
  reportedBy: string | null
  description: string
  businessImpact: string | null
  frequency: Frequency | null
  severity: Severity
  existingWorkaround: string | null
  suggestedSolution: string | null
  relatedRequirementId: number | null
  owner: string | null
  status: string
  dailyActivityId: number | null
  createdAt: string
  updatedAt: string
  // Joined
  instituteName?: string
  locationName?: string
  moduleName?: string
}

export interface CreatePainAreaInput {
  dateIdentified: string
  instituteId: number
  locationId?: number | null
  deptId?: number | null
  moduleId?: number | null
  reportedBy?: string | null
  description: string
  businessImpact?: string | null
  frequency?: Frequency | null
  severity: Severity
  existingWorkaround?: string | null
  suggestedSolution?: string | null
  owner?: string | null
}

// ─── Issue ───────────────────────────────────────────────────
export type IssueCategory =
  | 'functional'
  | 'technical'
  | 'data'
  | 'integration'
  | 'performance'
  | 'user_training'
  | 'configuration'
  | 'access'
  | 'support'
  | 'other'

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'deferred'

export interface Issue {
  id: number
  issueRef: string
  issueDate: string
  instituteId: number
  locationId: number | null
  moduleId: number | null
  description: string
  category: IssueCategory
  priority: Priority
  impact: string | null
  rootCause: string | null
  workaround: string | null
  assignedTo: string | null
  targetDate: string | null
  status: IssueStatus
  resolution: string | null
  closedDate: string | null
  dailyActivityId: number | null
  createdAt: string
  updatedAt: string
  // Joined
  instituteName?: string
  locationName?: string
  moduleName?: string
}

export interface CreateIssueInput {
  issueDate: string
  instituteId: number
  locationId?: number | null
  moduleId?: number | null
  description: string
  category: IssueCategory
  priority: Priority
  impact?: string | null
  rootCause?: string | null
  workaround?: string | null
  assignedTo?: string | null
  targetDate?: string | null
}

// ─── Requirements ─────────────────────────────────────────────
export type RequirementStatus =
  | 'identified'
  | 'documented'
  | 'under_review'
  | 'estimation_pending'
  | 'estimated'
  | 'approval_pending'
  | 'approved'
  | 'rejected'
  | 'deferred'
  | 'sprint_planned'
  | 'development'
  | 'qa'
  | 'uat'
  | 'released'
  | 'closed'

export type RequirementSource =
  | 'visit'
  | 'training'
  | 'audit'
  | 'meeting'
  | 'pain_area'
  | 'issue'
  | 'management'
  | 'direct'
  | 'other'

export interface Requirement {
  id: number
  reqRef: string
  dateIdentified: string
  instituteId: number
  locationId: number | null
  deptId: number | null
  moduleId: number | null
  title: string
  description: string
  businessNeed: string | null
  userImpact: string | null
  businessImpact: string | null
  priority: Priority
  source: RequirementSource
  requestedBy: string | null
  portfolioManager: string | null
  productOwner: string | null
  status: RequirementStatus
  remarks: string | null
  dailyActivityId: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  // Joined
  instituteName?: string
  locationName?: string
  deptName?: string
  moduleName?: string
  estimation?: RequirementEstimation
  approval?: RequirementApproval
  sprint?: Sprint
}

export interface CreateRequirementInput {
  dateIdentified: string
  instituteId: number
  locationId?: number | null
  deptId?: number | null
  moduleId?: number | null
  title: string
  description: string
  businessNeed?: string | null
  userImpact?: string | null
  businessImpact?: string | null
  priority: Priority
  source: RequirementSource
  requestedBy?: string | null
  portfolioManager?: string | null
  productOwner?: string | null
  remarks?: string | null
}

export interface RequirementEstimation {
  id: number
  requirementId: number
  technicalComplexity: 'low' | 'medium' | 'high' | 'very_high'
  devEffortDays: number | null
  qaEffortDays: number | null
  dependencies: string | null
  estimatedSprint: string | null
  estimatedReleaseDate: string | null
  estimator: string | null
  estimationDate: string
  remarks: string | null
}

export interface RequirementApproval {
  id: number
  requirementId: number
  priority: Priority
  businessJustification: string | null
  estimatedEffort: string | null
  impact: string | null
  dependency: string | null
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'deferred'
  approvedBy: string | null
  approvalDate: string | null
  comments: string | null
}

export interface RequirementHistory {
  id: number
  requirementId: number
  fromStatus: RequirementStatus | null
  toStatus: RequirementStatus
  changedBy: string | null
  changedAt: string
  notes: string | null
}

// ─── Sprint / Dev Tracking ───────────────────────────────────
export type SprintStatus = 'planned' | 'development' | 'qa' | 'uat' | 'released' | 'closed'

export interface Sprint {
  id: number
  name: string
  requirementId: number
  devTeam: string | null
  startDate: string | null
  plannedCompletion: string | null
  actualCompletion: string | null
  status: SprintStatus
  developer: string | null
  qaPerson: string | null
  releaseDate: string | null
}

// ─── UAT ─────────────────────────────────────────────────────
export type UatResult = 'pass' | 'fail' | 'blocked' | 'not_tested'

export interface UatRecord {
  id: number
  requirementId: number
  sprintId: number | null
  testCase: string
  testDate: string | null
  tester: string | null
  result: UatResult
  defectDescription: string | null
  retestDate: string | null
  finalStatus: UatResult | null
  clientConfirmation: boolean
  notes: string | null
}

// ─── Implementation ───────────────────────────────────────────
export type ImplStatus =
  | 'not_started'
  | 'planning'
  | 'in_progress'
  | 'blocked'
  | 'uat'
  | 'live'
  | 'completed'
  | 'on_hold'

export type ImplType = 'apex' | 'canteen' | 'store_enhancement' | 'other'

export interface Implementation {
  id: number
  implRef: string
  projectName: string
  implType: ImplType
  instituteId: number
  locationId: number | null
  moduleId: number | null
  startDate: string | null
  targetDate: string | null
  actualCompletion: string | null
  owner: string | null
  status: ImplStatus
  progressPct: number
  dependency: string | null
  riskNotes: string | null
  remarks: string | null
  createdAt: string
  updatedAt: string
  // Joined
  instituteName?: string
  locationName?: string
  moduleName?: string
  tasks?: ImplementationTask[]
}

export interface ImplementationTask {
  id: number
  implementationId: number
  taskName: string
  assignee: string | null
  startDate: string | null
  targetDate: string | null
  actualDate: string | null
  status: string
  notes: string | null
}

// ─── Leadership Meetings ──────────────────────────────────────
export type MeetingCategory =
  | 'teacher_ai'
  | 'principal_mis'
  | 'safetri'
  | 'product_strategy'
  | 'benchmark_adoption'
  | 'finance'
  | 'hr'
  | 'operations'
  | 'other'

export interface LeadershipMeeting {
  id: number
  meetingDate: string
  participants: string | null
  organization: string | null
  category: MeetingCategory
  topic: string
  discussion: string | null
  decisions: string | null
  requirementsIdentified: string | null
  actionItems: string | null
  owner: string | null
  dueDate: string | null
  status: string
  followUpDate: string | null
  dailyActivityId: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateMeetingInput {
  meetingDate: string
  participants?: string | null
  organization?: string | null
  category: MeetingCategory
  topic: string
  discussion?: string | null
  decisions?: string | null
  requirementsIdentified?: string | null
  actionItems?: string | null
  owner?: string | null
  dueDate?: string | null
  followUpDate?: string | null
}

// ─── Action ───────────────────────────────────────────────────
export type ActionStatus = 'open' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'

export interface Action {
  id: number
  actionRef: string
  actionDate: string
  sourceType: string | null
  sourceId: number | null
  instituteId: number | null
  moduleId: number | null
  description: string
  owner: string | null
  priority: Priority
  dueDate: string | null
  status: ActionStatus
  completionDate: string | null
  remarks: string | null
  createdBy: number | null
  createdAt: string
  updatedAt: string
  // Joined
  instituteName?: string
  moduleName?: string
  isOverdue?: boolean
}

export interface CreateActionInput {
  actionDate: string
  sourceType?: string | null
  sourceId?: number | null
  instituteId?: number | null
  moduleId?: number | null
  description: string
  owner?: string | null
  priority: Priority
  dueDate?: string | null
  remarks?: string | null
}

// ─── Risk ──────────────────────────────────────────────────────
export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed'

export interface Risk {
  id: number
  riskRef: string
  description: string
  instituteId: number | null
  project: string | null
  probability: 1 | 2 | 3 | 4 | 5
  impact: 1 | 2 | 3 | 4 | 5
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  mitigation: string | null
  owner: string | null
  dueDate: string | null
  status: RiskStatus
  createdAt: string
  updatedAt: string
  instituteName?: string
}

// ─── Dependency ────────────────────────────────────────────────
export interface Dependency {
  id: number
  description: string
  relatedType: string | null
  relatedId: number | null
  dependencyOn: string
  owner: string | null
  requiredByDate: string | null
  status: string
  impactIfBlocked: string | null
  escalationRequired: boolean
  createdAt: string
}

// ─── Pending Module ────────────────────────────────────────────
export interface PendingModule {
  id: number
  instituteId: number
  locationId: number | null
  moduleId: number
  currentStatus: string | null
  reasonPending: string | null
  dependency: string | null
  actionRequired: string | null
  owner: string | null
  targetDate: string | null
  status: string
  escalationRequired: boolean
  remarks: string | null
  createdAt: string
  updatedAt: string
  instituteName?: string
  locationName?: string
  moduleName?: string
}

// ─── Compliance ────────────────────────────────────────────────
export interface ComplianceItem {
  id: number
  complianceArea: string
  instituteId: number | null
  deptId: number | null
  currentStatus: string
  gapDescription: string | null
  actionRequired: string | null
  owner: string | null
  targetDate: string | null
  evidence: string | null
  status: string
  remarks: string | null
  createdAt: string
  updatedAt: string
  instituteName?: string
}

// ─── Attachment ────────────────────────────────────────────────
export interface Attachment {
  id: number
  relatedType: string
  relatedId: number
  fileName: string
  filePath: string
  fileType: string | null
  fileSizeBytes: number | null
  uploadedBy: number | null
  createdAt: string
}

// ─── Notification ──────────────────────────────────────────────
export interface Notification {
  id: number
  userId: number | null
  type: string
  title: string
  message: string
  relatedType: string | null
  relatedId: number | null
  isRead: boolean
  createdAt: string
}

// ─── Audit Log ────────────────────────────────────────────────
export interface AuditLog {
  id: number
  userId: number | null
  module: string
  recordId: number | null
  action: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
  userName?: string
}

// ─── Settings ─────────────────────────────────────────────────
export interface AppSettings {
  companyName: string
  logoPath: string | null
  assignmentStartDate: string
  assignmentEndDate: string
  defaultCurrency: string
  ragGreenThreshold: number
  ragAmberThreshold: number
  auditScoringWeights: {
    usage: number
    userAdoption: number
    dataQuality: number
    training: number
    issueResolution: number
  }
  reportHeader: string
  reportFooter: string
  backupPath: string
  notificationsEnabled: boolean
}

// ─── Dashboard KPIs ───────────────────────────────────────────
export interface DashboardKPIs {
  totalInstitutes: number
  institutesVisited: number
  locationsCovered: number
  modulesAudited: number
  benchmarkAdoptionPct: number
  trainingSessions: number
  openIssues: number
  openRequirements: number
  requirementsAwaitingApproval: number
  activeImplementations: number
  pendingModules: number
  openActions: number
  overdueActions: number
  openRisks: number
  criticalRisks: number
}

export interface DashboardFilters {
  dateFrom?: string
  dateTo?: string
  instituteId?: number
  locationId?: number
  moduleId?: number
}

export interface AttentionItem {
  id: number
  type: string
  description: string
  instituteName: string | null
  priority: Priority | null
  owner: string | null
  dueDate: string | null
  status: string
  ragStatus: RAGStatus
  nextAction: string | null
  linkTo: string
  linkId: number
}

export interface MyWorkItem {
  id: number
  type: string
  title: string
  instituteName: string | null
  time: string | null
  priority?: Priority | null
  dueDate?: string | null
  linkTo: string
  linkId: number
}

// ─── Reports ──────────────────────────────────────────────────
export type ReportType =
  | 'executive_summary'
  | 'benchmark_audit'
  | 'institute_engagement'
  | 'module_adoption'
  | 'training'
  | 'pain_areas'
  | 'issues'
  | 'requirement_pipeline'
  | 'requirement_approval'
  | 'implementation_progress'
  | 'apex_implementation'
  | 'canteen_implementation'
  | 'store_enhancement'
  | 'leadership_meetings'
  | 'bm_finance_os'
  | 'pending_modules'
  | 'action_tracker'
  | 'risk_register'
  | 'monthly_progress'
  | 'final_3month'

export interface ReportFilters {
  reportType: ReportType
  dateFrom?: string
  dateTo?: string
  instituteId?: number
  locationId?: number
  moduleId?: number
  status?: string
  priority?: string
  owner?: string
}

export interface BaselineMetric {
  id: number
  assignmentId: number
  metricName: string
  metricValue: number
  metricDate: string
  notes: string | null
}
