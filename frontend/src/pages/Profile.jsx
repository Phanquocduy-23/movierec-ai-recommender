import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { ErrorBox } from '../components/ui'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ full_name: user.full_name || '', current_password: '', new_password: '' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setError('')
    const body = { full_name: form.full_name }
    if (form.new_password) Object.assign(body, { current_password: form.current_password, new_password: form.new_password })
    try { setUser(await api('/api/auth/me', { method: 'PUT', body })); setMsg('Đã lưu thay đổi'); setForm({ ...form, current_password: '', new_password: '' }) }
    catch (err) { setError(err.message) }
  }
  return (
    <form className="auth-card card" onSubmit={submit}>
      <h1>Hồ sơ cá nhân</h1>
      <p className="muted">{user.email} · @{user.username} · vai trò: <b>{user.role_name}</b></p>
      <label>Họ tên<input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
      <h3>Đổi mật khẩu</h3>
      <label>Mật khẩu hiện tại<input type="password" value={form.current_password} onChange={e => setForm({ ...form, current_password: e.target.value })} /></label>
      <label>Mật khẩu mới<input type="password" minLength={6} value={form.new_password} onChange={e => setForm({ ...form, new_password: e.target.value })} /></label>
      {msg && <div className="alert ok">{msg}</div>}
      <ErrorBox error={error} />
      <button className="btn block">Lưu</button>
    </form>
  )
}
