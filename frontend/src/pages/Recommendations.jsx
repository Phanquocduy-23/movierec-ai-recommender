import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { cleanTitle, Empty, ErrorBox, Loading, METHOD_LABEL, MovieCard, Poster } from '../components/ui'

const OPTIONS = [
  { v: 'auto', label: '🤖 Tự động (Khuyến nghị)', desc: 'Tự động chọn SVD hoặc Item-based KNN tùy trạng thái hồ sơ' },
  { v: 'svd', label: '🧬 Phân rã ma trận SVD', desc: 'Dự đoán bằng tích vô hướng vector nhân tố ẩn người dùng & phim' },
  { v: 'item_knn', label: '🔗 Item-based KNN', desc: 'Lọc cộng tác theo độ tương đồng Adjusted Cosine giữa các phim' },
  { v: 'popular', label: '🔥 Độ phổ biến (Mốc cơ sở)', desc: 'Xếp hạng Weighted Rating kiểu IMDb (không cá nhân hóa)' },
]

export default function Recommendations() {
  const { user } = useAuth()
  const [method, setMethod] = useState('auto')
  const [limit, setLimit] = useState(20)
  const [genreFilter, setGenreFilter] = useState('')
  const [data, setData] = useState(null)
  const [myRatings, setMyRatings] = useState(null)
  const [genres, setGenres] = useState([])
  const [pickGenreId, setPickGenreId] = useState('')
  const [quickMovies, setQuickMovies] = useState([])
  const [showQuickRate, setShowQuickRate] = useState(false)
  const [quickMsg, setQuickMsg] = useState('')
  const [error, setError] = useState('')

  const loadRecs = () => {
    setError('')
    api(`/api/recommendations?method=${method}&n=${limit}`).then(setData).catch(e => setError(e.message))
  }

  const loadMyRatings = () => {
    if (!user) { setMyRatings(null); return }
    api('/api/ratings/me?size=100').then(r => {
      setMyRatings(r)
      if ((r.total || 0) < 5) setShowQuickRate(true)
    }).catch(() => {})
  }

  useEffect(() => {
    setData(null)
    loadRecs()
  }, [method, limit, user]) // eslint-disable-line

  useEffect(() => {
    loadMyRatings()
    api('/api/genres').then(gs => {
      setGenres(gs)
      if (gs.length > 0 && !pickGenreId) setPickGenreId(String(gs[0].id))
    }).catch(() => {})
  }, [user]) // eslint-disable-line

  useEffect(() => {
    if (!user || !showQuickRate) return
    const q = pickGenreId ? `?genre_id=${pickGenreId}&sort=popular&size=12` : `?sort=popular&size=12`
    api(`/api/movies${q}`).then(res => setQuickMovies(res.items || [])).catch(() => {})
  }, [user, showQuickRate, pickGenreId])

  const ratedIds = useMemo(() => {
    return new Set((myRatings?.items || []).map(r => r.movie_id))
  }, [myRatings])

  const unratedQuickMovies = useMemo(() => {
    return quickMovies.filter(m => !ratedIds.has(m.id)).slice(0, 6)
  }, [quickMovies, ratedIds])

  const quickRateMovie = async (movie, score) => {
    try {
      await api(`/api/ratings/${movie.id}`, { method: 'PUT', body: { score } })
      setQuickMsg(`Đã chấm ${score} ★ cho "${cleanTitle(movie.title)}" — Danh sách gợi ý AI đã cập nhật!`)
      loadMyRatings()
      loadRecs()
    } catch (e) {
      setError(e.message)
    }
  }

  // Tính thống kê nhanh hồ sơ sở thích của người dùng hiện tại
  const taste = useMemo(() => {
    const items = myRatings?.items || []
    if (!items.length) return null
    const avg = items.reduce((s, r) => s + r.score, 0) / items.length
    const gCount = {}
    items.filter(r => r.score >= 3.5).forEach(r => {
      (r.movie?.genres || []).forEach(g => { gCount[g.name] = (gCount[g.name] || 0) + 1 })
    })
    const topGenres = Object.entries(gCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { total: myRatings.total, avg: avg.toFixed(2), topGenres }
  }, [myRatings])

  const availableGenres = useMemo(() => {
    const set = new Set()
    ;(data?.items || []).forEach(it => (it.movie.genres || []).forEach(g => set.add(g.name)))
    return Array.from(set).sort()
  }, [data])

  const filteredItems = useMemo(() => {
    if (!data?.items) return []
    if (!genreFilter) return data.items
    return data.items.filter(it => (it.movie.genres || []).some(g => g.name === genreFilter))
  }, [data, genreFilter])

  return (
    <div>
      <div className="section-head">
        <div>
          <h1>✨ Gợi ý phim cá nhân hóa bằng AI</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Đối chiếu trực tiếp 3 phương pháp gợi ý: <b>SVD</b>, <b>Item-based KNN</b> và <b>Độ phổ biến (Baseline)</b>
          </p>
        </div>
        <div className="row-actions">
          {user && (
            <button
              type="button"
              className={`btn sm ${showQuickRate ? '' : 'ghost'}`}
              onClick={() => setShowQuickRate(v => !v)}
            >
              ⚡ {showQuickRate ? 'Ẩn chấm nhanh' : 'Chấm nhanh theo thể loại'}
            </button>
          )}
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}>
            <option value={10}>Top 10 phim</option>
            <option value={20}>Top 20 phim</option>
            <option value={30}>Top 30 phim</option>
          </select>
        </div>
      </div>

      {user && taste && (
        <div className="card taste-card">
          <div>
            <div className="muted small">Hồ sơ sở thích của <b>@{user.username}</b></div>
            <div style={{ marginTop: 4 }}>
              Đã chấm: <b>{taste.total} phim</b> · Điểm trung bình bạn chấm: <b style={{ color: '#f59e0b' }}>★ {taste.avg}</b>
            </div>
          </div>
          <div>
            <div className="muted small" style={{ marginBottom: 4 }}>Thể loại bạn yêu thích nhất (điểm ≥ 3.5):</div>
            <div className="chips" style={{ marginBottom: 0 }}>
              {taste.topGenres.map(([g, c]) => (
                <span key={g} className="chip">{g} ({c})</span>
              ))}
            </div>
          </div>
          <Link to="/my-ratings" className="btn ghost sm">Quản lý điểm đã chấm →</Link>
        </div>
      )}

      {/* Khung Khởi tạo nhanh Gu Điện Ảnh (Xử lý Cold-Start trực tiếp) */}
      {user && showQuickRate && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(99, 102, 241, 0.4)' }}>
          <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0 }}>🎯 Khởi tạo nhanh Gu Điện Ảnh (Tương tác xử lý Cold-Start)</h3>
              <p className="muted small" style={{ margin: '4px 0 0' }}>
                Chọn thể loại bạn thích và bấm chấm nhanh vài bộ phim quen thuộc — AI sẽ lập tức cá nhân hóa danh sách bên dưới!
              </p>
            </div>
            <span className="tag ok">Đã chấm: {myRatings?.total || 0} phim</span>
          </div>

          <div className="chips" style={{ marginBottom: 12 }}>
            {genres.slice(0, 12).map(g => (
              <button
                key={g.id}
                type="button"
                className={`chip ${String(pickGenreId) === String(g.id) ? 'active' : ''}`}
                onClick={() => setPickGenreId(String(g.id))}
              >
                {g.name}
              </button>
            ))}
          </div>

          {quickMsg && <div className="alert ok" style={{ marginBottom: 12 }}>{quickMsg}</div>}

          <div className="movie-grid">
            {unratedQuickMovies.map(m => (
              <div key={m.id} className="movie-card" style={{ paddingBottom: 10 }}>
                <Link to={`/movies/${m.id}`} className="poster-link">
                  <Poster movie={m} />
                </Link>
                <div className="movie-body">
                  <Link to={`/movies/${m.id}`} className="movie-title">{cleanTitle(m.title)}</Link>
                  <div className="movie-meta">
                    <span>{m.year || '—'}</span>
                    <span>★ {m.rating_avg ?? '—'}</span>
                  </div>
                  <div className="row-actions" style={{ marginTop: 8, gap: 6 }}>
                    <button type="button" className="btn sm" onClick={() => quickRateMovie(m, 5.0)}>★ 5.0</button>
                    <button type="button" className="btn ghost sm" onClick={() => quickRateMovie(m, 4.0)}>★ 4.0</button>
                    <button type="button" className="btn ghost sm" onClick={() => quickRateMovie(m, 3.0)}>★ 3.0</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {user && (
        <div className="method-cards">
          {OPTIONS.map(o => (
            <button
              key={o.v}
              type="button"
              className={`method-card ${method === o.v ? 'active' : ''}`}
              onClick={() => setMethod(o.v)}
            >
              <div className="method-card-title">{o.label}</div>
              <div className="muted small">{o.desc}</div>
            </button>
          ))}
        </div>
      )}

      <ErrorBox error={error} />
      {!data ? <Loading /> : (
        <>
          <div className={`alert ${data.fallback ? 'warn' : 'info'}`}>
            <div className="row-actions" style={{ justifyContent: 'space-between' }}>
              <div>
                <b>Phương pháp thực tế đã phục vụ: {METHOD_LABEL[data.served_method]}</b>
                {data.model_version && <> · Phiên bản mô hình <code>{data.model_version}</code></>}
                {data.fallback && <> · <span className="tag warn">Dự phòng (Fallback)</span></>}
              </div>
              {availableGenres.length > 0 && (
                <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
                  <option value="">Lọc thể loại trong danh sách gợi ý ({data.items.length})</option>
                  {availableGenres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
            </div>
            <div style={{ marginTop: 6 }}>{data.reason}</div>
            {!user && (
              <div style={{ marginTop: 6 }}>
                👉 <Link to="/login"><b>Đăng nhập</b></Link> (có sẵn 4 tài khoản mẫu 1-chạm) và chấm điểm phim để trải nghiệm gợi ý cá nhân hóa!
              </div>
            )}
          </div>

          {filteredItems.length === 0 ? <Empty>Chưa có gợi ý phù hợp.</Empty> : (
            <div className="movie-grid">
              {filteredItems.map((it, idx) => (
                <MovieCard
                  key={it.movie.id}
                  movie={it.movie}
                  badge={`#${idx + 1}`}
                  extra={
                    <>
                      {it.source !== 'popular'
                        ? <div className="pred">Điểm dự đoán cho bạn: <b>★ {it.predicted_score?.toFixed(2)}</b></div>
                        : <div className="pred muted">Phổ biến (Weighted: ★ {it.predicted_score?.toFixed(2)})</div>}
                      {it.because.length > 0 && (
                        <div className="because">Vì bạn thích: {it.because.map(cleanTitle).join(', ')}</div>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
