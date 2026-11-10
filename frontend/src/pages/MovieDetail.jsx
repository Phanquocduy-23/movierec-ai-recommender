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
  const [draftScore, setDraftScore] = useState(4.5)
  const [showTrailer, setShowTrailer] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    api(`/api/movies/${id}`).then(m => {
      setMovie(m)
      setCommentText(m.my_comment || '')
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
    setBusy(true); setError('')
    try {
      await api(`/api/ratings/${id}`, {
        method: 'PUT',
        body: { score: scoreToSave, comment: commentText },
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

  return (
    <div>
      <div className="detail-shell">
        {bgUrl && <div className="detail-backdrop" style={{ backgroundImage: `url(${bgUrl})` }} />}
        <div className="detail">
          <div className="detail-poster-col">
            <Poster movie={movie} size="lg" />
            <button
              type="button"
              className="btn block"
              style={{ marginTop: 12 }}
              onClick={() => setShowTrailer(true)}
            >
              🎬 Xem Trailer Chính Thức
            </button>
          </div>

          <div className="detail-info">
            <div className="detail-badges">
              {movie.year && <span className="hero-year">{movie.year}</span>}
              {meta?.runtime && <span className="hero-year">⏱ {meta.runtime}</span>}
              {meta?.country && <span className="hero-year">🌍 {meta.country}</span>}
              {meta?.imdbRating && <span className="imdb-badge">IMDb ★ {meta.imdbRating}</span>}
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

      {/* Khu vực Bình luận & Cảm nhận từ Cộng đồng */}
      <section className="section">
        <div className="section-head">
          <h2>💬 Bình luận & Cảm nhận Cộng đồng ({reviews.length})</h2>
          <span className="muted small">Chia sẻ góc nhìn của bạn về bộ phim này</span>
        </div>

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
                <div className="row-actions" style={{ justifyContent: 'space-between' }}>
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
            {reviews.length === 0 ? (
              <div className="empty">Chưa có bình luận nào trên web cho phim này. Hãy là người đầu tiên chia sẻ cảm nhận!</div>
            ) : (
              reviews.map(rv => (
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
                        <div className="muted small">
                          {new Date(rv.updated_at + 'Z').toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    <Stars value={rv.score} />
                  </div>
                  {rv.comment ? (
                    <p style={{ margin: '6px 0 0', lineHeight: 1.55, color: '#e2e8f0' }}>{rv.comment}</p>
                  ) : (
                    <p className="muted small" style={{ margin: '4px 0 0', fontStyle: 'italic' }}>
                      Đã chấm {rv.score.toFixed(1)} ★ (không kèm nhận xét văn bản)
                    </p>
                  )}
                </div>
              ))
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
