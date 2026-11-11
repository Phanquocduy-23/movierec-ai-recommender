import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import {
  cleanTitle, clearRecentlyViewed, ErrorBox, extractImdbId, fetchCinemeta, getRecentlyViewed,
  Loading, METHOD_LABEL, MovieCard, Poster, Stars, TrailerModal,
} from '../components/ui'

const MOODS = [
  { id: 'Action', label: '💥 Kịch tính & Hành động', desc: 'Nhịp độ dồn dập, kỹ xảo mãn nhãn' },
  { id: 'Sci-Fi', label: '🧠 Hack não & Viễn tưởng', desc: 'Du hành không gian, tương lai & chiều không gian' },
  { id: 'Romance', label: '💖 Lãng mạn & Chữa lành', desc: 'Những câu chuyện tình cảm giàu cảm xúc' },
  { id: 'Comedy', label: '😂 Hài hước & Thư giãn', desc: 'Tiếng cười sảng khoái giải tỏa căng thẳng' },
  { id: 'Crime', label: '🕵️ Hình sự & Trinh thám', desc: 'Đấu trí căng thẳng, điều tra phá án' },
  { id: 'Animation', label: '👨‍👩‍👧‍👦 Hoạt hình & Gia đình', desc: 'Thế giới kỳ diệu cho mọi lứa tuổi' },
]

export default function Home() {
  const { user } = useAuth()
  const [recs, setRecs] = useState(null)
  const [popular, setPopular] = useState(null)
  const [topRated, setTopRated] = useState(null)
  const [genres, setGenres] = useState([])
  const [recent, setRecent] = useState([])
  const [activeMood, setActiveMood] = useState('')
  const [moodMovies, setMoodMovies] = useState([])
  const [surpriseMovie, setSurpriseMovie] = useState(null)
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

  const selectMood = (moodName) => {
    if (activeMood === moodName) {
      setActiveMood('')
      setMoodMovies([])
      return
    }
    setActiveMood(moodName)
    const g = genres.find(x => x.name.toLowerCase() === moodName.toLowerCase())
    const q = g ? `?genre_id=${g.id}&sort=rating&min_ratings=30&size=6` : `?sort=rating&min_ratings=30&size=6`
    api(`/api/movies${q}`).then(d => setMoodMovies(d.items || [])).catch(() => {})
  }

  const pickSurprise = () => {
    const pool = [
      ...(recs?.items?.map(i => i.movie) || []),
      ...(topRated || []),
      ...(popular || []),
    ]
    if (!pool.length) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setSurpriseMovie(pick)
  }

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
              <button type="button" className="btn ghost" onClick={pickSurprise}>
                🎲 Bốc thăm Phim Ngẫu nhiên
              </button>
              <Link className="btn ghost" to="/movies">Khám phá kho phim</Link>
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

      {/* Hộp kết quả Bốc thăm Ngẫu nhiên (Surprise Me) */}
      {surpriseMovie && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid #f59e0b', background: 'linear-gradient(135deg, rgba(30,41,59,0.96), rgba(15,23,42,0.98))' }}>
          <div className="list-row" style={{ border: 'none', padding: 0 }}>
            <Link to={`/movies/${surpriseMovie.id}`}><Poster movie={surpriseMovie} size="sm" /></Link>
            <div className="grow">
              <span className="tag warn">🎲 Gợi ý Bất ngờ Hôm nay dành cho bạn</span>
              <h3 style={{ margin: '6px 0 4px' }}>
                <Link to={`/movies/${surpriseMovie.id}`}>{cleanTitle(surpriseMovie.title)}</Link>{' '}
                <span className="muted">({surpriseMovie.year || '—'})</span>
              </h3>
              <div className="muted small">
                <Stars value={surpriseMovie.rating_avg} /> ({surpriseMovie.rating_count} lượt đánh giá) ·{' '}
                {(surpriseMovie.genres || []).map(g => g.name).join(', ')}
              </div>
            </div>
            <div className="row-actions">
              <button type="button" className="btn ghost sm" onClick={pickSurprise}>🎲 Đổi phim khác</button>
              <Link className="btn sm" to={`/movies/${surpriseMovie.id}`}>Xem ngay →</Link>
              <button type="button" className="btn ghost sm" onClick={() => setSurpriseMovie(null)}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Khu vực Chọn Phim Theo Tâm Trạng (Mood Matcher) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0 }}>🎭 Hôm nay tâm trạng của bạn thế nào?</h3>
            <span className="muted small">Chọn một tâm trạng để AI lọc ngay những tuyệt phẩm điện ảnh phù hợp nhất</span>
          </div>
          {activeMood && (
            <button type="button" className="btn ghost sm" onClick={() => { setActiveMood(''); setMoodMovies([]) }}>
              Đóng ✕
            </button>
          )}
        </div>
        <div className="chips" style={{ marginBottom: activeMood ? 14 : 0 }}>
          {MOODS.map(m => (
            <button
              key={m.id}
              type="button"
              className={`chip ${activeMood === m.id ? 'active' : ''}`}
              onClick={() => selectMood(m.id)}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>
        {activeMood && (
          <div>
            {moodMovies.length === 0 ? <Loading /> : (
              <div className="movie-grid">
                {moodMovies.map(m => <MovieCard key={m.id} movie={m} />)}
              </div>
            )}
          </div>
        )}
      </div>

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
          <Link to="/recommendations" className="btn ghost sm">🔬 Phòng thí nghiệm 3 thuật toán →</Link>
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
        <section className="section">
          <div className="section-head">
            <h2>🕒 Phim bạn vừa xem gần đây ({recent.length})</h2>
            <div className="row-actions">
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => { clearRecentlyViewed(); setRecent([]) }}
              >
                🗑️ Xóa lịch sử xem
              </button>
              <Link to="/movies">Xem tất cả →</Link>
            </div>
          </div>
          <Grid items={recent} />
        </section>
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
