require('dotenv').config()

const express      = require('express')
const crypto       = require('crypto')
const PDFDocument  = require('pdfkit')
const db           = require('../lib/db')

const app = express()

/* ── Middleware ──────────────────────────────────────────── */
app.use(express.json())

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mfmc2024'

function adminToken() {
  return crypto
    .createHmac('sha256', process.env.COOKIE_SECRET || 'mfmcf-dev-secret')
    .update(ADMIN_PASSWORD)
    .digest('hex')
}

function adminOnly(req, res, next) {
  const auth = req.headers['authorization']
  if (auth === `Bearer ${adminToken()}`) return next()
  if (req.query.token === adminToken()) return next()   // for PDF/CSV downloads
  res.status(401).json({ error: 'Unauthorized' })
}

/* ── Public routes ───────────────────────────────────────── */

// Register new member
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, church_dept, school_dept, level, birthday } = req.body
    if (!name?.trim()) return res.json({ success: false, error: 'Name is required.' })
    const result = await db.addMember({ name, phone, church_dept, school_dept, level, birthday })
    res.json({ success: true, member_id: result.member_id, name: result.name })
  } catch (e) {
    res.json({ success: false, error: e.message })
  }
})

// Look up a member by ID
app.get('/api/member/:id', async (req, res) => {
  try {
    const member = await db.findMember(req.params.id)
    if (!member) return res.json({ success: false, error: 'Member not found.' })
    res.json({ success: true, ...member })
  } catch (e) {
    res.json({ success: false, error: e.message })
  }
})

// Mark attendance (self-service)
app.post('/api/attendance', async (req, res) => {
  try {
    const { member_id } = req.body
    if (!member_id) return res.json({ success: false, error: 'Member ID required.' })
    const member = await db.findMember(member_id.trim().toUpperCase())
    if (!member) return res.json({ success: false, error: 'Member ID not found. Please check and try again.' })
    const today  = new Date().toISOString().split('T')[0]
    const marked = await db.markAttendance(member.member_id, today)
    res.json({ success: true, name: member.name, alreadyMarked: !marked })
  } catch (e) {
    res.json({ success: false, error: e.message })
  }
})

/* ── Admin auth ──────────────────────────────────────────── */

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ success: true, token: adminToken() })
  } else {
    res.json({ success: false, error: 'Incorrect password.' })
  }
})

app.post('/api/admin/logout', (_req, res) => {
  res.json({ success: true })
})

app.get('/api/admin/check', (req, res) => {
  const auth = req.headers['authorization']
  res.json({ authenticated: auth === `Bearer ${adminToken()}` })
})

/* ── Admin: members ──────────────────────────────────────── */

app.get('/api/admin/members', adminOnly, async (req, res) => {
  try { res.json(await db.getAllMembers()) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/admin/members/:id', adminOnly, async (req, res) => {
  try { await db.deleteMember(req.params.id); res.json({ success: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── Admin: attendance ───────────────────────────────────── */

app.get('/api/admin/attendance-dates', adminOnly, async (req, res) => {
  try { res.json(await db.getAttendanceDates()) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/admin/attendance/:date', adminOnly, async (req, res) => {
  try { res.json(await db.getAttendanceForDate(req.params.date)) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/admin/attendance', adminOnly, async (req, res) => {
  try {
    const { member_id, date } = req.body
    const member = await db.findMember(member_id.trim().toUpperCase())
    if (!member) return res.json({ success: false, error: 'Member not found.' })
    const marked = await db.markAttendance(member.member_id, date)
    res.json({ success: true, alreadyMarked: !marked })
  } catch (e) {
    res.json({ success: false, error: e.message })
  }
})

app.delete('/api/admin/attendance/:memberId/:date', adminOnly, async (req, res) => {
  try {
    await db.removeAttendance(req.params.memberId, req.params.date)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── Admin: PDF report ───────────────────────────────────── */

function meetingLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  if (day === 0) return 'Sunday Service'
  if (day === 1) return 'Bible Study Attendance'
  if (day === 3) return 'Manna Water'
  if (day === 6 && d.getDate() <= 7) return 'Power Must Change Hands'
  return null
}

app.get('/api/admin/pdf/:date', adminOnly, async (req, res) => {
  try {
    const date    = req.params.date
    const rows    = await db.getAttendanceForDate(date)
    const present = rows.filter(r => r.present)
    const absent  = rows.filter(r => !r.present)

    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${date}.pdf"`)
    doc.pipe(res)

    doc.fontSize(16).font('Helvetica-Bold')
      .text('MFMCF Campus Fellowship · UNIOSUN Osogbo', { align: 'center' })
    doc.fontSize(12).font('Helvetica')
      .text(`Attendance Report — ${date}`, { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(11)
      .text(`Total: ${rows.length}   Present: ${present.length}   Absent: ${absent.length}`, { align: 'center' })
    doc.moveDown()

    const section = (title, list) => {
      if (!list.length) return
      doc.fontSize(12).font('Helvetica-Bold').text(title)
      doc.moveDown(0.3)
      list.forEach((r, i) => {
        doc.fontSize(10).font('Helvetica')
          .text(`${i + 1}. ${r.name} (${r.member_id})${r.church_dept ? ' — ' + r.church_dept : ''}`)
      })
      doc.moveDown()
    }

    section('PRESENT', present)
    section('ABSENT', absent)
    doc.end()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ── Admin: CSV export ───────────────────────────────────── */

app.get('/api/admin/csv/members', adminOnly, async (req, res) => {
  try {
    const members = await db.getAllMembers()
    const header  = 'Member ID,Name,Phone,Church Dept,School Dept,Level,Birthday,Joined\r\n'
    const rows    = members.map(m =>
      [
        m.member_id, m.name, m.phone || '',
        m.church_dept || '', m.school_dept || '', m.level || '',
        m.birthday || '',
        m.created_at ? m.created_at.split('T')[0] : '',
      ]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
    ).join('\r\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="mfmcf-members.csv"')
    res.send(header + rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ── Export for Vercel ───────────────────────────────────── */
module.exports = app

// Local development only
if (require.main === module) {
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => console.log(`API server → http://localhost:${PORT}`))
}
