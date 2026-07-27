import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home       from './pages/Home'
import Register   from './pages/Register'
import Attendance from './pages/Attendance'
import AdminLogin from './pages/AdminLogin'
import Admin      from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/register"    element={<Register />} />
        <Route path="/attendance"  element={<Attendance />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin"       element={<Admin />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
