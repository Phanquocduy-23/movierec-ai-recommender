import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import {
  cleanTitle, ErrorBox, extractImdbId, fetchCinemeta, getRecentlyViewed,
  Loading, METHOD_LABEL, MovieCard, Poster, Stars, TrailerModal,
} from '../components/ui'

export default function Home() {
  const { user } = useAuth()
  const [recs, setRecs] = useState(null)
  const [popular, setPopular] = useState(null)
  const [topRated, setTopRated] = useState(null)
  const [genres, setGenres] = useState([])
  const [recent, setRecent] = useState([])
  const [slideIdx, setSlideIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [heroMeta, setHeroMeta] = useState(null)
  const [trailer, setTrailer] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setRecent(getRecentlyViewed())
    api('/api/genres').then(setGenres).catch(() => {})
    api('/api/recommendations?n=12').then(setRecs).catch(e => setError(e.message))
    api('/api/movies?sort=popular&size=12').then(d => setPopular(d.items)).catch(() => {})
    api('/api/movies?sort=rating&min_ratings=50&size=12').then(d => setTopRated(d.items)).catch(() => {})
  }, [user])

  const slides = (recs?.items?.map(i => i.movie) || popular || []).slice(0, 5)
  const featured = slides[slideIdx] || slides[0]

  useEffect(() => {
    if (slides.length <= 1 || paused || trailer) return
    const t = setInterval(() => setSlideIdx(i => (i + 1) % slides.length), 6500)
    return () => clearInterval(t)
  }, [slides.length, paused, trailer])

  useEffect(() => {
    setHeroMeta(null)
    const imdbId = extractImdbId(featured)
    if (imdbId) {
      fetchCinemeta(imdbId).then(setHeroMeta)
    }
  }, [featured?.id])

  const imdbId = extractImdbId(featured)
  const bgUrl = heroMeta?.background || (imdbId ? `https://images.metahub.space/background/medium/${imdbId}/img` : featured?.poster_url)
  const ytId = heroMeta?.trailers?.[0]?.source || heroMeta?.trailerStreams?.[0]?.ytId || null

  return (
    <div>
      <section
        className="hero hero-cinema"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {bgUrl && <div className="hero-bg" style={{ backgroundImage: `url(${bgUrl})` }} />}
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-text">
            <span className="hero-kicker">
              {user
                ? `✨ Gợi ý #${slideIdx + 1} cho ${user.username} (${METHOD_LABEL[recs?.served_method || 'auto']})`
                : '🎬 Khám phá & Gợi ý Phim Thông minh bằng AI'}
            </span>
            <h1>{featured ? cleanTitle(featured.title) : 'Tìm phim hợp gu của bạn'}</h1>
            {featured && (
              <div className="hero-meta">
                {featured.year && <span className="hero-year">{featured.year}</span>}
                {heroMeta?.runtime && <span className="hero-year">⏱ {heroMeta.runtime}</span>}
                {heroMeta?.imdbRating && <span className="imdb-badge">IMDb {heroMeta.imdbRating}</span>}
                <Stars value={featured.rating_avg} />
                <span className="muted">({featured.rating_count} lượt chấm)</span>
                <div className="chips" style={{ marginBottom: 0 }}>
                  {featured.genres?.map(g => (
                    <Link key={g.id} to={`/movies?genre_id=${g.id}`} className="chip">{g.name}</Link>
                  ))}
                </div>
              </div>
            )}
            <p className="hero-desc">
              {heroMeta?.description ||
                'Chấm điểm những bộ phim bạn đã xem — hệ thống ứng dụng Lọc cộng tác (Item-based KNN & Phân rã ma trận SVD) trên dữ liệu MovieLens để dự đoán điểm và gợi ý bộ phim tiếp theo dành riêng cho bạn.'}
            </p>
            {heroMeta?.cast?.length > 0 && (
              <div className="muted small" style={{ marginBottom: 16 }}>
                <b>Diễn viên:</b> {heroMeta.cast.slice(0, 4).join(', ')}
                {heroMeta.director?.length > 0 && <> · <b>Đạo diễn:</b> {heroMeta.director.join(', ')}</>}
              </div>
            )}
            <div className="hero-actions">
              {featured && (
                <>
                  <Link className="btn" to={`/movies/${featured.id}`}>
                    ▶ Xem chi tiết & Chấm điểm
                  </Link>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setTrailer({ ytId, title: featured.title, year: featured.year })}
                  >
                    🎬 Xem Trailer
                  </button>
                </>
              )}
              <Link className="btn ghost" to="/movies">Khám phá kho phim</Link>
              {!user && <Link className="btn ghost" to="/register">Tạo tài khoản</Link>}
            </div>

            {slides.length > 1 && (
              <div className="hero-dots">
                {slides.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`hero-dot ${idx === slideIdx ? 'active' : ''}`}
                    onClick={() => setSlideIdx(idx)}
                    title={cleanTitle(m.title)}
                  >
                    {idx + 1}. {cleanTitle(m.title).slice(0, 18)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {featured && (
            <Link to={`/movies/${featured.id}`} className="hero-poster">
              <Poster movie={featured} size="lg" />
            </Link>
          )}
        </div>
      </section>

      {genres.length > 0 && (
        <div className="genre-strip">
          <span className="genre-strip-label">Thể loại:</span>
          {genres.map(g => (
            <Link key={g.id} to={`/movies?genre_id=${g.id}`} className="chip">
              {g.name}
            </Link>
          ))}
        </div>
      )}

      {recs && (
        <div className="ai-status-bar">
          <div>
            <b>🤖 Trạng thái AI:</b> Đang phục vụ bằng nhánh{' '}
            <span className={`tag ${recs.fallback ? 'warn' : 'ok'}`}>
              {METHOD_LABEL[recs.served_method]}{recs.fallback ? ' · Dự phòng' : ''}
            </span>
            {recs.model_version && <> · Phiên bản <code>{recs.model_version}</code></>}
            <span className="muted" style={{ marginLeft: 8 }}>{recs.reason}</span>
          </div>
          <Link to="/recommendations" className="btn ghost sm">Đổi thuật toán AI →</Link>
        </div>
      )}

      <ErrorBox error={error} />

      <Section title={user ? '🎯 Gợi ý cá nhân hóa dành cho bạn' : '✨ Phim nổi bật đề xuất'} link="/recommendations"
        note={recs && <span className={`tag ${recs.fallback ? 'warn' : 'ok'}`}>{METHOD_LABEL[recs.served_method]}</span>}>
        {recs ? (
          <div className="movie-grid">
            {recs.items.map((it, idx) => (
              <MovieCard
                key={it.movie.id}
                movie={it.movie}
                badge={`#${idx + 1}`}
                extra={
                  <>
                    {it.source !== 'popular'
                      ? <div className="pred">AI dự đoán: <b>★ {it.predicted_score?.toFixed(2)}</b></div>
                      : <div className="pred muted">Weighted: ★ {it.predicted_score?.toFixed(2)}</div>}
                    {it.because?.length > 0 && (
                      <div className="because">Vì thích: {it.because.map(cleanTitle).join(', ')}</div>
                    )}
                  </>
                }
              />
            ))}
          </div>
        ) : <Loading />}
      </Section>

      {recent.length > 0 && (
        <Section title="🕒 Phim bạn vừa xem gần đây" link="/movies">
          <Grid items={recent} />
        </Section>
      )}

      <Section title="🔥 Thịnh hành (Được đánh giá nhiều nhất)" link="/movies?sort=popular">
        {popular ? <Grid items={popular} /> : <Loading />}
      </Section>

      <Section title="⭐ Bảng xếp hạng Điểm cao (≥ 50 lượt đánh giá)" link="/movies?sort=rating">
        {topRated ? <Grid items={topRated} /> : <Loading />}
      </Section>

      {trailer && (
        <TrailerModal
          ytId={trailer.ytId}
          title={trailer.title}
          year={trailer.year}
          onClose={() => setTrailer(null)}
        />
      )}
    </div>
  )
}

function Section({ title, link, note, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title} {note}</h2>
        {link && <Link to={link}>Xem tất cả →</Link>}
      </div>
      {children}
    </section>
  )
}

function Grid({ items }) {
  if (!items.length) return <div className="empty">Chưa có dữ liệu phim. Quản trị viên cần nhập MovieLens.</div>
  return <div className="movie-grid">{items.map(m => <MovieCard key={m.id} movie={m} />)}</div>
}
