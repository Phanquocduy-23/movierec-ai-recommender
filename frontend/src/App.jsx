import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { api } from './api'
import { useAuth } from './auth'
import { RequireAdmin, RequireAuth } from './components/Guards'
import { cleanTitle, Poster, Stars } from './components/ui'
import AdminData from './pages/admin/AdminData'
import AdminExperiments from './pages/admin/AdminExperiments'
import AdminGenres from './pages/admin/AdminGenres'
import AdminLayout from './pages/admin/AdminLayout'
import AdminModels from './pages/admin/AdminModels'
import AdminMovies from './pages/admin/AdminMovies'
import AdminUsers from './pages/admin/AdminUsers'
import Dashboard from './pages/admin/Dashboard'
import { Login, Register } from './pages/AuthPages'
import Home from './pages/Home'
import MovieDetail from './pages/MovieDetail'
import Movies from './pages/Movies'
import MyRatings from './pages/MyRatings'
import Profile from './pages/Profile'
import Recommendations from './pages/Recommendations'
import Watchlist from './pages/Watchlist'

function QuickSearch() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const boxRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      api(`/api/movies?q=${encodeURIComponent(term)}&size=6`)
        .then(d => { setResults(d.items || []); setOpen(true) })
        .catch(() => {})
    }, 220)
    return () => clearTimeout(timer)
  }, [q])

  const onSubmit = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    setOpen(false)
    nav(`/movies?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="nav-search" ref={boxRef}>
      <form onSubmit={onSubmit}>
        <input
          className="nav-search-input"
          placeholder="🔍 Tìm nhanh phim (vd: Matrix, Toy Story)…"
          value={q}
          onFocus={() => results.length > 0 && setOpen(true)}
          onChange={e => setQ(e.target.value)}
        />
      </form>
      {open && results.length > 0 && (
        <div className="search-dropdown">
          {results.map(m => (
            <Link
              key={m.id}
              to={`/movies/${m.id}`}
              className="search-item"
              onClick={() => { setOpen(false); setQ('') }}
            >
              <Poster movie={m} size="sm" />
              <div className="search-item-info">
                <div className="search-item-title">{cleanTitle(m.title)}</div>
                <div className="muted small">
                  {m.year || '—'} · <Stars value={m.rating_avg} /> · {m.genres.slice(0, 2).map(g => g.name).join(', ')}
                </div>
              </div>
            </Link>
          ))}
          <button
            type="button"
            className="search-more"
            onClick={onSubmit}
          >
            Xem tất cả kết quả cho “{q.trim()}” →
          </button>
        </div>
      )}
    </div>
  )
}

function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const nav = useNavigate()
  return (
    <header className="navbar">
      <div className="nav-left">
        <Link to="/" className="brand">🎬 Movie<span>Rec</span></Link>
        <nav>
          <NavLink to="/" end>Trang chủ</NavLink>
          <NavLink to="/movies">Khám phá</NavLink>
          <NavLink to="/recommendations">✨ Gợi ý AI</NavLink>
          {user && <NavLink to="/my-ratings">Đã chấm điểm</NavLink>}
          {user && <NavLink to="/watchlist">Muốn xem</NavLink>}
          {isAdmin && <NavLink to="/admin">🛡️ Quản trị</NavLink>}
        </nav>
      </div>
      <QuickSearch />
      <div className="nav-right">
        {user ? (
          <>
            <NavLink to="/profile" className="user-chip">
              👤 {user.username}
              {isAdmin && <span className="role-pill">Admin</span>}
            </NavLink>
            <button className="btn ghost sm" onClick={() => { logout(); nav('/') }}>Đăng xuất</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="btn ghost sm">Đăng nhập</NavLink>
            <Link to="/register" className="btn sm">Đăng ký</Link>
          </>
        )}
      </div>
    </header>
  )
}

export default function App() {
  const { ready } = useAuth()
  if (!ready) return <div className="center-page"><div className="spinner" /></div>
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movies/:id" element={<MovieDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/my-ratings" element={<RequireAuth><MyRatings /></RequireAuth>} />
          <Route path="/watchlist" element={<RequireAuth><Watchlist /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<Dashboard />} />
            <Route path="movies" element={<AdminMovies />} />
            <Route path="genres" element={<AdminGenres />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="data" element={<AdminData />} />
            <Route path="models" element={<AdminModels />} />
            <Route path="experiments" element={<AdminExperiments />} />
          </Route>
          <Route path="*" element={<div className="empty">Không tìm thấy trang</div>} />
        </Routes>
      </main>
      <footer className="footer-rich">
        <div className="footer-inner">
          <div>
            <div className="brand">🎬 Movie<span>Rec</span></div>
            <p className="muted small" style={{ maxWidth: 360 }}>
              Hệ thống gợi ý phim cá nhân hóa ứng dụng Trí tuệ nhân tạo sử dụng Lọc cộng tác dựa trên đánh giá người dùng (Item-based KNN & Phân rã ma trận SVD).
            </p>
          </div>
          <div>
            <h4>Khám phá</h4>
            <div className="footer-links">
              <Link to="/movies?sort=popular">Phim thịnh hành</Link>
              <Link to="/movies?sort=rating&min_ratings=50">Bảng xếp hạng điểm cao</Link>
              <Link to="/recommendations">Gợi ý cá nhân hóa AI</Link>
            </div>
          </div>
          <div>
            <h4>Công nghệ & Dữ liệu</h4>
            <div className="muted small">
              <div>Frontend: ReactJS · Backend: FastAPI + SQLAlchemy</div>
              <div>AI: Item-based KNN (Adjusted Cosine) · SVD · Popularity</div>
              <div>Dữ liệu: MovieLens (GroupLens Research) · 9.742 phim</div>
            </div>
          </div>
          <div>
            <h4>Thông tin Đồ án Cơ sở 2</h4>
            <div className="muted small">
              <div>Sinh viên: <b>Phan Quốc Duy</b></div>
              <div>MSSV: <code>235019</code> · Lớp: <code>DH23TIN05</code></div>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
