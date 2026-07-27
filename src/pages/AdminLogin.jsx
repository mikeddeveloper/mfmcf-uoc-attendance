import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Logo } from '../components/Logo'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [pwd, setPwd]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [showPwd, setShowPwd] = useState(false)

  async function login() {
    if (!pwd) { setError('Please enter the admin password.'); return }
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('mfmcf_admin_token', data.token)
        navigate('/admin')
      } else setError(data.error || 'Incorrect password.')
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-ring login-ring-1" />
      <div className="login-ring login-ring-2" />

      <div className="login-card pop-in">

        {/* Logo */}
        <div className="login-logo-wrap">
          <Logo size={64} onDark={false} />
        </div>

        <div className="login-org">MFMCF Campus Fellowship</div>
        <h1 className="login-title">Admin Access</h1>
        <p className="login-sub">Authorized personnel only</p>

        <div className="login-divider" />

        <div className="field">
          <label className="field-label">Admin Password</label>
          <div className="input-wrap">
            <span className="input-icon"><Lock size={15} /></span>
            <input
              type={showPwd ? 'text' : 'password'}
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Enter admin password"
              autoFocus autoComplete="current-password"
            />
            <button
              type="button"
              className="input-toggle"
              onClick={() => setShowPwd(v => !v)}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-err"><span>⚠</span> {error}</div>}

        <button className="btn btn-primary" onClick={login} disabled={loading}>
          {loading
            ? <span className="spinner" />
            : <><span>Login to Dashboard</span><ArrowRight size={16} /></>}
        </button>

        <Link to="/" className="login-back">← Back to Home</Link>
      </div>
    </div>
  )
}
