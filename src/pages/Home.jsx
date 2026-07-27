import { Link } from 'react-router-dom'
import { ClipboardList, CheckSquare, ChevronRight, MapPin } from 'lucide-react'
import { Logo } from '../components/Logo'

export default function Home() {
  return (
    <div className="home">

      {/* Logo */}
      <div className="home-logo fade-in">
        <Logo size={100} onDark />
      </div>

      {/* Hero text */}
      <div className="home-hero fade-up" style={{ animationDelay: '60ms' }}>
        <h1 className="home-name">MFMCF</h1>
        <p className="home-tagline">Campus Fellowship</p>
        <div className="home-location">
          <MapPin size={12} />
          UNIOSUN · OSOGBO
        </div>
        <div className="home-divider" />
      </div>

      {/* Action cards */}
      <div className="home-cards fade-up" style={{ animationDelay: '130ms' }}>

        <Link to="/register" className="home-card">
          <div className="home-card-icon purple">
            <ClipboardList size={24} color="rgba(255,255,255,.85)" />
          </div>
          <div className="home-card-body">
            <div className="home-card-title">New Member</div>
            <div className="home-card-sub">Register and get your unique Member ID</div>
          </div>
          <ChevronRight size={20} className="home-card-arrow" />
        </Link>

        <Link to="/attendance" className="home-card">
          <div className="home-card-icon flame">
            <CheckSquare size={24} color="rgba(255,255,255,.85)" />
          </div>
          <div className="home-card-body">
            <div className="home-card-title">Mark Attendance</div>
            <div className="home-card-sub">Already have your ID? Record your presence</div>
          </div>
          <ChevronRight size={20} className="home-card-arrow" />
        </Link>

      </div>

      <p className="home-year">MFMCF · {new Date().getFullYear()}</p>
    </div>
  )
}
