import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Phone, Building2, GraduationCap, Calendar,
  ChevronLeft, Copy, CheckCircle2, ArrowRight, Layers,
} from 'lucide-react'
import { Logo } from '../components/Logo'

const CHURCH_DEPTS = [
  'Choir / Music Team', 'Ushers', 'Media & Technical', 'Prayer Unit',
  'Evangelism & Outreach', 'Follow Up', 'Protocol', 'Drama & Creative Arts',
  'Welfare & Finance', 'Workers in Training', 'General Member',
]
const SCHOOL_COURSES = [
  {
    group: 'Health Sciences',
    courses: [
      'Medicine & Surgery', 'Nursing Science', 'Medical Laboratory Science',
      'Radiography & Radiation Science', 'Physiotherapy', 'Anatomy',
      'Physiology', 'Pharmacology', 'Dentistry', 'Public Health', 'Optometry',
      'Nutrition & Dietetics',
    ],
  },
  {
    group: 'Natural & Applied Sciences',
    courses: [
      'Computer Science', 'Biochemistry', 'Microbiology', 'Chemistry',
      'Physics', 'Mathematics', 'Statistics', 'Biology / Botany / Zoology',
      'Industrial Chemistry', 'Geology',
    ],
  },
  {
    group: 'Engineering & Technology',
    courses: [
      'Civil Engineering', 'Electrical / Electronic Engineering',
      'Mechanical Engineering', 'Computer Engineering',
      'Chemical Engineering', 'Agricultural Engineering',
      'Mechatronics Engineering', 'Information Technology',
      'Software Engineering',
    ],
  },
  {
    group: 'Environmental Sciences',
    courses: [
      'Architecture', 'Urban & Regional Planning',
      'Environmental Science', 'Surveying & Geoinformatics',
      'Geography & Planning', 'Building Technology',
      'Estate Management',
    ],
  },
  {
    group: 'Law & Social Sciences',
    courses: [
      'Law', 'Political Science', 'Sociology', 'Philosophy',
      'Psychology', 'History & International Studies',
      'Mass Communication / Journalism', 'English Language & Literature',
      'Religious Studies', 'Peace & Conflict Studies',
      'Library & Information Science',
    ],
  },
  {
    group: 'Management & Business',
    courses: [
      'Accounting', 'Business Administration', 'Banking & Finance',
      'Marketing', 'Public Administration', 'Economics',
      'Entrepreneurship', 'Insurance',
    ],
  },
  {
    group: 'Education',
    courses: [
      'Education & Computer Science', 'Education & Mathematics',
      'Education & English Language', 'Education & Biology',
      'Education & Chemistry', 'Education & Physics',
      'Education & Economics', 'Educational Management & Policy',
      'Guidance & Counselling',
    ],
  },
  {
    group: 'Agriculture & Food Science',
    courses: [
      'Agronomy / Crop Science', 'Animal Science', 'Fisheries & Aquaculture',
      'Food Science & Technology', 'Agricultural Economics & Extension',
      'Soil Science', 'Forestry & Wildlife',
    ],
  },
  {
    group: 'Arts & Performing Arts',
    courses: [
      'Fine & Applied Arts', 'Theatre Arts', 'Music',
      'Yoruba Language & Literature', 'French Language',
      'Arabic & Islamic Studies',
    ],
  },
]
const LEVELS = [
  '100 Level', '200 Level', '300 Level', '400 Level',
  '500 Level', '600 Level', '700 Level', 'Masters', 'PhD', 'Not a Student',
]

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm]         = useState({ name:'', phone:'', church_dept:'', school_dept:'', level:'', birthday:'' })
  const [customDept, setCustomDept] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [result, setResult]     = useState(null)
  const [copied, setCopied]     = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Full name is required.'); return }
    if (form.school_dept === 'Other' && !customDept.trim()) {
      setError('Please type your department / course.'); return
    }
    const payload = {
      ...form,
      school_dept: form.school_dept === 'Other' ? customDept.trim() : form.school_dept,
    }
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) setResult(data)
      else setError(data.error || 'Registration failed. Please try again.')
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.member_id)
      setCopied(true); setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copy your Member ID:', result.member_id)
    }
  }

  /* ── Success ── */
  if (result) {
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
          <h1>You're Registered! 🎉</h1>
          <p>Save your Member ID carefully</p>
        </div>

        <div className="shell-body">
          <div className="shell-inner">

            <div className="id-badge-wrap">
              <div className="id-badge">
                <div className="id-badge-church">MFMCF Campus Fellowship · UNIOSUN Osogbo</div>
                <div className="id-badge-label">Member ID</div>
                <div className="id-badge-number">{result.member_id}</div>
                <div className="id-badge-name">{result.name}</div>
                <div className="id-badge-pill">Active Member</div>
              </div>
            </div>

            <div className="card fade-up">
              <div className="card-eyebrow">Important</div>
              <p className="card-title">Save your Member ID!</p>
              <p style={{ fontSize:'.875rem', color:'var(--g500)', margin:'.3rem 0 1rem' }}>
                You will use this ID every Sunday to mark your attendance. Screenshot this page or write it down.
              </p>
              <div className="copy-box" onClick={copy} title="Click to copy">
                {result.member_id}
              </div>
              <button className="btn btn-outline" onClick={copy}>
                {copied
                  ? <><CheckCircle2 size={16} /> Copied!</>
                  : <><Copy size={16} /> Copy ID to Clipboard</>}
              </button>
            </div>

            <button className="btn btn-flame" onClick={() => navigate('/attendance')}>
              <CheckCircle2 size={16} /> Mark Today's Attendance
            </button>
            <Link to="/" className="btn btn-ghost">← Back to Home</Link>

          </div>
        </div>
      </div>
    )
  }

  /* ── Form ── */
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
        <h1>Member Registration</h1>
        <p>Fill in your details to get your Member ID</p>
      </div>

      <div className="shell-body">
        <div className="shell-inner">
          <form className="card fade-up" onSubmit={submit} noValidate>

            {/* Card banner */}
            <div className="card-banner">
              <div className="card-eyebrow">New Member</div>
              <p className="card-title">Registration Form</p>
              <p className="card-sub" style={{ marginBottom: 0 }}>
                Fields marked <span style={{ color:'var(--err)' }}>*</span> are required
              </p>
            </div>

            {/* ─ Personal ─ */}
            <div className="form-sect">
              <div className="sect-hd">
                <User size={12} /> Personal Information
              </div>

              <div className="field">
                <label className="field-label">Full Name <span className="field-req">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><User size={15} /></span>
                  <input type="text" value={form.name} onChange={set('name')}
                         placeholder="e.g. Chukwuemeka Adeyemi" autoComplete="name" autoFocus />
                </div>
              </div>

              <div className="field-row">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="field-label">Phone Number</label>
                  <div className="input-wrap">
                    <span className="input-icon"><Phone size={15} /></span>
                    <input type="tel" value={form.phone} onChange={set('phone')}
                           placeholder="08012345678" autoComplete="tel" />
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="field-label">Date of Birth</label>
                  <div className="input-wrap">
                    <span className="input-icon"><Calendar size={15} /></span>
                    <input type="date" value={form.birthday} onChange={set('birthday')} />
                  </div>
                </div>
              </div>
            </div>

            {/* ─ Church ─ */}
            <div className="form-sect">
              <div className="sect-hd">
                <Building2 size={12} /> Church Details
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Church Department</label>
                <div className="input-wrap">
                  <span className="input-icon"><Building2 size={15} /></span>
                  <select value={form.church_dept} onChange={set('church_dept')}>
                    <option value="">— Select Department —</option>
                    {CHURCH_DEPTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ─ Academic ─ */}
            <div className="form-sect">
              <div className="sect-hd">
                <GraduationCap size={12} /> Academic Details
              </div>

              <div className="field">
                <label className="field-label">Course / Department</label>
                <div className="input-wrap">
                  <span className="input-icon"><GraduationCap size={15} /></span>
                  <select value={form.school_dept} onChange={set('school_dept')}>
                    <option value="">— Select your Course —</option>
                    {SCHOOL_COURSES.map(({ group, courses }) => (
                      <optgroup key={group} label={group}>
                        {courses.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                    <option disabled>──────────────</option>
                    <option value="Not a Student">Not a Student</option>
                    <option value="Other">Other (type below)</option>
                  </select>
                </div>
                {form.school_dept === 'Other' && (
                  <div className="input-wrap" style={{ marginTop:'.6rem' }}>
                    <span className="input-icon"><GraduationCap size={15} /></span>
                    <input
                      type="text"
                      value={customDept}
                      onChange={e => setCustomDept(e.target.value)}
                      placeholder="Type your department / course"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Level / Year</label>
                <div className="input-wrap">
                  <span className="input-icon"><Layers size={15} /></span>
                  <select value={form.level} onChange={set('level')}>
                    <option value="">— Select Level —</option>
                    {LEVELS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-err"><span>⚠</span> {error}</div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop:'.5rem' }}>
              {loading
                ? <span className="spinner" />
                : <><span>Get My Member ID</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <Link to="/" className="btn btn-ghost">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
