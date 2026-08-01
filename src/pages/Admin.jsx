import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarCheck, FileBarChart2,
  LogOut, Search, Download, Trash2, CheckCircle2, XCircle,
  Copy, QrCode, CalendarDays, UserCheck, UserX, RefreshCw,
} from 'lucide-react'
import { Logo } from '../components/Logo'

function authFetch(url, opts = {}) {
  const token = localStorage.getItem('mfmcf_admin_token') || ''
  return fetch(url, {
    ...opts,
    headers: { ...opts.headers, 'Authorization': `Bearer ${token}` },
  })
}

function downloadUrl(path) {
  const token = localStorage.getItem('mfmcf_admin_token') || ''
  return `${path}?token=${encodeURIComponent(token)}`
}

function meetingLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  if (day === 0) return 'Sunday Service'
  if (day === 1) return 'Bible Study Attendance'
  if (day === 3) return 'Manna Water'
  if (day === 6 && d.getDate() <= 7) return 'Power Must Change Hands'
  return null
}

const TODAY         = new Date().toISOString().split('T')[0]
const MANUAL_PREFIX = `MFMC-${new Date().getFullYear()}-`

const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
})

export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab]           = useState('dashboard')
  const [members, setMembers]   = useState([])
  const [dates, setDates]       = useState([])
  const [search, setSearch]     = useState('')
  const [attDate, setAttDate]   = useState(TODAY)
  const [attRows, setAttRows]   = useState(null)
  const [attLoading, setAttLoading] = useState(false)
  const [attError, setAttError] = useState('')
  const [pdfDate, setPdfDate]   = useState(TODAY)
  const [manualId, setManualId] = useState(MANUAL_PREFIX)
  const [markError, setMarkError] = useState('')
  const [notice, setNotice]     = useState(null)
  const [regUrl, setRegUrl]     = useState('')

  const loadData = useCallback(async () => {
    try {
      const [mRes, dRes] = await Promise.all([
        authFetch('/api/admin/members'),
        authFetch('/api/admin/attendance-dates'),
      ])
      const mData = await mRes.json()
      const dData = await dRes.json()
      setMembers(Array.isArray(mData) ? mData : [])
      setDates(Array.isArray(dData) ? dData : [])
    } catch (e) {
      console.error('Failed to load admin data:', e)
      setMembers([])
      setDates([])
    }
  }, [])

  useEffect(() => {
    setRegUrl(window.location.origin + '/register')
    authFetch('/api/admin/check')
      .then(r => r.json())
      .then(d => { if (!d.authenticated) navigate('/admin/login'); else loadData() })
  }, [navigate, loadData])

  const loadAttendance = useCallback(async () => {
    if (!attDate) return
    setAttLoading(true); setAttRows(null); setAttError('')
    try {
      const r    = await authFetch(`/api/admin/attendance/${attDate}`)
      const data = await r.json()
      if (!Array.isArray(data)) throw new Error(data.error || 'Unexpected server response.')
      setAttRows(data)
    } catch (e) {
      setAttError(e.message || 'Failed to load attendance. Check your connection.')
      setAttRows([])
    } finally {
      setAttLoading(false)
    }
  }, [attDate])

  // Silent background refresh — keeps table visible while updating
  const refreshAttendance = useCallback(async () => {
    if (!attDate) return
    try {
      const r    = await authFetch(`/api/admin/attendance/${attDate}`)
      const data = await r.json()
      if (Array.isArray(data)) setAttRows(data)
    } catch { /* silent — user sees stale data rather than an error */ }
  }, [attDate])

  useEffect(() => {
    if (tab === 'attendance') loadAttendance()
  }, [tab, loadAttendance])

  // Auto-refresh every 30 s while on the Attendance tab
  useEffect(() => {
    if (tab !== 'attendance') return
    const id = setInterval(refreshAttendance, 30000)
    return () => clearInterval(id)
  }, [tab, refreshAttendance])

  async function logout() {
    localStorage.removeItem('mfmcf_admin_token')
    navigate('/admin/login')
  }

  async function deleteMember(id, name) {
    if (!confirm(`Delete "${name}" (${id})?\nThis will also remove all their attendance records.`)) return
    await authFetch(`/api/admin/members/${id}`, { method: 'DELETE' })
    setMembers(m => m.filter(x => x.member_id !== id))
    flash('ok', `${name} removed.`)
  }

  function handleManualIdChange(e) {
    const upper = e.target.value.toUpperCase()
    setManualId(upper.startsWith(MANUAL_PREFIX) ? upper : MANUAL_PREFIX)
    setMarkError('')
  }

  async function manualMark() {
    const id = manualId.trim().toUpperCase()
    if (!id || id === MANUAL_PREFIX) { setMarkError('Please enter a Member ID.'); return }
    if (!attDate) { setMarkError('No date selected.'); return }
    setMarkError('')
    try {
      const r = await authFetch('/api/admin/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: id, date: attDate }),
      })
      const d = await r.json()
      if (d.success) {
        setManualId(MANUAL_PREFIX)
        loadAttendance()
        const name = d.name || id
        flash('ok', d.alreadyMarked
          ? `${name} was already marked present.`
          : `${name} marked present ✓`)
      } else {
        setMarkError(d.error || 'Member not found.')
      }
    } catch {
      setMarkError('Network error. Check your connection and try again.')
    }
  }

  async function removeAtt(memberId, date) {
    if (!confirm('Remove this attendance record?')) return
    await authFetch(`/api/admin/attendance/${memberId}/${date}`, { method: 'DELETE' })
    loadAttendance()
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(regUrl)
    flash('ok', 'Registration link copied!')
  }

  function flash(type, msg) {
    setNotice({ type, msg })
    setTimeout(() => setNotice(null), 3200)
  }

  const todayCount    = dates.find(d => d.date === TODAY)?.count ?? 0
  const filteredM     = members.filter(m =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.member_id.toLowerCase().includes(search.toLowerCase()) ||
    (m.church_dept || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.school_dept || '').toLowerCase().includes(search.toLowerCase())
  )
  const attPresent = attRows?.filter(r => r.present) ?? []
  const attAbsent  = attRows?.filter(r => !r.present) ?? []

  const TABS = [
    { id: 'dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
    { id: 'members',    label: 'Members',     Icon: Users           },
    { id: 'attendance', label: 'Attendance',  Icon: CalendarCheck   },
    { id: 'reports',    label: 'Reports',     Icon: FileBarChart2   },
  ]

  return (
    <div className="admin">

      {/* ── Top bar ── */}
      <div className="admin-bar">
        <div className="admin-bar-left">
          <div className="admin-bar-emblem">
            <Logo size={36} onDark style={{ borderRadius: 'var(--r-md)' }} />
          </div>
          <div>
            <div className="admin-bar-church">MFMCF Campus Fellowship · UNIOSUN Osogbo</div>
            <div className="admin-bar-title">Admin Dashboard</div>
          </div>
        </div>
        <button className="admin-bar-logout" onClick={logout}>
          <LogOut size={13} /> Logout
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id}
            className={`admin-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="admin-body">
        <div className="admin-wrap">

          {notice && (
            <div className={`notice ${notice.type === 'ok' ? 'notice-ok' : 'notice-err'}`}>
              {notice.type === 'ok' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {notice.msg}
            </div>
          )}

          {/* ══ DASHBOARD ══ */}
          {tab === 'dashboard' && (
            <div className="fade-up">
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-icon purple"><Users size={20} /></div>
                  <div>
                    <div className="stat-val">{members.length}</div>
                    <div className="stat-lbl">Total Members</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green"><UserCheck size={20} /></div>
                  <div>
                    <div className="stat-val" style={{ color:'var(--ok)' }}>{todayCount}</div>
                    <div className="stat-lbl">Today Present</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon flame"><CalendarDays size={20} /></div>
                  <div>
                    <div className="stat-val">{dates.length}</div>
                    <div className="stat-lbl">Sundays Logged</div>
                  </div>
                </div>
              </div>

              {/* QR link */}
              <div className="sec">
                <div className="sec-head">
                  <h3><QrCode size={15} /> Registration Link</h3>
                  <button className="abtn abtn-ghost" onClick={copyUrl}>
                    <Copy size={13} /> Copy Link
                  </button>
                </div>
                <div className="sec-body">
                  <p style={{ fontSize:'.85rem', color:'var(--g500)', marginBottom:'.5rem' }}>
                    Share this URL as a QR code so members can scan and register:
                  </p>
                  <div className="url-box" onClick={copyUrl}>{regUrl}</div>
                  <p style={{ fontSize:'.75rem', color:'var(--g400)' }}>
                    Generate a QR code at qr-code-generator.com using the link above — print it for Sunday service.
                  </p>
                </div>
              </div>

              {/* Recent dates */}
              <div className="sec">
                <div className="sec-head">
                  <h3><CalendarCheck size={15} /> Recent Attendance Dates</h3>
                  <button className="abtn abtn-ghost" onClick={loadData}>
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
                <div className="sec-body">
                  {dates.length === 0
                    ? <p style={{ color:'var(--g400)', fontSize:'.875rem' }}>No attendance recorded yet.</p>
                    : dates.slice(0, 10).map(d => (
                      <div className="date-item" key={d.date}>
                        <div>
                          <span style={{ fontFamily:'var(--ff-body)' }}>{fmtDate(d.date)}</span>
                          {meetingLabel(d.date) && (
                            <div style={{ fontSize:'.72rem', color:'var(--p500)', fontWeight:600, marginTop:'.1rem' }}>
                              {meetingLabel(d.date)}
                            </div>
                          )}
                        </div>
                        <span className="chip chip-green">{d.count} present</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* ══ MEMBERS ══ */}
          {tab === 'members' && (
            <div className="fade-up">

              {/* Logo header */}
              <div style={{
                display:'flex', alignItems:'center', gap:'1rem',
                background:'linear-gradient(135deg, var(--p900), var(--p700))',
                borderRadius:'var(--r-lg)', padding:'1.1rem 1.4rem',
                marginBottom:'1rem',
                boxShadow:'var(--sh-brand)',
              }}>
                <Logo size={52} onDark />
                <div>
                  <div style={{ fontFamily:'var(--ff-display)', fontWeight:800, fontSize:'1rem', color:'#fff' }}>
                    MFMCF Campus Fellowship
                  </div>
                  <div style={{ fontSize:'.68rem', color:'rgba(255,255,255,.55)', letterSpacing:'.08em', textTransform:'uppercase', marginTop:'.15rem' }}>
                    UNIOSUN · OSOGBO — Members List
                  </div>
                </div>
                <div style={{ marginLeft:'auto', textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--ff-display)', fontWeight:900, fontSize:'1.75rem', color:'#fff', lineHeight:1 }}>
                    {members.length}
                  </div>
                  <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.06em' }}>
                    Total
                  </div>
                </div>
              </div>

              <div className="toolbar" style={{ marginBottom:'.5rem' }}>
                <span style={{ fontSize:'.8rem', color:'var(--g400)', flex:1 }}>
                  {members.length} member{members.length !== 1 ? 's' : ''} registered
                </span>
                <button className="abtn abtn-ghost" onClick={loadData}>
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>
              <div className="toolbar" style={{ marginTop:0 }}>
                <div style={{ position:'relative', flex:1, minWidth:0 }}>
                  <Search size={15} style={{ position:'absolute', left:'.85rem', top:'50%', transform:'translateY(-50%)', color:'var(--g400)' }} />
                  <input
                    className="search-input" style={{ paddingLeft:'2.5rem' }}
                    placeholder="Search name, ID, or department…"
                    value={search} onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <a href={downloadUrl('/api/admin/csv/members')} className="abtn abtn-green">
                  <Download size={13} /> CSV
                </a>
              </div>

              {search && (
                <p style={{ fontSize:'.75rem', color:'var(--g400)', marginBottom:'.75rem' }}>
                  Showing {filteredM.length} of {members.length} members
                </p>
              )}

              <div className="sec">
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Member ID</th><th>Name</th><th>Phone</th>
                        <th>Hostel / Address</th>
                        <th>Church Dept</th><th>School Dept</th><th>Level</th>
                        <th>Birthday</th><th>Joined</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredM.length === 0
                        ? <tr><td colSpan={9} className="state-empty">No members found.</td></tr>
                        : filteredM.map(m => (
                          <tr key={m.member_id}>
                            <td><span className="chip">{m.member_id}</span></td>
                            <td><strong>{m.name}</strong></td>
                            <td style={{ color:'var(--g500)' }}>{m.phone || '—'}</td>
                            <td style={{ color:'var(--g500)' }}>{m.hostel || '—'}</td>
                            <td>{m.church_dept || '—'}</td>
                            <td>{m.school_dept || '—'}</td>
                            <td>{m.level || '—'}</td>
                            <td style={{ color:'var(--g500)' }}>{m.birthday || '—'}</td>
                            <td style={{ fontSize:'.75rem', color:'var(--g400)', whiteSpace:'nowrap' }}>
                              {m.created_at?.split(' ')[0] || '—'}
                            </td>
                            <td>
                              <button className="del-btn"
                                      onClick={() => deleteMember(m.member_id, m.name)}>
                                <Trash2 size={11} /> Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ ATTENDANCE ══ */}
          {tab === 'attendance' && (
            <div className="fade-up">
              <div className="date-row">
                <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} />
                <span style={{ fontSize:'.72rem', color:'var(--ok)', display:'flex', alignItems:'center', gap:'.3rem', whiteSpace:'nowrap' }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--ok)', display:'inline-block', animation:'pulse 2s infinite' }} />
                  Live
                </span>
                <button className="abtn abtn-purple" onClick={loadAttendance} disabled={attLoading}>
                  {attLoading ? <span className="spinner" /> : 'Refresh'}
                </button>
              </div>

              {attError && <div className="alert alert-err"><span>⚠</span> {attError}</div>}

              {attLoading && !attRows && (
                <div className="sec"><div className="state-loading">Loading attendance…</div></div>
              )}

              {attRows && (
                <>
                  {/* Meeting type banner */}
                  {meetingLabel(attDate) && (
                    <div style={{
                      background:'linear-gradient(135deg, var(--p900), var(--p700))',
                      borderRadius:'var(--r-md)', padding:'.65rem 1rem',
                      marginBottom:'.75rem', display:'flex', alignItems:'center', gap:'.6rem',
                    }}>
                      <CalendarCheck size={15} color="rgba(255,255,255,.7)" />
                      <span style={{ fontFamily:'var(--ff-display)', fontWeight:700, color:'#fff', fontSize:'.9rem' }}>
                        {meetingLabel(attDate)}
                      </span>
                      <span style={{ marginLeft:'auto', fontSize:'.75rem', color:'rgba(255,255,255,.5)' }}>
                        {fmtDate(attDate)}
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="stats-row" style={{ marginBottom:'1rem' }}>
                    <div className="stat-card">
                      <div className="stat-icon green"><UserCheck size={20} /></div>
                      <div>
                        <div className="stat-val" style={{ color:'var(--ok)' }}>{attPresent.length}</div>
                        <div className="stat-lbl">Present</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon" style={{ background:'var(--err-l)', color:'var(--err)' }}>
                        <UserX size={20} />
                      </div>
                      <div>
                        <div className="stat-val" style={{ color:'var(--err)' }}>{attAbsent.length}</div>
                        <div className="stat-lbl">Absent</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon purple"><Users size={20} /></div>
                      <div>
                        <div className="stat-val">{members.length}</div>
                        <div className="stat-lbl">Registered</div>
                      </div>
                    </div>
                  </div>

                  {/* Manual mark */}
                  <div className="sec" style={{ marginBottom:'1rem' }}>
                    <div className="sec-head"><h3><CheckCircle2 size={15} /> Manually Mark Present</h3></div>
                    <div className="sec-body">
                      <p style={{ fontSize:'.8rem', color:'var(--g400)', marginBottom:'.6rem' }}>
                        Type the last digits of the Member ID — e.g. <strong>MFMC-2026-0001</strong>
                      </p>
                      <div className="mark-row">
                        <input
                          value={manualId}
                          onChange={handleManualIdChange}
                          onKeyDown={e => e.key === 'Enter' && manualMark()}
                          placeholder={`${MANUAL_PREFIX}0001`}
                          style={{ fontFamily:'var(--ff-display)', fontWeight:600, letterSpacing:'.02em' }}
                        />
                        <button className="abtn abtn-green" onClick={manualMark}>Mark Present</button>
                      </div>
                      {markError && (
                        <div className="alert alert-err" style={{ marginTop:'.6rem' }}>
                          <span>⚠</span> {markError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="sec">
                    <div className="sec-head">
                      <h3><CalendarCheck size={15} /> {meetingLabel(attDate) || fmtDate(attDate)}</h3>
                      <button className="abtn abtn-purple"
                              onClick={() => window.open(downloadUrl(`/api/admin/pdf/${attDate}`), '_blank')}>
                        <Download size={13} /> PDF
                      </button>
                    </div>
                    <div className="tbl-wrap">
                      <table>
                        <thead>
                          <tr><th>#</th><th>Member ID</th><th>Name / Role</th><th>Church Dept</th><th>Status</th><th>Time</th></tr>
                        </thead>
                        <tbody>
                          {attLoading
                            ? <tr><td colSpan={6} className="state-loading">Loading…</td></tr>
                            : attRows.map((r, i) => (
                              <tr key={r.member_id}
                                  style={{ background: r.present ? 'rgba(22,163,74,.04)' : undefined }}>
                                <td style={{ color:'var(--g400)', fontSize:'.75rem' }}>{i + 1}</td>
                                <td><span className="chip">{r.member_id}</span></td>
                                <td>
                                  <strong>{r.name}</strong>
                                  {r.present && (
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:'.25rem', marginTop:'.25rem' }}>
                                      {r.is_executive && (
                                        <span className="chip chip-purple" style={{ fontSize:'.65rem', padding:'.1rem .45rem' }}>Executive</span>
                                      )}
                                      {(r.groups || []).map(g => (
                                        <span key={g} className="chip" style={{ fontSize:'.65rem', padding:'.1rem .45rem' }}>{g}</span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td style={{ color:'var(--g500)' }}>{r.church_dept || '—'}</td>
                                <td>
                                  <span className={`chip ${r.present ? 'chip-green' : 'chip-red'}`}>
                                    {r.present ? 'Present' : 'Absent'}
                                  </span>
                                </td>
                                <td style={{ fontSize:'.78rem', color:'var(--g400)' }}>
                                  {r.marked_at
                                    ? <>{r.marked_at.split(' ')[1]}
                                        <button className="del-btn" style={{ marginLeft:'.4rem' }}
                                                onClick={() => removeAtt(r.member_id, attDate)}>
                                          <XCircle size={10} />
                                        </button>
                                      </>
                                    : '—'}
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {attRows && attRows.length === 0 && !attLoading && (
                <div className="sec">
                  <div className="state-empty">
                    <CalendarCheck size={36} style={{ margin:'0 auto .75rem', display:'block', opacity:.25 }} />
                    No members found. Register members first, then mark attendance.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ REPORTS ══ */}
          {tab === 'reports' && (
            <div className="fade-up">
              <div className="sec">
                <div className="sec-head"><h3><FileBarChart2 size={15} /> Attendance PDF Report</h3></div>
                <div className="sec-body">
                  <p style={{ fontSize:'.875rem', color:'var(--g500)', marginBottom:'1rem' }}>
                    Download a printable PDF showing present and absent members for a specific Sunday.
                  </p>
                  <div className="date-row">
                    <input type="date" value={pdfDate} onChange={e => setPdfDate(e.target.value)} />
                    <button className="abtn abtn-purple"
                            onClick={() => pdfDate && window.open(downloadUrl(`/api/admin/pdf/${pdfDate}`), '_blank')}>
                      <Download size={13} /> Download PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="sec">
                <div className="sec-head"><h3><Users size={15} /> Members List (CSV)</h3></div>
                <div className="sec-body">
                  <p style={{ fontSize:'.875rem', color:'var(--g500)', marginBottom:'1rem' }}>
                    Export all registered members as a spreadsheet — open in Excel or Google Sheets.
                  </p>
                  <a href={downloadUrl('/api/admin/csv/members')} className="abtn abtn-green">
                    <Download size={13} /> Download Members CSV
                  </a>
                </div>
              </div>

              <div className="sec">
                <div className="sec-head"><h3><QrCode size={15} /> Registration QR Link</h3></div>
                <div className="sec-body">
                  <p style={{ fontSize:'.875rem', color:'var(--g500)' }}>
                    Generate a QR code from the link below and print it for Sunday service.
                  </p>
                  <div className="url-box" onClick={copyUrl}>{regUrl}</div>
                  <button className="abtn abtn-outline" onClick={copyUrl}>
                    <Copy size={13} /> Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
