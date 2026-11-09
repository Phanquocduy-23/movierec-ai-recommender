import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { ErrorBox } from '../components/ui'

const DEMO_ACCOUNTS = [
  { label: '🛡️ Quản trị viên (Admin)', user: 'admin', pass: 'Admin@123', desc: 'Toàn quyền thống kê, quản lý phim, train & rollback mô hình' },
  { label: '💥 Fan Hành Động / Sci-Fi', user: 'demo_action', pass: 'Demo@123', desc: 'Đã chấm 20 phim (thích Action/Sci-Fi) -> Gợi ý bằng SVD' },
  { label: '💖 Fan Tình Cảm / Drama', user: 'demo_romance', pass: 'Demo@123', desc: 'Đã chấm 18 phim (thích Romance/Drama) -> Gợi ý bằng SVD' },
  { label: '🌱 Tài khoản mới (Cold-start)', user: 'demo_new', pass: 'Demo@123', desc: 'Chưa chấm điểm nào -> Minh họa Fallback sang Phổ biến' },
]

export function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try { await login(form.username, form.password); nav(loc.state?.from || '/') }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const quickLogin = async (u, p) => {
    setForm({ username: u, password: p })
    setBusy(true); setError('')
    try { await login(u, p); nav(loc.state?.from || '/') }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card card" onSubmit={submit}>
        <h1>Đăng nhập</h1>
        <label>Email hoặc tên đăng nhập<input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
        <label>Mật khẩu<input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
        <ErrorBox error={error} />
        <button className="btn block" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        <p className="muted small">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
      </form>

      <div className="auth-card card">
        <h3>⚡ Đăng nhập nhanh (Phục vụ Demo Bảo vệ)</h3>
        <p className="muted small">Bấm 1 chạm để chuyển nhanh giữa các kịch bản người dùng trong buổi bảo vệ:</p>
        <div className="demo-account-list">
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.user}
              type="button"
              disabled={busy}
              className="demo-acc-btn"
              onClick={() => quickLogin(acc.user, acc.pass)}
            >
              <div className="demo-acc-title">{acc.label}</div>
              <div className="muted small">{acc.desc}</div>
              <code className="small">{acc.user} / {acc.pass}</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', full_name: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (form.password !== form.confirm) return setError('Mật khẩu nhập lại không khớp')
    setBusy(true)
    try {
      const { confirm, ...payload } = form // eslint-disable-line no-unused-vars
      await register(payload); nav('/movies')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <form className="auth-card card" onSubmit={submit}>
      <h1>Tạo tài khoản</h1>
      <label>Email<input required type="email" value={form.email} onChange={set('email')} placeholder="ban@example.com" /></label>
      <label>Tên đăng nhập<input required minLength={3} pattern="[A-Za-z0-9_.]+" title="Chữ, số, dấu _ hoặc ." value={form.username} onChange={set('username')} /></label>
      <label>Họ tên<input value={form.full_name} onChange={set('full_name')} /></label>
      <label>Mật khẩu (≥ 6 ký tự)<input required type="password" minLength={6} value={form.password} onChange={set('password')} /></label>
      <label>Nhập lại mật khẩu<input required type="password" value={form.confirm} onChange={set('confirm')} /></label>
      <ErrorBox error={error} />
      <button className="btn block" disabled={busy}>{busy ? 'Đang tạo…' : 'Đăng ký'}</button>
      <p className="muted small">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </form>
  )
}
