import type Database from 'better-sqlite3'

const MIGRATION_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    last_login TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    module TEXT NOT NULL,
    record_id INTEGER,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_type TEXT,
    related_id INTEGER,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS institutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'School',
    org TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    primary_contact TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL REFERENCES institutes(id),
    name TEXT NOT NULL,
    city TEXT,
    emirate TEXT,
    address TEXT,
    contact_person TEXT,
    contact_number TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER REFERENCES institutes(id),
    name TEXT NOT NULL,
    code TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    product TEXT,
    category TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    owner TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    objectives TEXT,
    assigned_person TEXT NOT NULL,
    sponsor TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    institute_id INTEGER REFERENCES institutes(id),
    location_id INTEGER REFERENCES locations(id),
    dept_id INTEGER REFERENCES departments(id),
    module_id INTEGER REFERENCES modules(id),
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    people_met TEXT,
    findings TEXT,
    action_required TEXT,
    owner TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'Logged',
    remarks TEXT,
    related_id INTEGER,
    related_type TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS institute_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_date TEXT NOT NULL,
    institute_id INTEGER NOT NULL REFERENCES institutes(id),
    location_id INTEGER REFERENCES locations(id),
    purpose TEXT NOT NULL,
    participants TEXT,
    modules_discussed TEXT,
    findings TEXT,
    pain_areas_noted TEXT,
    training_required TEXT,
    next_visit_date TEXT,
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'Completed',
    daily_activity_id INTEGER REFERENCES daily_activities(id),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_date TEXT NOT NULL,
    institute_id INTEGER NOT NULL REFERENCES institutes(id),
    location_id INTEGER REFERENCES locations(id),
    module_id INTEGER NOT NULL REFERENCES modules(id),
    usage_status TEXT NOT NULL,
    user_adoption TEXT NOT NULL,
    data_quality TEXT NOT NULL,
    training_status TEXT NOT NULL,
    has_issues INTEGER NOT NULL DEFAULT 0,
    has_requirements INTEGER NOT NULL DEFAULT 0,
    recommendation TEXT,
    rag_status TEXT NOT NULL DEFAULT 'red',
    overall_score REAL,
    audited_by TEXT,
    notes TEXT,
    daily_activity_id INTEGER REFERENCES daily_activities(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS module_adoption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL REFERENCES institutes(id),
    location_id INTEGER REFERENCES locations(id),
    module_id INTEGER NOT NULL REFERENCES modules(id),
    is_available INTEGER NOT NULL DEFAULT 0,
    is_configured INTEGER NOT NULL DEFAULT 0,
    is_live INTEGER NOT NULL DEFAULT 0,
    is_actively_used INTEGER NOT NULL DEFAULT 0,
    user_count INTEGER,
    usage_frequency TEXT,
    adoption_pct REAL,
    gap_description TEXT,
    action_required TEXT,
    owner TEXT,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'Not Started',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(institute_id, module_id)
  );

  CREATE TABLE IF NOT EXISTS training_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    training_date TEXT NOT NULL,
    institute_id INTEGER NOT NULL REFERENCES institutes(id),
    location_id INTEGER REFERENCES locations(id),
    module_id INTEGER REFERENCES modules(id),
    topic TEXT NOT NULL,
    trainer TEXT,
    target_audience TEXT,
    participant_count INTEGER,
    actual_attendance INTEGER,
    duration_hours REAL,
    training_type TEXT NOT NULL DEFAULT 'group',
    feedback TEXT,
    issues_raised TEXT,
    follow_up_required INTEGER NOT NULL DEFAULT 0,
    next_training_date TEXT,
    status TEXT NOT NULL DEFAULT 'Planned',
    daily_activity_id INTEGER REFERENCES daily_activities(id),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS training_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    department TEXT,
    role TEXT,
    attended INTEGER NOT NULL DEFAULT 1,
    feedback TEXT,
    follow_up_required INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pain_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_identified TEXT NOT NULL,
    institute_id INTEGER NOT NULL REFERENCES institutes(id),
    location_id INTEGER REFERENCES locations(id),
    dept_id INTEGER REFERENCES departments(id),
    module_id INTEGER REFERENCES modules(id),
    reported_by TEXT,
    description TEXT NOT NULL,
    business_impact TEXT,
    frequency TEXT,
    severity TEXT NOT NULL DEFAULT 'medium',
    existing_workaround TEXT,
    suggested_solution TEXT,
    owner TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    daily_activity_id INTEGER REFERENCES daily_activities(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_ref TEXT NOT NULL UNIQUE,
    issue_date TEXT NOT NULL,
    institute_id INTEGER NOT NULL REFERENCES institutes(id),
    location_id INTEGER REFERENCES locations(id),
    module_id INTEGER REFERENCES modules(id),
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'functional',
    priority TEXT NOT NULL DEFAULT 'medium',
    impact TEXT,
    root_cause TEXT,
    workaround TEXT,
    assigned_to TEXT,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    resolution TEXT,
    closed_date TEXT,
    daily_activity_id INTEGER REFERENCES daily_activities(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    req_ref TEXT NOT NULL UNIQUE,
    date_identified TEXT NOT NULL,
    institute_id INTEGER NOT NULL REFERENCES institutes(id),
    location_id INTEGER REFERENCES locations(id),
    dept_id INTEGER REFERENCES departments(id),
    module_id INTEGER REFERENCES modules(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    business_need TEXT,
    user_impact TEXT,
    business_impact TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    source TEXT NOT NULL DEFAULT 'direct',
    requested_by TEXT,
    portfolio_manager TEXT,
    product_owner TEXT,
    status TEXT NOT NULL DEFAULT 'identified',
    remarks TEXT,
    deleted_at TEXT,
    daily_activity_id INTEGER REFERENCES daily_activities(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS requirement_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requirement_id INTEGER NOT NULL REFERENCES requirements(id),
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by TEXT,
    notes TEXT,
    changed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS requirement_estimations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requirement_id INTEGER NOT NULL UNIQUE REFERENCES requirements(id),
    technical_complexity TEXT,
    dev_effort_days REAL,
    qa_effort_days REAL,
    dependencies TEXT,
    estimated_sprint TEXT,
    estimated_release_date TEXT,
    estimator TEXT,
    estimation_date TEXT,
    remarks TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS requirement_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requirement_id INTEGER NOT NULL UNIQUE REFERENCES requirements(id),
    priority TEXT,
    business_justification TEXT,
    estimated_effort TEXT,
    impact TEXT,
    dependency TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approval_date TEXT,
    comments TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    requirement_id INTEGER REFERENCES requirements(id),
    dev_team TEXT,
    start_date TEXT,
    planned_completion TEXT,
    actual_completion TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    developer TEXT,
    qa_person TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS uat_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requirement_id INTEGER NOT NULL REFERENCES requirements(id),
    sprint_id INTEGER REFERENCES sprints(id),
    test_case TEXT NOT NULL,
    test_date TEXT,
    tester TEXT,
    result TEXT NOT NULL DEFAULT 'not_tested',
    defect_description TEXT,
    client_confirmation INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS implementations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    impl_ref TEXT NOT NULL UNIQUE,
    project_name TEXT NOT NULL,
    impl_type TEXT NOT NULL DEFAULT 'other',
    institute_id INTEGER NOT NULL REFERENCES institutes(id),
    location_id INTEGER REFERENCES locations(id),
    module_id INTEGER REFERENCES modules(id),
    start_date TEXT,
    target_date TEXT,
    actual_completion TEXT,
    owner TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    progress_pct INTEGER NOT NULL DEFAULT 0,
    dependency TEXT,
    risk_notes TEXT,
    remarks TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS implementation_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    implementation_id INTEGER NOT NULL REFERENCES implementations(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    assignee TEXT,
    start_date TEXT,
    target_date TEXT,
    actual_date TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pending_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL REFERENCES institutes(id),
    location_id INTEGER REFERENCES locations(id),
    module_id INTEGER NOT NULL REFERENCES modules(id),
    current_status TEXT,
    reason_pending TEXT,
    dependency TEXT,
    action_required TEXT,
    owner TEXT,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    escalation_required INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leadership_meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_date TEXT NOT NULL,
    participants TEXT,
    organization TEXT,
    category TEXT NOT NULL DEFAULT 'other',
    topic TEXT NOT NULL,
    discussion TEXT,
    decisions TEXT,
    requirements_identified TEXT,
    action_items TEXT,
    owner TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'Completed',
    follow_up_date TEXT,
    daily_activity_id INTEGER REFERENCES daily_activities(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_ref TEXT NOT NULL UNIQUE,
    action_date TEXT NOT NULL,
    source_type TEXT,
    source_id INTEGER,
    institute_id INTEGER REFERENCES institutes(id),
    module_id INTEGER REFERENCES modules(id),
    description TEXT NOT NULL,
    owner TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    remarks TEXT,
    completion_date TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    risk_ref TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    institute_id INTEGER REFERENCES institutes(id),
    project TEXT,
    probability INTEGER NOT NULL DEFAULT 1,
    impact INTEGER NOT NULL DEFAULT 1,
    risk_score INTEGER NOT NULL DEFAULT 1,
    risk_level TEXT NOT NULL DEFAULT 'low',
    mitigation TEXT,
    owner TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    related_type TEXT,
    related_id INTEGER,
    dependency_on TEXT NOT NULL,
    owner TEXT,
    required_by_date TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    impact_if_blocked TEXT,
    escalation_required INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS compliance_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compliance_area TEXT NOT NULL,
    institute_id INTEGER REFERENCES institutes(id),
    dept_id INTEGER REFERENCES departments(id),
    current_status TEXT NOT NULL,
    gap_description TEXT,
    action_required TEXT,
    owner TEXT,
    target_date TEXT,
    evidence TEXT,
    status TEXT NOT NULL DEFAULT 'Not Started',
    remarks TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    related_type TEXT NOT NULL,
    related_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS baseline_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER REFERENCES assignments(id),
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`

export function runMigrations(db: Database): void {
  db.exec(MIGRATION_SQL)

  // Seed default admin user if no users exist
  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt
  if (userCount === 0) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcryptjs')
    const hash = bcrypt.hashSync('admin123', 12)
    db.prepare(`INSERT INTO users (username,password_hash,full_name,email,role,status) VALUES (?,?,?,?,?,?)`)
      .run('admin', hash, 'System Administrator', 'admin@ceim.ae', 'admin', 'active')
    console.log('[DB] Default admin user created (username: admin, password: admin123)')
  }
}
