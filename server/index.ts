import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { initDatabase } from './db'
import { startNotificationChecker } from './services/notifications.service'

// Routes
import authRouter from './routes/auth'
import usersRouter from './routes/users'
import institutesRouter from './routes/institutes'
import { locationsRouter, departmentsRouter, modulesRouter } from './routes/master'
import assignmentsRouter from './routes/assignments'
import activitiesRouter from './routes/activities'
import visitsRouter from './routes/visits'
import auditsRouter from './routes/audits'
import adoptionRouter from './routes/adoption'
import trainingRouter from './routes/training'
import painAreasRouter from './routes/painAreas'
import issuesRouter from './routes/issues'
import requirementsRouter from './routes/requirements'
import implementationsRouter from './routes/implementations'
import meetingsRouter from './routes/meetings'
import actionsRouter from './routes/actions'
import risksRouter from './routes/risks'
import miscRouter from './routes/misc'
import dashboardRouter from './routes/dashboard'
import reportsRouter from './routes/reports'
import settingsRouter from './routes/settings'
import backupRouter from './routes/backup'
import attachmentsRouter from './routes/attachments'
import notificationsRouter from './routes/notifications'
import auditLogsRouter from './routes/auditLogs'

// Initialize DB
initDatabase()

// Start background notification checker
startNotificationChecker()

const app = new Hono()

// CORS for Vite dev server
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}))

// Mount all API routes
app.route('/api/auth', authRouter)
app.route('/api/users', usersRouter)
app.route('/api/institutes', institutesRouter)
app.route('/api/locations', locationsRouter)
app.route('/api/departments', departmentsRouter)
app.route('/api/modules', modulesRouter)
app.route('/api/assignments', assignmentsRouter)
app.route('/api/activities', activitiesRouter)
app.route('/api/visits', visitsRouter)
app.route('/api/audits', auditsRouter)
app.route('/api/adoption', adoptionRouter)
app.route('/api/training', trainingRouter)
app.route('/api/pain-areas', painAreasRouter)
app.route('/api/issues', issuesRouter)
app.route('/api/requirements', requirementsRouter)
app.route('/api/implementations', implementationsRouter)
app.route('/api/meetings', meetingsRouter)
app.route('/api/actions', actionsRouter)
app.route('/api/risks', risksRouter)
app.route('/api/misc', miscRouter)
app.route('/api/dashboard', dashboardRouter)
app.route('/api/reports', reportsRouter)
app.route('/api/settings', settingsRouter)
app.route('/api/backup', backupRouter)
app.route('/api/attachments', attachmentsRouter)
app.route('/api/notifications', notificationsRouter)
app.route('/api/audit-logs', auditLogsRouter)

// Serve static frontend build (production)
app.use('/*', serveStatic({ root: './dist' }))
// SPA fallback
app.get('/*', serveStatic({ path: './dist/index.html' }))

const PORT = Number(process.env.PORT ?? 5000)

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[Server] CEIM Portal running on http://localhost:${PORT}`)
})

export default app
