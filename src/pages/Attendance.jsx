import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanLine, ChevronLeft, RefreshCw, UserPlus } from 'lucide-react'
import { Logo } from '../components/Logo'

const todayLabel = new Date().toLocaleDateString('en-GB', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

const PREFIX = `MFMC-${new Date().getFullYear()}-`

export default function Attendance() {
  const navigate  = useNavigate()
  const [id, setId]           = useState(PREFIX)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState(null)

  async function mark() {
    const trimmed = id.trim().toUpperCase()
    if (!trimmed) { setError('Please enter your Member ID.'); return }
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: trimmed }),
      })
      const data = await res.json()
      if (data.success) setResult(data)
      else setError(data.error || 'Something went wrong. Please try again.')
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  function handleIdChange(e) {
    const upper = e.target.value.toUpperCase()
    setId(upper.startsWith(PREFIX) ? upper : PREFIX)
  }

  function reset() { setId(PREFIX); setError(''); setResult(null) }

  /* ── Success ── */
  if (result) {
    const isRepeat = result.alreadyMarked
    return (
      <div className="shell">
        <div className="shell-head">
          <div className="shell-logo-row">
            <Logo size={40} onDark />
            <div className="shell-logo-info">
              <div className="shell-brand">MFMCF Campus Fellowship</div>
              <div className="shell-location">UNIOSUN · OSOGBO</div>
            </div>
          </div>
          <h1>{isRepeat ? 'Already Marked' : 'Attendance Recorded'}</h1>
          <p>{todayLabel}</p>
        </div>
        <div className="shell-body">
          <div className="shell-inner">
            <div className="card pop-in" style={{ textAlign:'center', padding:'2.25rem 1.75rem' }}>
              <div className="att-success">
                <div className="check-anim">
                  <div className="check-anim-ring" />
                  <div className={`check-anim-circle ${isRepeat ? 'already-circle' : ''}`}>
                    <svg className="check-svg" viewBox="0 0 48 48">
                      <polyline points="10,24 20,34 38,14" />
                    </svg>
                  </div>
                </div>
                <div className="att-name">{result.name}</div>
                <div className={`att-msg ${isRepeat ? 'repeat' : 'ok'}`}>
                  {isRepeat ? '⚠ Already marked for today' : '✓ Attendance marked successfully!'}
                </div>
                <div className="att-date">{todayLabel}</div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={reset}>
              <RefreshCw size={15} /> Mark Another Member
            </button>
            <Link to="/" className="btn btn-ghost">← Back to Home</Link>
          </div>
        </div>
      </div>
    )
  }

  /* ── Input ── */
  return (
    <div className="shell">
      <div className="shell-head">
        <button className="shell-back" onClick={() => navigate('/')} aria-label="Back">
          <ChevronLeft size={20} />
        </button>
        <div className="shell-logo-row">
          <Logo size={40} onDark />
          <div className="shell-logo-info">
            <div className="shell-brand">MFMCF Campus Fellowship</div>
            <div className="shell-location">UNIOSUN · OSOGBO</div>
          </div>
        </div>
        <h1>Mark Attendance</h1>
        <p>{todayLabel}</p>
      </div>

      <div className="shell-body">
        <div className="shell-inner">
          <div className="card fade-up">

            {/* Scan icon */}
            <div className="att-icon-wrap">
              <div className="att-icon-ring">
                <ScanLine size={30} color="var(--p500)" />
              </div>
            </div>

            <p className="card-title" style={{ textAlign:'center', marginBottom:'.25rem' }}>
              Enter Your Member ID
            </p>
            <p style={{ textAlign:'center', fontSize:'.85rem', color:'var(--g400)', marginBottom:'1.5rem' }}>
              The unique ID you received when you registered
            </p>

            <div className="att-id-field">
              <input
                className="att-id-input"
                type="text" value={id}
                onChange={handleIdChange}
                onKeyDown={e => e.key === 'Enter' && mark()}
                placeholder={`${PREFIX}0001`}
                autoComplete="off" autoFocus
              />
            </div>

            {error && (
              <div className="alert alert-err"><span>⚠</span> {error}</div>
            )}

            <button className="btn btn-flame" onClick={mark} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Mark My Attendance ✓'}
            </button>
          </div>

          <Link to="/register" className="btn btn-outline">
            <UserPlus size={15} /> Don't have an ID? Register here
          </Link>
          <Link to="/" className="btn btn-ghost" style={{ marginTop:'.5rem' }}>← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
