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
import Leaderboard from './pages/Leaderboard'
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
  const inputRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKeyDown)
    }
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
          ref={inputRef}
          className="nav-search-input"
          placeholder="🔍 Tìm nhanh phim (Ctrl+K)…"
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

function Navbar({ theme, onToggleTheme }) {
  const { user, logout, isAdmin } = useAuth()
  const nav = useNavigate()
  return (
    <header className="navbar">
      <div className="nav-left">
        <Link to="/" className="brand">🎬 Movie<span>Rec</span></Link>
        <nav>
          <NavLink to="/" end>Trang chủ</NavLink>
          <NavLink to="/movies">Khám phá</NavLink>
          <NavLink to="/leaderboard">🏆 Bảng xếp hạng</NavLink>
          <NavLink to="/recommendations">✨ Gợi ý AI</NavLink>
          {user && <NavLink to="/my-ratings">Đã chấm điểm</NavLink>}
          {user && <NavLink to="/watchlist">Muốn xem</NavLink>}
          {isAdmin && <NavLink to="/admin">🛡️ Quản trị</NavLink>}
        </nav>
      </div>
      <QuickSearch />
      <div className="nav-right">
        <button
          type="button"
          className="btn ghost sm"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Chuyển sang giao diện Tối (Cinema Dark)' : 'Chuyển sang giao diện Sáng (Academic Light)'}
        >
          {theme === 'light' ? '🌙 Tối' : '☀️ Sáng'}
        </button>
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
  const [theme, setTheme] = useState(() => localStorage.getItem('movierec_theme') || 'dark')
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('movierec_theme', theme)
  }, [theme])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 380)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!ready) return <div className="center-page"><div className="spinner" /></div>
  return (
    <>
      <Navbar theme={theme} onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
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
      <FloatingMovieAssistant />
      {showTop && (
        <button
          type="button"
          className="btn sm"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 90, borderRadius: 999, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          ↑ Đầu trang
        </button>
      )}
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

function FloatingMovieAssistant() {
  const [open, setOpen] = useState(false)
  const [genres, setGenres] = useState([])
  const [genreId, setGenreId] = useState('')
  const [era, setEra] = useState('any')
  const [minVotes, setMinVotes] = useState(30)
  const [picks, setPicks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && genres.length === 0) {
      api('/api/genres').then(setGenres).catch(() => {})
      findMovies('', 'any', 30)
    }
  }, [open]) // eslint-disable-line

  const findMovies = (gId = genreId, eraVal = era, votes = minVotes) => {
    setLoading(true)
    const params = new URLSearchParams({ sort: 'rating', min_ratings: String(votes), size: '24' })
    if (gId) params.set('genre_id', gId)
    if (eraVal === 'modern') params.set('year_from', '2010')
    if (eraVal === '2000s') { params.set('year_from', '2000'); params.set('year_to', '2009') }
    if (eraVal === '90s') { params.set('year_from', '1990'); params.set('year_to', '1999') }
    if (eraVal === 'classic') params.set('year_to', '1989')
    api(`/api/movies?${params.toString()}`)
      .then(d => {
        const list = [...(d.items || [])]
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[list[i], list[j]] = [list[j], list[i]]
        }
        setPicks(list.slice(0, 3))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <div className="floating-assistant-wrap">
      {open && (
        <div className="floating-assistant-panel card">
          <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <b>🤖 Trợ lý Chọn Phim Theo Ý Bạn</b>
              <div className="muted small">Chưa biết tối nay xem gì? Để AI chọn giúp!</div>
            </div>
            <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="assistant-filters">
            <select
              value={genreId}
              onChange={e => { setGenreId(e.target.value); findMovies(e.target.value, era, minVotes) }}
            >
              <option value="">🎭 Mọi thể loại</option>
              {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select
              value={era}
              onChange={e => { setEra(e.target.value); findMovies(genreId, e.target.value, minVotes) }}
            >
              <option value="any">🕰️ Mọi thời đại</option>
              <option value="modern">🔥 Hiện đại (2010 – nay)</option>
              <option value="2000s">💿 Thập niên 2000s</option>
              <option value="90s">📼 Kinh điển 1990s</option>
              <option value="classic">🏛️ Cổ điển (&lt; 1990)</option>
            </select>
            <select
              value={minVotes}
              onChange={e => { const v = Number(e.target.value); setMinVotes(v); findMovies(genreId, era, v) }}
            >
              <option value={10}>💎 Kể cả Viên ngọc ẩn (≥10 lượt)</option>
              <option value={30}>⭐ Phổ biến vừa (≥30 lượt)</option>
              <option value={80}>🏆 Bom tấn nổi tiếng (≥80 lượt)</option>
            </select>
          </div>

          <div className="assistant-results">
            {loading ? (
              <div className="muted small" style={{ padding: 14, textAlign: 'center' }}>Đang lọc kho phim...</div>
            ) : picks.length === 0 ? (
              <div className="muted small" style={{ padding: 14, textAlign: 'center' }}>Không có phim khớp bộ lọc này. Hãy thử nới tiêu chí!</div>
            ) : (
              picks.map(m => (
                <Link
                  key={m.id}
                  to={`/movies/${m.id}`}
                  className="search-item"
                  style={{ borderRadius: 8 }}
                  onClick={() => setOpen(false)}
                >
                  <Poster movie={m} size="sm" />
                  <div className="search-item-info">
                    <div className="search-item-title">{cleanTitle(m.title)}</div>
                    <div className="muted small">
                      {m.year || '—'} · <Stars value={m.rating_avg} /> ({m.rating_count})
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="row-actions" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <button type="button" className="btn sm" onClick={() => findMovies(genreId, era, minVotes)}>
              🎲 Đổi 3 phim khác
            </button>
            <Link to="/recommendations" className="btn ghost sm" onClick={() => setOpen(false)}>
              Gợi ý AI chuyên sâu →
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        className="floating-assistant-btn"
        onClick={() => setOpen(v => !v)}
      >
        🤖 {open ? 'Đóng trợ lý' : 'Chọn phim theo ý bạn!'}
      </button>
    </div>
  )
}
