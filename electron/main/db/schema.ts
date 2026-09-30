// ============================================================
// CEIM Portal – Complete Drizzle ORM Database Schema
// All 35+ tables for the full application
// ============================================================

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql, relations } from 'drizzle-orm'

// ─── Helper: timestamps ───────────────────────────────────────
const timestamps = {
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
}

// ═══════════════════════════════════════════════════════════════
// AUTH & USERS
// ═══════════════════════════════════════════════════════════════

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  email: text('email'),
  role: text('role', {
    enum: ['admin', 'portfolio_manager', 'management', 'user']
  }).notNull().default('user'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  lastLogin: text('last_login'),
  ...timestamps
})

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  updatedBy: integer('updated_by').references(() => users.id)
})

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  module: text('module').notNull(),
  recordId: integer('record_id'),
  action: text('action').notNull(), // 'create' | 'update' | 'delete' | 'status_change'
  oldValue: text('old_value'),      // JSON string
  newValue: text('new_value'),      // JSON string
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  type: text('type').notNull(), // 'overdue_action' | 'upcoming_visit' | 'approval_pending' | etc.
  title: text('title').notNull(),
  message: text('message').notNull(),
  relatedType: text('related_type'),
  relatedId: integer('related_id'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ═══════════════════════════════════════════════════════════════
// MASTER DATA
// ═══════════════════════════════════════════════════════════════

export const institutes = sqliteTable('institutes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['School', 'Education Group', 'Training Centre', 'Corporate', 'Other']
  }).notNull().default('School'),
  org: text('org'),
  description: text('description'),
  status: text('status', { enum: ['Active', 'Inactive', 'Prospect'] }).notNull().default('Active'),
  primaryContact: text('primary_contact'),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  ...timestamps,
  deletedAt: text('deleted_at')
})

export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  name: text('name').notNull(),
  city: text('city'),
  emirate: text('emirate', {
    enum: ['Dubai', 'Sharjah', 'Abu Dhabi', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain', 'Other']
  }),
  address: text('address'),
  contactPerson: text('contact_person'),
  contactNumber: text('contact_number'),
  email: text('email'),
  status: text('status', { enum: ['Active', 'Inactive'] }).notNull().default('Active'),
  notes: text('notes'),
  ...timestamps
})

