require('dotenv').config()

const express      = require('express')
const crypto       = require('crypto')
const fs           = require('fs')
const path         = require('path')
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
    const { name, phone, church_dept, school_dept, level, birthday, hostel } = req.body
    if (!name?.trim()) return res.json({ success: false, error: 'Name is required.' })
    const result = await db.addMember({ name, phone, church_dept, school_dept, level, birthday, hostel })
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
    const { member_id, is_executive, groups } = req.body
    if (!member_id) return res.json({ success: false, error: 'Member ID required.' })
    const member = await db.findMember(member_id.trim().toUpperCase())
    if (!member) return res.json({ success: false, error: 'Member ID not found. Please check and try again.' })
    const today  = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Lagos' }).split(' ')[0]
    const marked = await db.markAttendance(member.member_id, today, {
      is_executive: !!is_executive,
      groups: Array.isArray(groups) ? groups : [],
    })
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
    if (!member) return res.json({ success: false, error: `No member found with ID "${member_id.trim().toUpperCase()}". Make sure the ID is correct.` })
    const marked = await db.markAttendance(member.member_id, date)
    res.json({ success: true, name: member.name, alreadyMarked: !marked })
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

/* ── Meeting label ───────────────────────────────────────── */

function meetingLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  if (day === 0) return 'Sunday Service'
  if (day === 1) return 'Bible Study Attendance'
  if (day === 3) return 'Manna Water'
  if (day === 6 && d.getDate() <= 7) return 'Power Must Change Hands'
  return null
}

/* ── PDF table helper ────────────────────────────────────── */

function pdfTable(doc, columns, data, x, rowH) {
  if (!data.length) return
  const W   = columns.reduce((s, c) => s + c.w, 0)
  const btm = doc.page.height - doc.page.margins.bottom - 25

  function header(atY) {
    doc.rect(x, atY, W, rowH).fill('#6b21a8')
    let cx = x
    columns.forEach(col => {
      doc.fillColor('#fff').fontSize(6.5).font('Helvetica-Bold')
        .text(col.label, cx + 3, atY + Math.floor((rowH - 6.5) / 2), { width: col.w - 6, lineBreak: false })
      cx += col.w
    })
    return atY + rowH
  }

  let y = header(doc.y)

  data.forEach((row, i) => {
    if (y + rowH > btm) { doc.addPage(); y = doc.page.margins.top; y = header(y) }
    doc.rect(x, y, W, rowH).fill(i % 2 === 0 ? '#ffffff' : '#f5f3ff')
    let cx = x
    columns.forEach(col => {
      doc.fillColor('#0f172a').fontSize(7).font('Helvetica')
        .text(String(col.get(row, i) ?? '—'), cx + 3, y + Math.floor((rowH - 7) / 2), {
          width: col.w - 6, lineBreak: false, ellipsis: true,
        })
      cx += col.w
    })
    doc.moveTo(x, y + rowH).lineTo(x + W, y + rowH).lineWidth(0.2).stroke('#e2e8f0')
    y += rowH
  })

  doc.y = y
}

/* ── Admin: PDF report ───────────────────────────────────── */

