import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { BarChart, cleanTitle, ErrorBox, Loading } from '../components/ui'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ full_name: user.full_name || '', current_password: '', new_password: '' })
  const [ratings, setRatings] = useState(null)
  const [watchlist, setWatchlist] = useState([])
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/ratings/me?size=200').then(setRatings).catch(() => {})
    api('/api/watchlist').then(setWatchlist).catch(() => {})
  }, [])

  const stats = useMemo(() => {
    const items = ratings?.items || []
    const total = ratings?.total || items.length
    const avg = items.length ? items.reduce((s, r) => s + r.score, 0) / items.length : 0
    const comments = items.filter(r => r.comment && r.comment.trim()).length

    let persona = '🎬 Người yêu điện ảnh mới'
    if (items.length >= 3) {
      if (avg >= 4.1) persona = '🌟 Khán giả Hào phóng (Generous Cinephile)'
      else if (avg >= 3.3) persona = '⚖️ Nhà phê bình Cân bằng (Balanced Critic)'
      else persona = '🧐 Giám khảo Khắt khe (Strict Reviewer)'
    }

    // Phân bố điểm của cá nhân
    const distMap = {}
    items.forEach(r => { distMap[r.score] = (distMap[r.score] || 0) + 1 })
    const scoreDist = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(s => ({
      score: `${s} ★`,
      count: distMap[s] || 0,
    }))

    // Thể loại yêu thích
    const genreMap = {}
    items.forEach(r => {
      ;(r.movie?.genres || []).forEach(g => {
        genreMap[g.name] = (genreMap[g.name] || 0) + 1
      })
    })
    const topGenres = Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([genre, count]) => ({ genre, count }))

    // Thập niên yêu thích
    const decMap = {}
    items.forEach(r => {
      const y = r.movie?.year
      if (y) {
        const dec = `${Math.floor(y / 10) * 10}s`
        decMap[dec] = (decMap[dec] || 0) + 1
      }
    })
    const topDecades = Object.entries(decMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([decade, count]) => ({ decade, count }))

    return { total, avg: avg.toFixed(2), comments, persona, scoreDist, topGenres, topDecades }
  }, [ratings])

  const exportCsv = () => {
    const items = ratings?.items || []
    if (!items.length) return
    const header = ['Movie ID', 'Ten Phim', 'Nam Phat Hanh', 'The Loai', 'Diem Cua Ban', 'Binh Luan', 'Ngay Cap Nhat']
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = items.map(r => [
      r.movie_id,
      cleanTitle(r.movie?.title || ''),
      r.movie?.year || '',
      (r.movie?.genres || []).map(g => g.name).join(' | '),
      r.score,
      r.comment || '',
      new Date(r.updated_at + 'Z').toLocaleString('vi-VN'),
    ].map(esc).join(','))
    const csvContent = '\uFEFF' + [header.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), {
      href: url,
      download: `lich_su_danh_gia_${user.username}.csv`,
    }).click()
    URL.revokeObjectURL(url)
  }

  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setError('')
    const body = { full_name: form.full_name }
    if (form.new_password) Object.assign(body, { current_password: form.current_password, new_password: form.new_password })
    try {
      setUser(await api('/api/auth/me', { method: 'PUT', body }))
      setMsg('Đã lưu thay đổi thông tin tài khoản thành công!')
      setForm({ ...form, current_password: '', new_password: '' })
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <h1>📊 Hồ sơ & Thống kê Điện ảnh Cá nhân</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Tài khoản: <b>@{user.username}</b> ({user.email}) · Vai trò: <span className="tag ok">{user.role_name}</span> · Phong cách: <b>{stats.persona}</b>
          </p>
        </div>
        <div className="row-actions">
          <button type="button" className="btn sm" onClick={exportCsv} disabled={!stats.total}>
            📥 Xuất lịch sử đánh giá (CSV)
          </button>
          <Link to="/recommendations" className="btn ghost sm">Xem gợi ý AI →</Link>
        </div>
      </div>

      {/* 4 Thẻ KPI Cá nhân */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat card">
          <div className="stat-value">{stats.total}</div>
          <div className="muted">Phim đã chấm điểm</div>
        </div>
        <div className="stat card">
          <div className="stat-value" style={{ color: '#f59e0b' }}>★ {stats.avg}</div>
          <div className="muted">Điểm trung bình bạn chấm</div>
        </div>
        <div className="stat card">
          <div className="stat-value" style={{ color: '#10b981' }}>{watchlist.length}</div>
          <div className="muted">Phim trong Muốn xem</div>
        </div>
        <div className="stat card">
          <div className="stat-value" style={{ color: '#8b5cf6' }}>{stats.comments}</div>
          <div className="muted">Bình luận đã đóng góp</div>
        </div>
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>⭐ Phân bố điểm đánh giá của riêng bạn</h3>
            {!ratings ? <Loading /> : (
              <BarChart data={stats.scoreDist} labelKey="score" valueKey="count" color="#f59e0b" />
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>🎭 Top Thể loại bạn xem nhiều nhất</h3>
            {stats.topGenres.length === 0 ? (
              <p className="muted small">Hãy chấm điểm thêm vài bộ phim để xem biểu đồ thể loại yêu thích của bạn.</p>
            ) : (
              <BarChart data={stats.topGenres} labelKey="genre" valueKey="count" color="#6366f1" />
            )}
          </div>

          {stats.topDecades.length > 0 && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>🕰️ Thập niên điện ảnh yêu thích</h3>
              <BarChart data={stats.topDecades} labelKey="decade" valueKey="count" color="#10b981" />
            </div>
          )}
        </div>

        <form className="card" onSubmit={submit}>
          <h3 style={{ marginTop: 0 }}>⚙️ Cập nhật thông tin tài khoản</h3>
          <p className="muted small">
            Tên đăng nhập: <b>@{user.username}</b> · Ngày tham gia: {new Date(user.created_at + 'Z').toLocaleDateString('vi-VN')}
          </p>
          <label>
            Họ và tên hiển thị
            <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Nhập họ tên của bạn..." />
          </label>
          <h3 style={{ marginTop: 18 }}>🔒 Đổi mật khẩu</h3>
          <label>
            Mật khẩu hiện tại
            <input type="password" value={form.current_password} onChange={e => setForm({ ...form, current_password: e.target.value })} placeholder="Chỉ nhập nếu muốn đổi mật khẩu" />
          </label>
          <label>
            Mật khẩu mới (tối thiểu 6 ký tự)
            <input type="password" minLength={6} value={form.new_password} onChange={e => setForm({ ...form, new_password: e.target.value })} placeholder="Nhập mật khẩu mới..." />
          </label>
          {msg && <div className="alert ok">{msg}</div>}
          <ErrorBox error={error} />
          <button className="btn block" style={{ marginTop: 12 }}>Lưu thay đổi</button>
        </form>
      </div>
    </div>
  )
}