export const departments = sqliteTable('departments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  name: text('name').notNull(),
  head: text('head'),
  contact: text('contact'),
  status: text('status', { enum: ['Active', 'Inactive'] }).notNull().default('Active'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const modules = sqliteTable('modules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  product: text('product'),
  category: text('category', {
    enum: ['Core', 'Finance', 'HR', 'Academic', 'Transport', 'Canteen', 'Store', 'Communication', 'Analytics', 'Other']
  }),
  description: text('description'),
  status: text('status', { enum: ['Active', 'Deprecated', 'Beta'] }).notNull().default('Active'),
  owner: text('owner'),
  notes: text('notes'),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// ASSIGNMENT
// ═══════════════════════════════════════════════════════════════

export const assignments = sqliteTable('assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  objectives: text('objectives'), // JSON array
  assignedPerson: text('assigned_person').notNull(),
  sponsor: text('sponsor'),
  status: text('status', {
    enum: ['Not Started', 'Active', 'Completed', 'On Hold']
  }).notNull().default('Active'),
  ...timestamps
})

export const baselineMetrics = sqliteTable('baseline_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  assignmentId: integer('assignment_id').references(() => assignments.id),
  metricName: text('metric_name').notNull(),
  metricValue: real('metric_value').notNull(),
  metricDate: text('metric_date').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ═══════════════════════════════════════════════════════════════
// DAILY ACTIVITIES (Central Journal)
// ═══════════════════════════════════════════════════════════════

export const dailyActivities = sqliteTable('daily_activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  instituteId: integer('institute_id').references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  deptId: integer('dept_id').references(() => departments.id),
  moduleId: integer('module_id').references(() => modules.id),
  activityType: text('activity_type', {
    enum: [
      'institute_visit', 'training_session', 'benchmark_audit',
      'issue_identified', 'requirement_captured', 'pain_area_identified',
      'leadership_meeting', 'action_created', 'implementation_update',
      'uat_activity', 'follow_up', 'support', 'documentation', 'other'
    ]
  }).notNull(),
  description: text('description').notNull(),
  peopleMet: text('people_met'),
  findings: text('findings'),
  relatedId: integer('related_id'),   // FK to the specific module record
  relatedType: text('related_type'), // 'visit' | 'training' | 'issue' | 'requirement' | etc.
  actionRequired: text('action_required'),
  owner: text('owner'),
  dueDate: text('due_date'),
  status: text('status', {
    enum: ['Logged', 'In Progress', 'Completed', 'Follow-up Required']
  }).notNull().default('Logged'),
  remarks: text('remarks'),
  createdBy: integer('created_by').references(() => users.id),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// INSTITUTE VISITS
// ═══════════════════════════════════════════════════════════════

export const instituteVisits = sqliteTable('institute_visits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  visitDate: text('visit_date').notNull(),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  purpose: text('purpose').notNull(),
  participants: text('participants'),      // comma-separated or free text
  modulesDiscussed: text('modules_discussed'), // JSON array of module ids/names
  findings: text('findings'),
  painAreasNoted: text('pain_areas_noted'),
  trainingRequired: text('training_required'),
  nextVisitDate: text('next_visit_date'),
  remarks: text('remarks'),
  status: text('status', {
    enum: ['Planned', 'Completed', 'Cancelled', 'Rescheduled']
  }).notNull().default('Planned'),
  dailyActivityId: integer('daily_activity_id').references(() => dailyActivities.id),
  createdBy: integer('created_by').references(() => users.id),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// BENCHMARK AUDIT
// ═══════════════════════════════════════════════════════════════

export const audits = sqliteTable('audits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  auditDate: text('audit_date').notNull(),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  moduleId: integer('module_id').notNull().references(() => modules.id),
  usageStatus: text('usage_status', {
    enum: ['fully_used', 'partially_used', 'not_used', 'not_applicable']
  }).notNull(),
  userAdoption: text('user_adoption', {
    enum: ['high', 'medium', 'low', 'none']
  }).notNull(),
  dataQuality: text('data_quality', {
    enum: ['good', 'needs_improvement', 'poor']
  }).notNull(),
  trainingStatus: text('training_status', {
    enum: ['trained', 'partially_trained', 'not_trained']
  }).notNull(),
  hasIssues: integer('has_issues', { mode: 'boolean' }).notNull().default(false),
  hasRequirements: integer('has_requirements', { mode: 'boolean' }).notNull().default(false),
  recommendation: text('recommendation'),
  ragStatus: text('rag_status', {
    enum: ['green', 'amber', 'red', 'grey']
  }).notNull().default('grey'),
  overallScore: real('overall_score'),
  auditedBy: text('audited_by'),
  notes: text('notes'),
  dailyActivityId: integer('daily_activity_id').references(() => dailyActivities.id),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// MODULE ADOPTION
// ═══════════════════════════════════════════════════════════════

export const moduleAdoption = sqliteTable('module_adoption', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  moduleId: integer('module_id').notNull().references(() => modules.id),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(false),
  isConfigured: integer('is_configured', { mode: 'boolean' }).notNull().default(false),
  isLive: integer('is_live', { mode: 'boolean' }).notNull().default(false),
  isActivelyUsed: integer('is_actively_used', { mode: 'boolean' }).notNull().default(false),
  userCount: integer('user_count'),
  lastUsageDate: text('last_usage_date'),
  usageFrequency: text('usage_frequency', {
    enum: ['Daily', 'Weekly', 'Monthly', 'Rarely', 'Never']
  }),
  adoptionPct: real('adoption_pct'),
  gapDescription: text('gap_description'),
  actionRequired: text('action_required'),
  owner: text('owner'),
  targetDate: text('target_date'),
  status: text('status', {
    enum: ['Not Started', 'In Progress', 'Completed', 'On Hold']
  }).notNull().default('Not Started'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
})

// ═══════════════════════════════════════════════════════════════
// TRAINING
// ═══════════════════════════════════════════════════════════════

export const trainingSessions = sqliteTable('training_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  trainingDate: text('training_date').notNull(),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  moduleId: integer('module_id').references(() => modules.id),
  topic: text('topic').notNull(),
  trainer: text('trainer'),
  targetAudience: text('target_audience'),
  participantCount: integer('participant_count'),
  actualAttendance: integer('actual_attendance'),
  durationHours: real('duration_hours'),
  trainingType: text('training_type', {
    enum: ['new_user', 'brush_up', 'module_training', 'advanced', 'demo', 'one_to_one', 'group']
  }).notNull().default('group'),
  feedback: text('feedback'),
  issuesRaised: text('issues_raised'),
  followUpRequired: integer('follow_up_required', { mode: 'boolean' }).notNull().default(false),
  nextTrainingDate: text('next_training_date'),
  status: text('status', {
    enum: ['Planned', 'Completed', 'Cancelled', 'Rescheduled']
  }).notNull().default('Planned'),
  dailyActivityId: integer('daily_activity_id').references(() => dailyActivities.id),
  createdBy: integer('created_by').references(() => users.id),
  ...timestamps
})

export const trainingParticipants = sqliteTable('training_participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => trainingSessions.id),
  participantName: text('participant_name').notNull(),
  department: text('department'),
  role: text('role'),
  attended: integer('attended', { mode: 'boolean' }).notNull().default(true),
  feedback: text('feedback'),
  followUpRequired: integer('follow_up_required', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ═══════════════════════════════════════════════════════════════
// PAIN AREAS
// ═══════════════════════════════════════════════════════════════

export const painAreas = sqliteTable('pain_areas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dateIdentified: text('date_identified').notNull(),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  deptId: integer('dept_id').references(() => departments.id),
  moduleId: integer('module_id').references(() => modules.id),
  reportedBy: text('reported_by'),
  description: text('description').notNull(),
  businessImpact: text('business_impact'),
  frequency: text('frequency', {
    enum: ['rarely', 'sometimes', 'often', 'always']
  }),
  severity: text('severity', {
    enum: ['low', 'medium', 'high', 'critical']
  }).notNull().default('medium'),
  existingWorkaround: text('existing_workaround'),
  suggestedSolution: text('suggested_solution'),
  relatedRequirementId: integer('related_requirement_id'),
  owner: text('owner'),
  status: text('status', {
    enum: ['Open', 'In Progress', 'Resolved', 'Closed', 'Deferred']
  }).notNull().default('Open'),
  dailyActivityId: integer('daily_activity_id').references(() => dailyActivities.id),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// ISSUES
// ═══════════════════════════════════════════════════════════════

export const issues = sqliteTable('issues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  issueRef: text('issue_ref').notNull().unique(), // ISS-YYYY-NNNN
  issueDate: text('issue_date').notNull(),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  moduleId: integer('module_id').references(() => modules.id),
  description: text('description').notNull(),
  category: text('category', {
    enum: ['functional', 'technical', 'data', 'integration', 'performance', 'user_training', 'configuration', 'access', 'support', 'other']
  }).notNull().default('functional'),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'critical']
  }).notNull().default('medium'),
  impact: text('impact'),
  rootCause: text('root_cause'),
  workaround: text('workaround'),
  assignedTo: text('assigned_to'),
  targetDate: text('target_date'),
  status: text('status', {
    enum: ['open', 'in_progress', 'resolved', 'closed', 'deferred']
  }).notNull().default('open'),
  resolution: text('resolution'),
  closedDate: text('closed_date'),
  dailyActivityId: integer('daily_activity_id').references(() => dailyActivities.id),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// REQUIREMENTS (Full Governance Workflow)
// ═══════════════════════════════════════════════════════════════

export const requirements = sqliteTable('requirements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reqRef: text('req_ref').notNull().unique(), // REQ-YYYY-NNNN
  dateIdentified: text('date_identified').notNull(),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  deptId: integer('dept_id').references(() => departments.id),
  moduleId: integer('module_id').references(() => modules.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  businessNeed: text('business_need'),
  userImpact: text('user_impact'),
  businessImpact: text('business_impact'),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'critical']
  }).notNull().default('medium'),
  source: text('source', {
    enum: ['visit', 'training', 'audit', 'meeting', 'pain_area', 'issue', 'management', 'direct', 'other']
  }).notNull().default('direct'),
  requestedBy: text('requested_by'),
  portfolioManager: text('portfolio_manager'),
  productOwner: text('product_owner'),
  status: text('status', {
    enum: [
      'identified', 'documented', 'under_review', 'estimation_pending',
      'estimated', 'approval_pending', 'approved', 'rejected', 'deferred',
      'sprint_planned', 'development', 'qa', 'uat', 'released', 'closed'
    ]
  }).notNull().default('identified'),
  remarks: text('remarks'),
  dailyActivityId: integer('daily_activity_id').references(() => dailyActivities.id),
  ...timestamps,
  deletedAt: text('deleted_at')
})

export const requirementHistory = sqliteTable('requirement_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  requirementId: integer('requirement_id').notNull().references(() => requirements.id),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  changedBy: text('changed_by'),
  changedAt: text('changed_at').notNull().default(sql`(datetime('now'))`),
  notes: text('notes')
})

export const requirementEstimations = sqliteTable('requirement_estimations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  requirementId: integer('requirement_id').notNull().references(() => requirements.id).unique(),
  technicalComplexity: text('technical_complexity', {
    enum: ['low', 'medium', 'high', 'very_high']
  }).notNull(),
  devEffortDays: real('dev_effort_days'),
  qaEffortDays: real('qa_effort_days'),
  dependencies: text('dependencies'),
  estimatedSprint: text('estimated_sprint'),
  estimatedReleaseDate: text('estimated_release_date'),
  estimator: text('estimator'),
  estimationDate: text('estimation_date').notNull(),
  remarks: text('remarks'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const requirementApprovals = sqliteTable('requirement_approvals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  requirementId: integer('requirement_id').notNull().references(() => requirements.id).unique(),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'critical']
  }).notNull(),
  businessJustification: text('business_justification'),
  estimatedEffort: text('estimated_effort'),
  impact: text('impact'),
  dependency: text('dependency'),
  approvalStatus: text('approval_status', {
    enum: ['pending', 'approved', 'rejected', 'deferred']
  }).notNull().default('pending'),
  approvedBy: text('approved_by'),
  approvalDate: text('approval_date'),
  comments: text('comments'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const sprints = sqliteTable('sprints', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  requirementId: integer('requirement_id').notNull().references(() => requirements.id),
  devTeam: text('dev_team'),
  startDate: text('start_date'),
  plannedCompletion: text('planned_completion'),
  actualCompletion: text('actual_completion'),
  status: text('status', {
    enum: ['planned', 'development', 'qa', 'uat', 'released', 'closed']
  }).notNull().default('planned'),
  developer: text('developer'),
  qaPerson: text('qa_person'),
  releaseDate: text('release_date'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

export const uatRecords = sqliteTable('uat_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  requirementId: integer('requirement_id').notNull().references(() => requirements.id),
  sprintId: integer('sprint_id').references(() => sprints.id),
  testCase: text('test_case').notNull(),
  testDate: text('test_date'),
  tester: text('tester'),
  result: text('result', {
    enum: ['pass', 'fail', 'blocked', 'not_tested']
  }).notNull().default('not_tested'),
  defectDescription: text('defect_description'),
  retestDate: text('retest_date'),
  finalStatus: text('final_status', {
    enum: ['pass', 'fail', 'blocked', 'not_tested']
  }),
  clientConfirmation: integer('client_confirmation', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ═══════════════════════════════════════════════════════════════
// IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════

export const implementations = sqliteTable('implementations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  implRef: text('impl_ref').notNull().unique(), // IMPL-NNNN
  projectName: text('project_name').notNull(),
  implType: text('impl_type', {
    enum: ['apex', 'canteen', 'store_enhancement', 'other']
  }).notNull().default('other'),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  moduleId: integer('module_id').references(() => modules.id),
  startDate: text('start_date'),
  targetDate: text('target_date'),
  actualCompletion: text('actual_completion'),
  owner: text('owner'),
  status: text('status', {
    enum: ['not_started', 'planning', 'in_progress', 'blocked', 'uat', 'live', 'completed', 'on_hold']
  }).notNull().default('not_started'),
  progressPct: integer('progress_pct').notNull().default(0),
  dependency: text('dependency'),
  riskNotes: text('risk_notes'),
  remarks: text('remarks'),
  ...timestamps
})

export const implementationTasks = sqliteTable('implementation_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  implementationId: integer('implementation_id').notNull().references(() => implementations.id),
  taskName: text('task_name').notNull(),
  assignee: text('assignee'),
  startDate: text('start_date'),
  targetDate: text('target_date'),
  actualDate: text('actual_date'),
  status: text('status', {
    enum: ['not_started', 'in_progress', 'completed', 'blocked', 'cancelled']
  }).notNull().default('not_started'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ═══════════════════════════════════════════════════════════════
// LEADERSHIP MEETINGS
// ═══════════════════════════════════════════════════════════════

export const leadershipMeetings = sqliteTable('leadership_meetings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingDate: text('meeting_date').notNull(),
  participants: text('participants'),
  organization: text('organization'),
  category: text('category', {
    enum: ['teacher_ai', 'principal_mis', 'safetri', 'product_strategy', 'benchmark_adoption', 'finance', 'hr', 'operations', 'other']
  }).notNull().default('other'),
  topic: text('topic').notNull(),
  discussion: text('discussion'),
  decisions: text('decisions'),
  requirementsIdentified: text('requirements_identified'),
  actionItems: text('action_items'),
  owner: text('owner'),
  dueDate: text('due_date'),
  status: text('status', {
    enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled']
  }).notNull().default('Scheduled'),
  followUpDate: text('follow_up_date'),
  dailyActivityId: integer('daily_activity_id').references(() => dailyActivities.id),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// BM-FINANCE OS COMPLIANCE
// ═══════════════════════════════════════════════════════════════

export const complianceItems = sqliteTable('compliance_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  complianceArea: text('compliance_area').notNull(),
  instituteId: integer('institute_id').references(() => institutes.id),
  deptId: integer('dept_id').references(() => departments.id),
  currentStatus: text('current_status').notNull(),
  gapDescription: text('gap_description'),
  actionRequired: text('action_required'),
  owner: text('owner'),
  targetDate: text('target_date'),
  evidence: text('evidence'),
  status: text('status', {
    enum: ['Not Started', 'In Progress', 'Compliant', 'Non-Compliant', 'Waived']
  }).notNull().default('Not Started'),
  remarks: text('remarks'),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════

export const actions = sqliteTable('actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actionRef: text('action_ref').notNull().unique(), // ACT-NNNN
  actionDate: text('action_date').notNull(),
  sourceType: text('source_type'), // 'visit' | 'meeting' | 'issue' | 'requirement' | 'audit' | 'manual'
  sourceId: integer('source_id'),
  instituteId: integer('institute_id').references(() => institutes.id),
  moduleId: integer('module_id').references(() => modules.id),
  description: text('description').notNull(),
  owner: text('owner'),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'critical']
  }).notNull().default('medium'),
  dueDate: text('due_date'),
  status: text('status', {
    enum: ['open', 'in_progress', 'completed', 'overdue', 'cancelled']
  }).notNull().default('open'),
  completionDate: text('completion_date'),
  remarks: text('remarks'),
  createdBy: integer('created_by').references(() => users.id),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// RISKS
// ═══════════════════════════════════════════════════════════════

export const risks = sqliteTable('risks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  riskRef: text('risk_ref').notNull().unique(), // RSK-NNNN
  description: text('description').notNull(),
  instituteId: integer('institute_id').references(() => institutes.id),
  project: text('project'),
  probability: integer('probability').notNull(), // 1-5
  impact: integer('impact').notNull(),           // 1-5
  riskScore: integer('risk_score').notNull(),    // probability × impact
  riskLevel: text('risk_level', {
    enum: ['low', 'medium', 'high', 'critical']
  }).notNull(),
  mitigation: text('mitigation'),
  owner: text('owner'),
  dueDate: text('due_date'),
  status: text('status', {
    enum: ['open', 'mitigated', 'accepted', 'closed']
  }).notNull().default('open'),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// DEPENDENCIES
// ═══════════════════════════════════════════════════════════════

export const dependencies = sqliteTable('dependencies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  description: text('description').notNull(),
  relatedType: text('related_type'), // 'requirement' | 'implementation' | 'action'
  relatedId: integer('related_id'),
  dependencyOn: text('dependency_on').notNull(), // free text: who/what is being depended on
  owner: text('owner'),
  requiredByDate: text('required_by_date'),
  status: text('status', {
    enum: ['Pending', 'In Progress', 'Resolved', 'Blocked', 'Cancelled']
  }).notNull().default('Pending'),
  impactIfBlocked: text('impact_if_blocked'),
  escalationRequired: integer('escalation_required', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ═══════════════════════════════════════════════════════════════
// PENDING MODULES
// ═══════════════════════════════════════════════════════════════

export const pendingModules = sqliteTable('pending_modules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  instituteId: integer('institute_id').notNull().references(() => institutes.id),
  locationId: integer('location_id').references(() => locations.id),
  moduleId: integer('module_id').notNull().references(() => modules.id),
  currentStatus: text('current_status'),
  reasonPending: text('reason_pending'),
  dependency: text('dependency'),
  actionRequired: text('action_required'),
  owner: text('owner'),
  targetDate: text('target_date'),
  status: text('status', {
    enum: ['Pending', 'In Progress', 'Resolved', 'On Hold', 'Cancelled']
  }).notNull().default('Pending'),
  escalationRequired: integer('escalation_required', { mode: 'boolean' }).notNull().default(false),
  remarks: text('remarks'),
  ...timestamps
})

// ═══════════════════════════════════════════════════════════════
// ATTACHMENTS
// ═══════════════════════════════════════════════════════════════

export const attachments = sqliteTable('attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  relatedType: text('related_type').notNull(), // 'requirement' | 'issue' | 'meeting' | 'training' | 'audit' | 'implementation' | 'action'
  relatedId: integer('related_id').notNull(),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileType: text('file_type'),
  fileSizeBytes: integer('file_size_bytes'),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
})

// ═══════════════════════════════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════════════════════════════

export const institutesRelations = relations(institutes, ({ many }) => ({
  locations: many(locations),
  departments: many(departments),
  visits: many(instituteVisits),
  audits: many(audits),
  requirements: many(requirements),
  issues: many(issues),
  trainingSessions: many(trainingSessions),
  implementations: many(implementations),
  actions: many(actions),
  risks: many(risks),
  pendingModules: many(pendingModules),
  dailyActivities: many(dailyActivities),
  moduleAdoption: many(moduleAdoption),
}))

export const locationsRelations = relations(locations, ({ one, many }) => ({
  institute: one(institutes, { fields: [locations.instituteId], references: [institutes.id] }),
  departments: many(departments),
  visits: many(instituteVisits),
}))

export const requirementsRelations = relations(requirements, ({ one, many }) => ({
  institute: one(institutes, { fields: [requirements.instituteId], references: [institutes.id] }),
  location: one(locations, { fields: [requirements.locationId], references: [locations.id] }),
  module: one(modules, { fields: [requirements.moduleId], references: [modules.id] }),
  estimation: one(requirementEstimations, { fields: [requirements.id], references: [requirementEstimations.requirementId] }),
  approval: one(requirementApprovals, { fields: [requirements.id], references: [requirementApprovals.requirementId] }),
  history: many(requirementHistory),
  sprints: many(sprints),
  uatRecords: many(uatRecords),
  attachments: many(attachments),
}))

export const implementationsRelations = relations(implementations, ({ one, many }) => ({
  institute: one(institutes, { fields: [implementations.instituteId], references: [institutes.id] }),
  location: one(locations, { fields: [implementations.locationId], references: [locations.id] }),
  module: one(modules, { fields: [implementations.moduleId], references: [modules.id] }),
  tasks: many(implementationTasks),
}))

// Export type inference helpers
export type InsertUser = typeof users.$inferInsert
export type SelectUser = typeof users.$inferSelect
export type InsertInstitute = typeof institutes.$inferInsert
export type SelectInstitute = typeof institutes.$inferSelect
export type InsertLocation = typeof locations.$inferInsert
export type SelectLocation = typeof locations.$inferSelect
export type InsertModule = typeof modules.$inferInsert
export type SelectModule = typeof modules.$inferSelect
export type InsertDailyActivity = typeof dailyActivities.$inferInsert
export type SelectDailyActivity = typeof dailyActivities.$inferSelect
export type InsertVisit = typeof instituteVisits.$inferInsert
export type SelectVisit = typeof instituteVisits.$inferSelect
export type InsertAudit = typeof audits.$inferInsert
export type SelectAudit = typeof audits.$inferSelect
export type InsertRequirement = typeof requirements.$inferInsert
export type SelectRequirement = typeof requirements.$inferSelect
export type InsertIssue = typeof issues.$inferInsert
export type SelectIssue = typeof issues.$inferSelect
export type InsertAction = typeof actions.$inferInsert
export type SelectAction = typeof actions.$inferSelect
export type InsertRisk = typeof risks.$inferInsert
export type SelectRisk = typeof risks.$inferSelect
