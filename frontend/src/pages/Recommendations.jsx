import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { cleanTitle, Empty, ErrorBox, Loading, METHOD_LABEL, MovieCard, Poster, Stars } from '../components/ui'

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
  const [compareMode, setCompareMode] = useState(false)
  const [compareData, setCompareData] = useState(null)
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

  const loadComparison = () => {
    setCompareData(null)
    Promise.all([
      api('/api/recommendations?method=svd&n=10'),
      api('/api/recommendations?method=item_knn&n=10'),
      api('/api/recommendations?method=popular&n=10'),
    ]).then(([svd, knn, pop]) => {
      setCompareData({ svd, knn, pop })
    }).catch(e => setError(e.message))
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
    if (compareMode) loadComparison()
  }, [method, limit, user]) // eslint-disable-line

  useEffect(() => {
    if (compareMode) loadComparison()
  }, [compareMode]) // eslint-disable-line

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
      if (compareMode) loadComparison()
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

  // Thống kê so sánh 3 thuật toán khi bật chế độ Phòng thí nghiệm
  const compareStats = useMemo(() => {
    if (!compareData) return null
    const svdIds = new Set((compareData.svd?.items || []).map(i => i.movie.id))
    const knnIds = new Set((compareData.knn?.items || []).map(i => i.movie.id))
    const popIds = new Set((compareData.pop?.items || []).map(i => i.movie.id))
    const consensusIds = new Set([...svdIds].filter(x => knnIds.has(x)))
    const svdPopOverlap = [...svdIds].filter(x => popIds.has(x)).length
    const countGenres = (items) => {
      const s = new Set()
      ;(items || []).forEach(it => (it.movie.genres || []).forEach(g => s.add(g.name)))
      return s.size
    }
    return {
      consensusIds,
      consensusCount: consensusIds.size,
      svdPopOverlap,
      svdGenres: countGenres(compareData.svd?.items),
      knnGenres: countGenres(compareData.knn?.items),
      popGenres: countGenres(compareData.pop?.items),
    }
  }, [compareData])

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

  const exportRecsCsv = () => {
    if (!filteredItems.length) return
    const header = ['Hang', 'Movie ID', 'Ten Phim', 'Nam', 'The Loai', 'Thuat Toan Phuc Vu', 'Diem Du Doan AI', 'Ly Do Goi Y']
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = filteredItems.map((it, i) => [
      i + 1,
      it.movie.id,
      cleanTitle(it.movie.title),
      it.movie.year || '',
      (it.movie.genres || []).map(g => g.name).join(' | '),
      it.source,
      it.predicted_score?.toFixed(3) || '',
      (it.because || []).map(cleanTitle).join('; '),
    ].map(esc).join(','))
    const csv = '\uFEFF' + [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), {
      href: url,
      download: `goi_y_ai_${data?.served_method || 'movierec'}.csv`,
    }).click()
    URL.revokeObjectURL(url)
  }

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
          <button
            type="button"
            className="btn ghost sm"
            onClick={exportRecsCsv}
            disabled={!filteredItems.length}
          >
            📥 Xuất gợi ý (CSV)
          </button>
          {user && (
            <>
              <button
                type="button"
                className={`btn sm ${compareMode ? '' : 'ghost'}`}
                onClick={() => setCompareMode(v => !v)}
              >
                🔬 {compareMode ? 'Đang bật: So sánh 3 mô hình song song' : 'So sánh 3 mô hình song song'}
              </button>
              <button
                type="button"
                className={`btn sm ${showQuickRate ? '' : 'ghost'}`}
                onClick={() => setShowQuickRate(v => !v)}
              >
                ⚡ {showQuickRate ? 'Ẩn chấm nhanh' : 'Chấm nhanh theo thể loại'}
              </button>
            </>
          )}
          {!compareMode && (
            <select value={limit} onChange={e => setLimit(Number(e.target.value))}>
              <option value={10}>Top 10 phim</option>
              <option value={20}>Top 20 phim</option>
              <option value={30}>Top 30 phim</option>
            </select>
          )}
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

      {/* Chế độ Phòng Thí Nghiệm: Đối chiếu 3 Mô hình Song Song */}
      {compareMode ? (
        <div>
          {!compareData ? <Loading /> : (
            <>
              <div className="card" style={{ marginBottom: 18, background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95))' }}>
                <div className="row-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>🔬 Phân tích Đối chiếu Trực tiếp 3 Mô hình (Top-10)</h3>
                    <p className="muted small" style={{ margin: '4px 0 0' }}>
                      So sánh danh sách Top-10 phim được sinh ra cùng lúc cho tài khoản <b>@{user?.username}</b> bởi 3 thuật toán
                    </p>
                  </div>
                  <div className="row-actions" style={{ gap: 10 }}>
                    <span className="tag ok">
                      🎯 Đồng thuận SVD ∩ KNN: <b>{compareStats.consensusCount}/10 phim</b>
                    </span>
                    <span className="tag info">
                      Khác biệt so với Phổ biến: <b>{10 - compareStats.svdPopOverlap}/10 phim mới</b>
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 16 }}>
                {[
                  {
                    key: 'svd',
                    title: '🧬 1. Phân rã ma trận SVD',
                    sub: `Độ đa dạng: ${compareStats.svdGenres} thể loại · Phục vụ: ${METHOD_LABEL[compareData.svd.served_method]}`,
                    res: compareData.svd,
                    accent: '#8b5cf6',
                  },
                  {
                    key: 'knn',
                    title: '🔗 2. Item-based KNN (Adjusted Cosine)',
                    sub: `Độ đa dạng: ${compareStats.knnGenres} thể loại · Phục vụ: ${METHOD_LABEL[compareData.knn.served_method]}`,
                    res: compareData.knn,
                    accent: '#10b981',
                  },
                  {
                    key: 'pop',
                    title: '🔥 3. Độ phổ biến (Bayesian Baseline)',
                    sub: `Độ đa dạng: ${compareStats.popGenres} thể loại · Không cá nhân hóa`,
                    res: compareData.pop,
                    accent: '#f59e0b',
                  },
                ].map(col => (
                  <div key={col.key} className="card" style={{ borderTop: `3px solid ${col.accent}` }}>
                    <h3 style={{ margin: '0 0 4px' }}>{col.title}</h3>
                    <div className="muted small" style={{ marginBottom: 12 }}>{col.sub}</div>
                    <div className="list">
                      {col.res.items.map((it, idx) => {
                        const isConsensus = col.key !== 'pop' && compareStats.consensusIds.has(it.movie.id)
                        return (
                          <div key={it.movie.id} className="list-row" style={{ padding: '8px 10px' }}>
                            <span style={{ fontWeight: 700, width: 24, color: col.accent }}>#{idx + 1}</span>
                            <Link to={`/movies/${it.movie.id}`}><Poster movie={it.movie} size="sm" /></Link>
                            <div className="grow">
                              <Link to={`/movies/${it.movie.id}`} className="movie-title" style={{ fontSize: 14 }}>
                                {cleanTitle(it.movie.title)}
                              </Link>
                              <div className="muted small">
                                {it.movie.year || '—'} · <Stars value={it.movie.rating_avg} />
                              </div>
                              <div className="small" style={{ color: col.accent, fontWeight: 600 }}>
                                Dự đoán: ★ {it.predicted_score?.toFixed(2)}
                                {isConsensus && <span className="tag ok" style={{ marginLeft: 6, fontSize: 10 }}>🎯 Đồng thuận AI</span>}
                              </div>
                              {it.because?.length > 0 && (
                                <div className="muted small" style={{ fontSize: 11 }}>
                                  Vì thích: {it.because.slice(0, 2).map(cleanTitle).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
