import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)
function today() { return new Date().toISOString().split('T')[0] }

app.post('/data', async (c) => {
  try {
    const params = await c.req.json()
    const db = getSqlite()
    const { reportType, dateFrom, dateTo, instituteId } = params
    const df = dateFrom ?? '2000-01-01'
    const dt = dateTo ?? today()
    let data: unknown

    if (reportType === 'weekly_summary' || reportType === 'monthly_summary') {
      data = {
        visits: db.prepare(`SELECT v.*,i.name as institute_name FROM institute_visits v LEFT JOIN institutes i ON v.institute_id=i.id WHERE v.visit_date BETWEEN ? AND ?`).all(df, dt),
        actions: db.prepare(`SELECT * FROM actions WHERE action_date BETWEEN ? AND ?`).all(df, dt),
        trainings: db.prepare(`SELECT ts.*,i.name as institute_name FROM training_sessions ts LEFT JOIN institutes i ON ts.institute_id=i.id WHERE ts.training_date BETWEEN ? AND ?`).all(df, dt),
        issues: db.prepare(`SELECT * FROM issues WHERE issue_date BETWEEN ? AND ?`).all(df, dt),
      }
    } else if (reportType === 'institute_engagement') {
      const sql = `SELECT i.name,i.code,i.type,(SELECT COUNT(*) FROM institute_visits WHERE institute_id=i.id) as visits,(SELECT COUNT(*) FROM training_sessions WHERE institute_id=i.id) as trainings,(SELECT COUNT(*) FROM issues WHERE institute_id=i.id) as issues,(SELECT COUNT(*) FROM requirements WHERE institute_id=i.id AND deleted_at IS NULL) as requirements,(SELECT ROUND(AVG(adoption_pct),1) FROM module_adoption WHERE institute_id=i.id) as avg_adoption FROM institutes i WHERE i.deleted_at IS NULL`
      data = instituteId ? db.prepare(sql + ` AND i.id=?`).all(instituteId) : db.prepare(sql).all()
    } else if (reportType === 'benchmark_adoption') {
      data = {
        institutes: db.prepare(`SELECT id,name,code FROM institutes WHERE deleted_at IS NULL ORDER BY name`).all(),
        modules: db.prepare(`SELECT id,name,code FROM modules WHERE status='Active' ORDER BY name`).all(),
        adoption: db.prepare(`SELECT ma.*,i.name as institute_name,m.name as module_name FROM module_adoption ma LEFT JOIN institutes i ON ma.institute_id=i.id LEFT JOIN modules m ON ma.module_id=m.id`).all(),
      }
    } else if (reportType === 'requirement_pipeline') {
      const sql = `SELECT r.*,i.name as institute_name,m.name as module_name FROM requirements r LEFT JOIN institutes i ON r.institute_id=i.id LEFT JOIN modules m ON r.module_id=m.id WHERE r.deleted_at IS NULL`
      data = instituteId ? db.prepare(sql + ` AND r.institute_id=? ORDER BY r.status,r.priority DESC`).all(instituteId) : db.prepare(sql + ` ORDER BY r.status,r.priority DESC`).all()
    } else if (reportType === 'issue_log') {
      const sql = `SELECT iss.*,i.name as institute_name,m.name as module_name FROM issues iss LEFT JOIN institutes i ON iss.institute_id=i.id LEFT JOIN modules m ON iss.module_id=m.id WHERE 1=1`
      data = instituteId ? db.prepare(sql + ` AND iss.institute_id=? ORDER BY iss.priority DESC,iss.created_at DESC`).all(instituteId) : db.prepare(sql + ` ORDER BY iss.priority DESC,iss.created_at DESC`).all()
    } else if (reportType === 'training_report') {
      data = {
        sessions: db.prepare(`SELECT ts.*,i.name as institute_name,m.name as module_name FROM training_sessions ts LEFT JOIN institutes i ON ts.institute_id=i.id LEFT JOIN modules m ON ts.module_id=m.id WHERE ts.training_date BETWEEN ? AND ? ORDER BY ts.training_date DESC`).all(df, dt),
        summary: db.prepare(`SELECT COUNT(*) as sessions,COALESCE(SUM(actual_attendance),0) as participants,COALESCE(SUM(duration_hours),0) as hours FROM training_sessions WHERE training_date BETWEEN ? AND ? AND status='Completed'`).get(df, dt),
      }
    } else if (reportType === 'action_tracker') {
      data = db.prepare(`SELECT a.*,i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id ORDER BY CASE a.status WHEN 'overdue' THEN 0 WHEN 'open' THEN 1 ELSE 2 END,a.due_date`).all()
    } else if (reportType === 'risk_register') {
      data = db.prepare(`SELECT r.*,i.name as institute_name FROM risks r LEFT JOIN institutes i ON r.institute_id=i.id ORDER BY r.risk_score DESC`).all()
    } else if (reportType === 'implementation_status') {
      data = {
        implementations: db.prepare(`SELECT im.*,i.name as institute_name,m.name as module_name FROM implementations im LEFT JOIN institutes i ON im.institute_id=i.id LEFT JOIN modules m ON im.module_id=m.id ORDER BY im.status,im.target_date`).all(),
        tasks: db.prepare(`SELECT it.*,im.project_name FROM implementation_tasks it LEFT JOIN implementations im ON it.implementation_id=im.id ORDER BY im.project_name,it.sort_order`).all(),
      }
    } else {
      data = []
    }

    return c.json({ success: true, data })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/baseline-metrics', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM baseline_metrics ORDER BY metric_date`).all() })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/baseline-metrics', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`INSERT INTO baseline_metrics (assignment_id,metric_name,metric_value,metric_date,notes) VALUES (?,?,?,?,?)`)
      .run(data.assignmentId??null,data.metricName,data.metricValue,data.metricDate??today(),data.notes??null)
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/before-after', (c) => {
  try {
    const baseline = getSqlite().prepare(`SELECT * FROM baseline_metrics ORDER BY metric_date`).all()
    return c.json({ success: true, data: { baseline } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/generate-excel', async (c) => {
  try {
    const params = await c.req.json()
    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.default.Workbook()
    wb.creator = 'CEIM Portal'; wb.created = new Date()
    const ws = wb.addWorksheet('Report')
    ws.addRow(['CEIM Portal – UAE Client Engagement & Implementation Management Portal'])
    ws.addRow([`Report: ${params.reportType}`, `Generated: ${new Date().toLocaleString()}`])
    ws.addRow([])
    const buffer = await wb.xlsx.writeBuffer()
    c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    c.header('Content-Disposition', `attachment; filename="ceim-report-${Date.now()}.xlsx"`)
    return c.body(buffer as ArrayBuffer)
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
