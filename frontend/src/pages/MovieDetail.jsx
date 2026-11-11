import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import {
  BarChart, cleanTitle, ErrorBox, extractImdbId, fetchCinemeta,
  Loading, METHOD_LABEL, MovieCard, Poster, rememberViewed, StarInput, Stars, TrailerModal,
} from '../components/ui'

export default function MovieDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const [movie, setMovie] = useState(null)
  const [meta, setMeta] = useState(null)
  const [similar, setSimilar] = useState(null)
  const [dist, setDist] = useState([])
  const [reviews, setReviews] = useState([])
  const [commentText, setCommentText] = useState('')
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [revealedSpoilers, setRevealedSpoilers] = useState({})
  const [reviewSort, setReviewSort] = useState('newest')
  const [draftScore, setDraftScore] = useState(4.5)
  const [showTrailer, setShowTrailer] = useState(false)
  const [watchOpen, setWatchOpen] = useState(false)
  const [lightsOff, setLightsOff] = useState(false)
  const [serverIdx, setServerIdx] = useState(1)
  const [activeCut, setActiveCut] = useState('Bản Chiếu Rạp (Full FHD)')
  const [epSearch, setEpSearch] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    api(`/api/movies/${id}`).then(m => {
      setMovie(m)
      const rawComment = m.my_comment || ''
      if (rawComment.startsWith('[SPOILER] ')) {
        setIsSpoiler(true)
        setCommentText(rawComment.replace(/^\[SPOILER\]\s*/, ''))
      } else {
        setIsSpoiler(false)
        setCommentText(rawComment)
      }
      if (m.my_rating != null) setDraftScore(m.my_rating)
      rememberViewed(m)
      const imdbId = extractImdbId(m)
      if (imdbId) fetchCinemeta(imdbId).then(setMeta)
    }).catch(e => setError(e.message))
    api(`/api/movies/${id}/rating-distribution`).then(setDist).catch(() => {})
    api(`/api/movies/${id}/reviews`).then(setReviews).catch(() => {})
  }
  useEffect(() => {
    setMovie(null); setMeta(null); setSimilar(null); setReviews([]); setMsg(''); setError('')
    setWatchOpen(false); setLightsOff(false)
    load()
    api(`/api/movies/${id}/similar?n=12`).then(setSimilar).catch(() => {})
  }, [id, user]) // eslint-disable-line

  const requireLogin = () => { if (!user) { nav('/login', { state: { from: `/movies/${id}` } }); return true } return false }

  const rate = async (score) => {
    if (requireLogin()) return
    setDraftScore(score)
    setBusy(true); setError('')
    try {
      await api(`/api/ratings/${id}`, { method: 'PUT', body: { score } })
      setMsg(`Đã lưu ${score} sao! Gợi ý cá nhân hóa của bạn đã được cập nhật.`)
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    if (requireLogin()) return
    const scoreToSave = movie.my_rating != null ? movie.my_rating : draftScore
    const cleanBody = commentText.trim().replace(/^\[SPOILER\]\s*/, '')
    const finalComment = cleanBody && isSpoiler ? `[SPOILER] ${cleanBody}` : cleanBody
    setBusy(true); setError('')
    try {
      await api(`/api/ratings/${id}`, {
        method: 'PUT',
        body: { score: scoreToSave, comment: finalComment },
      })
      setMsg('Đã đăng bình luận & đánh giá của bạn thành công!')
      load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const unrate = async () => {
    setBusy(true)
    try {
      await api(`/api/ratings/${id}`, { method: 'DELETE' })
      setCommentText('')
      setMsg('Đã xóa đánh giá & bình luận.')
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const toggleWatch = async () => {
    if (requireLogin()) return
    try {
      await api(`/api/watchlist/${id}`, { method: movie.in_watchlist ? 'DELETE' : 'POST' })
      setMsg(movie.in_watchlist ? 'Đã bỏ khỏi danh sách muốn xem.' : 'Đã thêm vào danh sách muốn xem.'); load()
    } catch (e) { setError(e.message) }
  }

  if (error && !movie) return <ErrorBox error={error} />
  if (!movie) return <Loading />

  const imdbId = extractImdbId(movie)
  const bgUrl = meta?.background || (imdbId ? `https://images.metahub.space/background/medium/${imdbId}/img` : movie.poster_url)
  const ytId = meta?.trailers?.[0]?.source || meta?.trailerStreams?.[0]?.ytId || null
  const synopsis = movie.overview || meta?.description
  const primaryGenre = movie.genres?.[0]
  const estViews = (movie.rating_count || 1) * 142 + (movie.id * 37) % 900
  const slugTag = cleanTitle(movie.title).toLowerCase().replace(/[^a-z0-9]+/g, '')

  const cuts = [
    'Bản Chiếu Rạp (Full FHD)',
    'Bản Director’s Cut (Vietsub)',
    'Bản Thuyết Minh chuẩn',
    'Official Trailer & Teaser',
    'Hậu trường (Behind The Scenes)',
  ].filter(c => !epSearch.trim() || c.toLowerCase().includes(epSearch.trim().toLowerCase()))

  const superfans = reviews.filter(r => r.score >= 4.0 && r.comment && r.comment.trim().length >= 10).slice(0, 6)
  const sortedReviews = [...reviews].sort((a, b) => {
    if (reviewSort === 'high') return b.score - a.score
    if (reviewSort === 'low') return a.score - b.score
    return new Date(b.updated_at) - new Date(a.updated_at)
  })

  return (
    <div>
      {lightsOff && (
        <div
          className="theater-dim-overlay"
          onClick={() => setLightsOff(false)}
          title="Nhấn vào vùng tối để bật lại đèn"
        />
      )}

      {/* Thanh điều hướng Breadcrumb chuẩn web phim */}
      <nav className="breadcrumb-bar">
        <Link to="/">🏠 Trang chủ</Link>
        <span>›</span>
        <Link to="/movies">Danh mục phim</Link>
        {primaryGenre && (
          <>
            <span>›</span>
            <Link to={`/movies?genre_id=${primaryGenre.id}`}>{primaryGenre.name}</Link>
          </>
        )}
        <span>›</span>
        <span className="current">{cleanTitle(movie.title)}</span>
      </nav>

      <div className="detail-shell">
        {bgUrl && <div className="detail-backdrop" style={{ backgroundImage: `url(${bgUrl})` }} />}
        <div className="detail">
          <div className="detail-poster-col">
            <Poster movie={movie} size="lg" />
            <button
              type="button"
              className="btn block"
              style={{ marginTop: 12, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              onClick={() => {
                setWatchOpen(true)
                setTimeout(() => document.getElementById('cinema-watch-room')?.scrollIntoView({ behavior: 'smooth' }), 80)
              }}
            >
              ▶️ Xem Phim Ngay (FHD)
            </button>
            <button
              type="button"
              className="btn ghost block"
              style={{ marginTop: 8 }}
              onClick={() => setShowTrailer(true)}
            >
              🎬 Xem Trailer Chính Thức
            </button>
          </div>

          <div className="detail-info">
            <div className="detail-badges">
              <span className="tag ok">FHD 1080p · Vietsub</span>
              <span className="tag info">PG-13</span>
              {movie.year && <span className="hero-year">{movie.year}</span>}
              {meta?.runtime && <span className="hero-year">⏱ {meta.runtime}</span>}
              {meta?.country && <span className="hero-year">🌍 {meta.country}</span>}
              {meta?.imdbRating && <span className="imdb-badge">IMDb ★ {meta.imdbRating}</span>}
              <span className="hero-year">👁️ {estViews.toLocaleString('vi-VN')} lượt xem</span>
            </div>

            <h1>{cleanTitle(movie.title)}</h1>

            <div className="chips">
              {movie.genres.map(g => (
                <Link key={g.id} className="chip" to={`/movies?genre_id=${g.id}`}>{g.name}</Link>
              ))}
            </div>

            {meta?.awards && (
              <div className="awards-line">🏆 {meta.awards}</div>
            )}

            {!movie.is_active && <div className="alert warn">Phim đang bị ẩn khỏi danh mục.</div>}

            <div className="score-boxes">
              <div className="score-box">
                <div className="label">Điểm cộng đồng MovieLens</div>
                <div className="value"><Stars value={movie.rating_avg} /> <span className="muted small">/ 5.0</span></div>
                <div className="muted small">{movie.rating_count.toLocaleString('vi-VN')} lượt đánh giá</div>
              </div>
              {meta?.imdbRating && (
                <div className="score-box">
                  <div className="label">Điểm IMDb Quốc tế</div>
                  <div className="value" style={{ color: '#f59e0b', fontWeight: 700 }}>★ {meta.imdbRating} <span className="muted small">/ 10</span></div>
                  <div className="muted small">Internet Movie Database</div>
                </div>
              )}
              <div className="score-box">
                <div className="label">Điểm của bạn</div>
                <div className="value">
                  {movie.my_rating != null ? <Stars value={movie.my_rating} /> : <span className="muted">Chưa chấm</span>}
                </div>
                <div className="muted small">{movie.my_rating != null ? 'Đã lưu trong hồ sơ AI' : 'Chấm điểm để AI học gu'}</div>
              </div>
            </div>

            <div className="synopsis-box">
              <h3>Tóm tắt nội dung</h3>
              <p>{synopsis || 'Bộ phim thuộc bộ dữ liệu chuẩn MovieLens (GroupLens Research). Hãy chấm điểm bộ phim này nếu bạn đã xem để hệ thống AI cá nhân hóa danh sách gợi ý cho bạn.'}</p>
            </div>

            {(meta?.director?.length > 0 || meta?.cast?.length > 0 || meta?.writer?.length > 0) && (
              <div className="credits-grid">
                {meta.director?.length > 0 && (
                  <div><span className="muted small">Đạo diễn:</span> <b>{meta.director.join(', ')}</b></div>
                )}
                {meta.writer?.length > 0 && (
                  <div><span className="muted small">Biên kịch:</span> <span>{meta.writer.slice(0, 3).join(', ')}</span></div>
                )}
                {meta.cast?.length > 0 && (
                  <div className="full">
                    <span className="muted small">Diễn viên chính:</span>{' '}
                    <span className="cast-list">
                      {meta.cast.slice(0, 6).map(c => <span key={c} className="cast-chip">{c}</span>)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="rate-panel">
              <div className="label">
                <b>{movie.my_rating != null ? 'Sửa điểm đánh giá của bạn' : 'Chấm điểm bộ phim này'}</b> (Thang 0.5 – 5.0 sao)
              </div>
              <div className="row-actions" style={{ justifyContent: 'space-between' }}>
                <StarInput value={movie.my_rating} onChange={rate} disabled={busy} />
                <div className="row-actions">
                  {movie.my_rating != null && (
                    <button className="btn ghost sm" onClick={unrate} disabled={busy}>Xóa điểm</button>
                  )}
                  <button className={`btn sm ${movie.in_watchlist ? 'ghost' : ''}`} onClick={toggleWatch}>
                    {movie.in_watchlist ? '✓ Đã lưu trong Muốn xem' : '+ Thêm vào Muốn xem'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href)
                      setMsg('🔗 Đã sao chép đường dẫn bộ phim vào bộ nhớ tạm!')
                    }}
                  >
                    🔗 Chia sẻ
                  </button>
                </div>
              </div>
            </div>

            {msg && <div className="alert ok">{msg}</div>}
            <ErrorBox error={error} />

            {movie.link && (
              <div className="muted small">
                Liên kết dữ liệu chuẩn:{' '}
                {movie.link.imdb_id && (
                  <a href={`https://www.imdb.com/title/${movie.link.imdb_id}/`} target="_blank" rel="noreferrer">
                    IMDb ({movie.link.imdb_id}) ↗
                  </a>
                )}
                {movie.link.tmdb_id && (
                  <> · <a href={`https://www.themoviedb.org/movie/${movie.link.tmdb_id}`} target="_blank" rel="noreferrer">TMDB (#{movie.link.tmdb_id}) ↗</a></>
                )}
              </div>
            )}

            {/* Từ khóa SEO / Hashtags học từ GhienPhim */}
            <div className="seo-tags-row">
              <span className="muted small">Từ khóa nổi bật:</span>
              <Link to={`/movies?q=${encodeURIComponent(cleanTitle(movie.title).split(' ')[0])}`} className="seo-tag">
                #{slugTag}
              </Link>
              <Link to={`/movies?q=${encodeURIComponent(cleanTitle(movie.title).split(' ')[0])}`} className="seo-tag">
                #{slugTag}_vietsub_fhd
              </Link>
              {movie.year && (
                <Link to={`/movies?year_from=${movie.year}&year_to=${movie.year}`} className="seo-tag">
                  #phim_{movie.year}
                </Link>
              )}
              {movie.genres.slice(0, 3).map(g => (
                <Link key={g.id} to={`/movies?genre_id=${g.id}`} className="seo-tag">
                  #{g.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}
                </Link>
              ))}
            </div>
          </div>

          <div className="detail-dist card">
            <h3>Phân bố điểm cộng đồng</h3>
            <BarChart data={dist} labelKey="score" valueKey="count" color="#f59e0b" />
            <p className="muted small" style={{ marginTop: 10 }}>
              Tổng hợp từ dữ liệu MovieLens và đánh giá trực tiếp của người dùng trên hệ thống.
            </p>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(148,163,184,0.18)' }}>
              <div className="small" style={{ fontWeight: 700, marginBottom: 4 }}>🧮 Điểm Trọng số Bayes (Popularity WR)</div>
              <div className="muted small" style={{ lineHeight: 1.5 }}>
                Công thức: <code>WR = (v/(v+m))·R + (m/(v+m))·C</code><br />
                Với <code>v = {movie.rating_count}</code>, <code>R = {movie.rating_avg ?? 0}</code>, <code>m = 50</code>, <code>C = 3.50</code>:<br />
                Điểm WR = <b style={{ color: '#f59e0b' }}>
                  ★ {(
                    ((movie.rating_count / (movie.rating_count + 50)) * (movie.rating_avg || 3.5)) +
                    ((50 / (movie.rating_count + 50)) * 3.5)
                  ).toFixed(3)}
                </b> / 5.0
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phòng Chiếu Phim Trực Tuyến (Cinema Watch Room - Đa Server & Chế độ Tắt đèn) */}
      {watchOpen && (
        <section id="cinema-watch-room" className={`section watch-room-card ${lightsOff ? 'lights-off-focus' : ''}`}>
          <div className="watch-room-head">
            <div>
              <span className="tag ok">ĐANG PHÁT: {activeCut}</span>
              <h2 style={{ margin: '6px 0 2px' }}>🎬 Phòng Chiếu: {cleanTitle(movie.title)} ({movie.year || '—'})</h2>
              <span className="muted small">
                Server #{serverIdx} · Chất lượng FHD 1080p · Âm thanh Dolby / Vietsub Chuẩn
              </span>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className={`btn sm ${lightsOff ? '' : 'ghost'}`}
                onClick={() => setLightsOff(v => !v)}
              >
                {lightsOff ? '💡 Bật đèn' : '🌙 Tắt đèn rạp phim'}
              </button>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setMsg('🚩 Đã gửi báo cáo lỗi link/phụ đề tới Quản trị viên. Bạn có thể chuyển sang Server #2 hoặc #3!')}
              >
                🚩 Báo link hỏng
              </button>
              <button type="button" className="btn ghost sm" onClick={() => { setWatchOpen(false); setLightsOff(false) }}>
                Đóng khung chiếu ✕
              </button>
            </div>
          </div>

          {/* Thanh chọn Server kiểu GhienPhim & AnimeVietSub */}
          <div className="server-bar">
            <span className="muted small">🌐 Chọn Server phát:</span>
            {[
              { id: 1, name: '⚡ Server #1: VIP FHD (Vietsub)' },
              { id: 2, name: '🎙️ Server #2: Thuyết Minh HD' },
              { id: 3, name: '🎬 Server #3: YouTube Preview Backup' },
            ].map(sv => (
              <button
                key={sv.id}
                type="button"
                className={`chip ${serverIdx === sv.id ? 'active' : ''}`}
                onClick={() => setServerIdx(sv.id)}
              >
                {sv.name}
              </button>
            ))}
          </div>

          <div className="video-frame" style={{ margin: '12px 0' }}>
            {ytId && serverIdx !== 2 ? (
              <iframe
                title={`Watch ${cleanTitle(movie.title)}`}
                src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <iframe
                title={`Watch ${cleanTitle(movie.title)}`}
                src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(cleanTitle(movie.title) + ' ' + (movie.year || '') + (serverIdx === 2 ? ' thuyet minh review' : ' official trailer hd'))}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>

          {/* Thanh chọn Tập / Phiên bản kèm ô tìm kiếm nhanh kiểu AnimeVietSub */}
          <div className="episode-box">
            <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="small" style={{ fontWeight: 700 }}>🎞️ Chọn Phiên bản / Tập phát ({cuts.length}):</span>
              <input
                style={{ maxWidth: 240, padding: '5px 10px', fontSize: '0.82rem' }}
                placeholder="🔍 Tìm nhanh tập / bản chiếu..."
                value={epSearch}
                onChange={e => setEpSearch(e.target.value)}
              />
            </div>
            <div className="chips" style={{ marginBottom: 0 }}>
              {cuts.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`chip ${activeCut === c ? 'active' : ''}`}
                  onClick={() => setActiveCut(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Khu vực Bình luận & Cảm nhận từ Cộng đồng */}
      <section className="section">
        <div className="section-head">
          <div>
            <h2>💬 Bình luận & Cảm nhận Cộng đồng ({reviews.length})</h2>
            <span className="muted small">Chia sẻ góc nhìn của bạn về bộ phim này (Hỗ trợ ẩn Spoiler)</span>
          </div>
          <div className="row-actions">
            <span className="muted small">Sắp xếp:</span>
            <select value={reviewSort} onChange={e => setReviewSort(e.target.value)}>
              <option value="newest">🕒 Mới nhất</option>
              <option value="high">⭐ Điểm cao nhất</option>
              <option value="low">📉 Điểm thấp nhất</option>
            </select>
          </div>
        </div>

        {/* Bảng vinh danh "Fan cứng của bộ phim" học từ AnimeVietSub */}
        {superfans.length > 0 && (
          <div className="card superfan-bar" style={{ marginBottom: 16 }}>
            <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>
              🏅 Vinh danh Fan cứng bộ phim này ({superfans.length} thành viên đánh giá tâm huyết ≥ 4.0★):
            </div>
            <div className="chips" style={{ marginBottom: 0 }}>
              {superfans.map(sf => (
                <span key={sf.id} className="superfan-pill">
                  👑 <b>{sf.full_name || sf.username}</b> <span className="muted">({sf.score.toFixed(1)}★)</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid2" style={{ alignItems: 'start' }}>
          <form className="card" onSubmit={submitReview}>
            <h3 style={{ marginTop: 0 }}>
              {movie.my_comment ? '✏️ Cập nhật bình luận của bạn' : '✍️ Viết đánh giá & bình luận'}
            </h3>
            {user ? (
              <>
                <div style={{ marginBottom: 10 }}>
                  <span className="muted small">Mức điểm chấm kèm bình luận: </span>
                  <StarInput
                    value={movie.my_rating != null ? movie.my_rating : draftScore}
                    onChange={s => setDraftScore(s)}
                    disabled={busy}
                  />
                </div>
                <textarea
                  rows={4}
                  placeholder="Cảm nhận của bạn về cốt truyện, diễn xuất, âm nhạc hay thông điệp của bộ phim..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  maxLength={1500}
                  style={{ width: '100%', marginBottom: 10 }}
                />
                <label className="spoiler-check">
                  <input
                    type="checkbox"
                    checked={isSpoiler}
                    onChange={e => setIsSpoiler(e.target.checked)}
                  />
                  <span>⚠️ Bình luận có tiết lộ nội dung phim (Tự động làm mờ chống Spoiler)</span>
                </label>
                <div className="row-actions" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                  <span className="muted small">{commentText.length}/1500 ký tự</span>
                  <button className="btn" disabled={busy}>
                    {movie.my_rating != null ? 'Lưu cập nhật đánh giá' : 'Đăng đánh giá & bình luận'}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty" style={{ padding: 20 }}>
                Bạn cần <Link to="/login"><b>Đăng nhập</b></Link> để chấm điểm và viết bình luận cho bộ phim này.
              </div>
            )}
          </form>

          <div className="list">
            {sortedReviews.length === 0 ? (
              <div className="empty">Chưa có bình luận nào trên web cho phim này. Hãy là người đầu tiên chia sẻ cảm nhận!</div>
            ) : (
              sortedReviews.map(rv => {
                const raw = rv.comment || ''
                const hasSpoiler = raw.startsWith('[SPOILER]')
                const cleanRvText = raw.replace(/^\[SPOILER\]\s*/, '')
                const isRevealed = !!revealedSpoilers[rv.id]
                return (
                  <div key={rv.id} className="card" style={{ padding: '14px 16px' }}>
                    <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                      <div className="row-actions" style={{ gap: 8 }}>
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 13,
                            color: '#fff',
                          }}
                        >
                          {(rv.full_name || rv.username || 'U').slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <b>{rv.full_name || rv.username}</b>{' '}
                          <span className="muted small">@{rv.username}</span>
                          {rv.score >= 4.0 && cleanRvText.length >= 10 && (
                            <span className="tag warn" style={{ marginLeft: 6 }}>👑 Fan cứng</span>
                          )}
                          <div className="muted small">
                            {new Date(rv.updated_at + 'Z').toLocaleString('vi-VN')}
                          </div>
                        </div>
                      </div>
                      <Stars value={rv.score} />
                    </div>
                    {cleanRvText ? (
                      hasSpoiler && !isRevealed ? (
                        <div className="spoiler-box">
                          <p className="spoiler-blurred">{cleanRvText}</p>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => setRevealedSpoilers(prev => ({ ...prev, [rv.id]: true }))}
                          >
                            👁️ Bình luận chứa Spoiler — Nhấn để xem
                          </button>
                        </div>
                      ) : (
                        <p style={{ margin: '6px 0 0', lineHeight: 1.55 }}>
                          {hasSpoiler && <span className="tag warn" style={{ marginRight: 6 }}>⚠️ Spoiler</span>}
                          {cleanRvText}
                        </p>
                      )
                    ) : (
                      <p className="muted small" style={{ margin: '4px 0 0', fontStyle: 'italic' }}>
                        Đã chấm {rv.score.toFixed(1)} ★ (không kèm nhận xét văn bản)
                      </p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            🔗 Phim tương tự cùng gu{' '}
            {similar && <span className="tag ok">{METHOD_LABEL[similar.source]}</span>}
          </h2>
          <span className="muted small">
            Tính từ ma trận tương đồng Adjusted Cosine giữa các vector đánh giá phim
          </span>
        </div>
        {!similar ? <Loading /> : similar.items.length === 0 ? <div className="empty">Chưa đủ dữ liệu để tìm phim tương tự.</div> : (
          <div className="movie-grid">
            {similar.items.map(({ movie: m, similarity }) => (
              <MovieCard
                key={m.id}
                movie={m}
                extra={
                  similarity != null && (
                    <div className="pred">
                      Độ tương đồng: <b>{Math.round(similarity * 100)}%</b> ({similarity.toFixed(2)})
                    </div>
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <MovieComparator movieA={movie} similarItems={similar?.items || []} />

      {showTrailer && (
        <TrailerModal
          ytId={ytId}
          title={movie.title}
          year={movie.year}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </div>
  )
}

function MovieComparator({ movieA, similarItems }) {
  const [searchQ, setSearchQ] = useState('')
  const [candidates, setCandidates] = useState([])
  const [cmp, setCmp] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setCmp(null)
    setSearchQ('')
    setCandidates([])
  }, [movieA.id])

  useEffect(() => {
    if (searchQ.trim().length < 2) {
      setCandidates([])
      return
    }
    const t = setTimeout(() => {
      api(`/api/movies?q=${encodeURIComponent(searchQ.trim())}&size=6`)
        .then(d => setCandidates((d.items || []).filter(x => x.id !== movieA.id)))
        .catch(() => {})
    }, 220)
    return () => clearTimeout(t)
  }, [searchQ, movieA.id])

  const runCompare = (otherId) => {
    setLoading(true)
    setCandidates([])
    api(`/api/movies/${movieA.id}/compare/${otherId}`)
      .then(setCmp)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <section className="section">
      <div className="card" style={{ border: '1px solid rgba(99, 102, 241, 0.35)' }}>
        <div className="section-head" style={{ marginTop: 0 }}>
          <div>
            <h2 style={{ margin: 0 }}>⚖️ Đối chiếu AI giữa 2 Bộ Phim & Tìm Phim Giao Thoa (Double Feature)</h2>
            <p className="muted small" style={{ margin: '4px 0 0' }}>
              Chọn một bộ phim thứ 2 để tính độ tương đồng Adjusted Cosine, số khán giả cùng xem và tìm 6 bộ phim giao thoa cho người thích cả hai!
            </p>
          </div>
        </div>

        <div className="row-actions" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <input
            placeholder="🔍 Gõ tên bộ phim thứ 2 để so sánh với phim này..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ minWidth: 280, flex: 1 }}
          />
          {similarItems.slice(0, 4).map(({ movie: sm }) => (
            <button
              key={sm.id}
              type="button"
              className="chip"
              onClick={() => runCompare(sm.id)}
              title="Bấm để so sánh nhanh"
            >
              ⚡ So sánh với: {cleanTitle(sm.title).slice(0, 22)}
            </button>
          ))}
        </div>

        {candidates.length > 0 && (
          <div className="list" style={{ marginBottom: 14 }}>
            {candidates.map(c => (
              <div key={c.id} className="list-row" style={{ padding: '6px 10px' }}>
                <Poster movie={c} size="sm" />
                <div className="grow">
                  <b>{cleanTitle(c.title)}</b> <span className="muted small">({c.year || '—'})</span>
                  <div className="muted small">{c.genres.map(g => g.name).join(', ')}</div>
                </div>
                <button type="button" className="btn sm" onClick={() => runCompare(c.id)}>
                  ⚖️ Chọn đối chiếu
                </button>
              </div>
            ))}
          </div>
        )}

        {loading && <Loading />}

        {cmp && !loading && (
          <div style={{ marginTop: 12 }}>
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              <div className="stat card" style={{ background: 'rgba(15, 23, 42, 0.7)' }}>
                <div className="stat-value" style={{ color: '#10b981' }}>
                  {Math.round((cmp.effective_similarity || 0) * 100)}%
                </div>
                <div className="muted small">
                  {cmp.knn_similarity != null ? 'Độ tương đồng Item-KNN' : 'Độ giao thoa thể loại (Jaccard)'}
                </div>
              </div>
              <div className="stat card" style={{ background: 'rgba(15, 23, 42, 0.7)' }}>
                <div className="stat-value" style={{ color: '#f59e0b' }}>{cmp.co_raters}</div>
                <div className="muted small">Khán giả đã cùng chấm cả 2 phim</div>
              </div>
              <div className="stat card" style={{ background: 'rgba(15, 23, 42, 0.7)' }}>
                <div className="stat-value" style={{ color: '#8b5cf6' }}>{cmp.shared_genres.length}</div>
                <div className="muted small">
                  Thể loại chung ({cmp.shared_genres.join(', ') || 'Không trùng'})
                </div>
              </div>
            </div>

            <div className="grid2" style={{ marginBottom: 16 }}>
              {[
                { m: cmp.movie_a, coAvg: cmp.avg_a_by_coraters, label: 'Phim đang xem (A)' },
                { m: cmp.movie_b, coAvg: cmp.avg_b_by_coraters, label: 'Phim đối chiếu (B)' },
              ].map(({ m, coAvg, label }) => (
                <div key={m.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Link to={`/movies/${m.id}`}><Poster movie={m} size="sm" /></Link>
                  <div className="grow">
                    <span className="muted small">{label}</span>
                    <div><Link to={`/movies/${m.id}`} className="movie-title">{cleanTitle(m.title)}</Link></div>
                    <div className="muted small">
                      Năm: <b>{m.year || '—'}</b> · Điểm TB: <Stars value={m.rating_avg} /> ({m.rating_count} lượt)
                    </div>
                    {coAvg != null && (
                      <div className="small" style={{ color: '#38bdf8', marginTop: 2 }}>
                        Nhóm khán giả xem cả 2 phim chấm: <b>★ {coAvg}</b>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {cmp.joint_recommendations?.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 10 }}>
                  🎯 Gợi ý Giao Thoa: Nếu bạn thích cả “{cleanTitle(cmp.movie_a.title)}” và “{cleanTitle(cmp.movie_b.title)}”
                </h3>
                <div className="movie-grid">
                  {cmp.joint_recommendations.map(({ movie: jm, predicted_score }) => (
                    <MovieCard
                      key={jm.id}
                      movie={jm}
                      extra={<div className="pred">Điểm kết hợp AI: <b>★ {predicted_score?.toFixed(2)}</b></div>}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