app.get('/api/admin/pdf/:date', adminOnly, async (req, res) => {
  try {
    const date    = req.params.date
    const rows    = await db.getAttendanceForDate(date)
    const present = rows.filter(r => r.present)
    const absent  = rows.filter(r => !r.present)
    const label   = meetingLabel(date)
    const rate    = rows.length ? Math.round(present.length / rows.length * 100) : 0
    const fmtD    = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const doc = new PDFDocument({ margin: 45, size: 'A4' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="MFMCF-Attendance-${date}.pdf"`)
    doc.pipe(res)

    const ML = 45
    const PW = doc.page.width   // 595.28
    const UW = PW - ML * 2     // 505.28

    // ── Logo ─────────────────────────────────────────────────
    let afterLogo = ML
    try {
      const lp = path.join(__dirname, '../public/logo.png')
      if (fs.existsSync(lp)) {
        doc.image(lp, (PW - 54) / 2, ML, { width: 54 })
        afterLogo = ML + 62
      }
    } catch {}

    // ── Church header ─────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#6b21a8')
      .text('MFMCF CAMPUS FELLOWSHIP', ML, afterLogo, { align: 'center', width: UW })
    doc.fontSize(8).font('Helvetica').fillColor('#6b7280')
      .text('Mountain of Fire and Miracles Crusade · UNIOSUN Osogbo', ML, doc.y + 1, { align: 'center', width: UW })

    if (label) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#9c1bb8')
        .text(label, ML, doc.y + 5, { align: 'center', width: UW })
    }

    doc.fontSize(8.5).font('Helvetica').fillColor('#374151')
      .text(`Attendance Report · ${fmtD}`, ML, doc.y + 3, { align: 'center', width: UW })

    // Divider
    const divY = doc.y + 7
    doc.moveTo(ML, divY).lineTo(ML + UW, divY).lineWidth(1.5).stroke('#9c1bb8')

    // ── Summary bar ────────────────────────────────────────────
    const sumY = divY + 8
    doc.rect(ML, sumY, UW, 20).fill('#6b21a8')
    doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold')
      .text(
        `Total Registered: ${rows.length}     Present: ${present.length}     Absent: ${absent.length}     Rate: ${rate}%`,
        ML + 6, sumY + 6, { width: UW - 12, align: 'center', lineBreak: false }
      )
    doc.y = sumY + 28

    // ── Present table ──────────────────────────────────────────
    if (present.length) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#16a34a')
        .text(`PRESENT  (${present.length})`, ML, doc.y)
      doc.y += 4

      pdfTable(doc, [
        { label: '#',           w: 22,  get: (_, i) => String(i + 1) },
        { label: 'MEMBER ID',   w: 88,  get: r => r.member_id },
        { label: 'FULL NAME',   w: 140, get: r => r.name },
        { label: 'CHURCH DEPT', w: 95,  get: r => r.church_dept || '—' },
        { label: 'GROUP(S)',    w: 75,  get: r => (r.groups || []).join(', ') || '—' },
        { label: 'EXEC',        w: 33,  get: r => r.is_executive ? 'Yes' : '—' },
        { label: 'TIME IN',     w: 52,  get: r => r.marked_at ? r.marked_at.split(' ')[1] || '—' : '—' },
      ], present, ML, 17)

      doc.y += 12
    }

    // ── Absent table ───────────────────────────────────────────
    if (absent.length) {
      if (doc.y > doc.page.height - 140) { doc.addPage(); doc.y = ML }

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#dc2626')
        .text(`ABSENT  (${absent.length})`, ML, doc.y)
      doc.y += 4

      pdfTable(doc, [
        { label: '#',           w: 22,  get: (_, i) => String(i + 1) },
        { label: 'MEMBER ID',   w: 88,  get: r => r.member_id },
        { label: 'FULL NAME',   w: 200, get: r => r.name },
        { label: 'CHURCH DEPT', w: 195, get: r => r.church_dept || '—' },
      ], absent, ML, 17)
    }

    // ── Footer ─────────────────────────────────────────────────
    doc.moveDown(1.5)
    if (doc.y < doc.page.height - 55) {
      doc.moveTo(ML, doc.y).lineTo(ML + UW, doc.y).lineWidth(0.5).stroke('#d1d5db')
      doc.fontSize(6.5).font('Helvetica').fillColor('#9ca3af')
        .text(
          `MFMCF Campus Fellowship Attendance System  ·  Generated: ${new Date().toLocaleString('en-GB')}`,
          ML, doc.y + 5, { align: 'center', width: UW }
        )
    }

    doc.end()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/* ── Admin: CSV export ───────────────────────────────────── */

app.get('/api/admin/csv/members', adminOnly, async (req, res) => {
  try {
    const members = await db.getAllMembers()
    const header  = 'Member ID,Name,Phone,Hostel/Address,Church Dept,School Dept,Level,Birthday,Joined\r\n'
    const rows    = members.map(m =>
      [
        m.member_id, m.name, m.phone || '',
        m.hostel || '',
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
