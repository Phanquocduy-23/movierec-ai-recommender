import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const PALETTE = [
  ['#312e81', '#1e1b4b'],
  ['#0f766e', '#042f2e'],
  ['#9a3412', '#431407'],
  ['#1d4ed8', '#172554'],
  ['#be123c', '#4c0519'],
  ['#6d28d9', '#2e1065'],
  ['#0369a1', '#082f49'],
  ['#b45309', '#451a03'],
]

export function cleanTitle(title = '') {
  return title.replace(/^(.*),\s+(The|A|An)$/i, '$2 $1')
}

export function extractImdbId(movie) {
  return movie?.link?.imdb_id || movie?.poster_url?.match(/tt\d+/)?.[0] || null
}

// Bộ nhớ đệm metadata mở rộng từ Cinemeta (IMDb public CDN)
const metaCache = new Map()

export async function fetchCinemeta(imdbId) {
  if (!imdbId) return null
  if (metaCache.has(imdbId)) return metaCache.get(imdbId)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4500)
  try {
    const res = await fetch(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`, { signal: ctrl.signal })
    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.meta || null
    if (meta) metaCache.set(imdbId, meta)
    return meta
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Lưu lịch sử phim vừa xem vào localStorage
const RECENT_KEY = 'movierec_recently_viewed'

export function rememberViewed(movie) {
  if (!movie?.id) return
  try {
    const cur = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    const slim = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      poster_url: movie.poster_url,
      rating_avg: movie.rating_avg,
      rating_count: movie.rating_count,
      genres: movie.genres || [],
    }
    const next = [slim, ...cur.filter(x => x.id !== movie.id)].slice(0, 12)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // ignore storage errors
  }
}

export function getRecentlyViewed() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

export function Poster({ movie, size = 'md' }) {
  const [broken, setBroken] = useState(false)
  const imdbId = extractImdbId(movie)
  const fallbackImdb = imdbId ? `https://images.metahub.space/poster/medium/${imdbId}/img` : null
  const src = movie?.poster_url || fallbackImdb

  useEffect(() => {
    setBroken(false)
  }, [movie?.id, src])

  const displayTitle = cleanTitle(movie?.title || '')

  if (src && !broken) {
    return (
      <img
        className={`poster ${size}`}
        src={src}
        alt={displayTitle}
        onError={() => setBroken(true)}
        loading="lazy"
      />
    )
  }

  const [c1, c2] = PALETTE[(movie?.id || 0) % PALETTE.length]
  return (
    <div
      className={`poster ${size} placeholder`}
      style={{ background: `radial-gradient(circle at 30% 20%, ${c1}, ${c2} 85%)` }}
    >
      <div className="poster-fallback-inner">
        <div className="poster-fallback-icon">🎬</div>
        {size !== 'sm' && (
          <>
            <div className="poster-fallback-title">{displayTitle}</div>
            {movie?.year && <div className="poster-fallback-year">{movie.year}</div>}
          </>
        )}
      </div>
    </div>
  )
}

export function Stars({ value }) {
  if (value == null) return <span className="muted">Chưa có</span>
  return <span className="stars-static">★ {Number(value).toFixed(1)}</span>
}

export function StarInput({ value, onChange, disabled }) {
  const [hover, setHover] = useState(null)
  const shown = hover ?? value ?? 0
  return (
    <div className="star-input" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="star-slot">
          {[i - 0.5, i].map(v => (
            <button key={v} type="button" disabled={disabled} title={`${v} điểm`}
              className={`half ${v % 1 ? 'left' : 'right'} ${shown >= v ? 'on' : ''}`}
              onMouseEnter={() => setHover(v)} onClick={() => onChange(v)} />
          ))}
          <span className={`star-char ${shown >= i ? 'on' : shown >= i - 0.5 ? 'halfon' : ''}`}>★</span>
        </span>
      ))}
      <span className="star-value">{shown ? shown.toFixed(1) : '–'}</span>
    </div>
  )
}

export function MovieCard({ movie, extra, badge }) {
  const title = cleanTitle(movie.title)
  return (
    <Link to={`/movies/${movie.id}`} className="movie-card">
      <div className="poster-wrap">
        <Poster movie={movie} />
        <div className="poster-gradient" />
        {badge && <span className="badge-corner">{badge}</span>}
        {movie.rating_avg != null && (
          <span className="badge-rating">★ {Number(movie.rating_avg).toFixed(1)}</span>
        )}
        <div className="poster-hover">
          <span className="poster-hover-btn">▶ Xem & Chấm điểm</span>
        </div>
      </div>
      <div className="movie-card-body">
        <div className="movie-title" title={title}>{title}</div>
        <div className="movie-meta">
          <span>{movie.year || '—'}</span>
          <span className="muted">{movie.rating_count || 0} lượt</span>
        </div>
        <div className="genres-line">{(movie.genres || []).slice(0, 3).map(g => g.name).join(' · ')}</div>
        {extra}
      </div>
    </Link>
  )
}

export function TrailerModal({ ytId, title, year, onClose }) {
  if (!ytId && !title) return null
  const searchQuery = encodeURIComponent(`${cleanTitle(title)} ${year || ''} official trailer`)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>🎬 Trailer: {cleanTitle(title)} {year ? `(${year})` : ''}</h3>
          <button className="btn ghost sm" onClick={onClose}>✕ Đóng</button>
        </div>
        {ytId ? (
          <div className="video-frame">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="empty" style={{ margin: '16px 0' }}>
            <p>Phim này chưa có mã nhúng trailer trực tiếp trong kho metadata công khai.</p>
            <a
              className="btn"
              href={`https://www.youtube.com/results?search_query=${searchQuery}`}
              target="_blank"
              rel="noreferrer"
            >
              ▶ Mở tìm Trailer trên YouTube
            </a>
          </div>
        )}
        <div className="modal-foot">
          <span className="muted small">Nguồn trailer: YouTube / IMDb Public Metadata</span>
          <a
            className="btn ghost sm"
            href={ytId ? `https://www.youtube.com/watch?v=${ytId}` : `https://www.youtube.com/results?search_query=${searchQuery}`}
            target="_blank"
            rel="noreferrer"
          >
            Mở trong tab YouTube ↗
          </a>
        </div>
      </div>
    </div>
  )
}

export function Loading() { return <div className="center"><div className="spinner" /></div> }
export function ErrorBox({ error }) { return error ? <div className="alert error">{error}</div> : null }
export function Empty({ children }) { return <div className="empty">{children}</div> }

export function Pagination({ page, size, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size))
  if (pages <= 1) return null
  return (
    <div className="pagination">
      <button className="btn ghost sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Trước</button>
      <span>Trang {page} / {pages} · {total.toLocaleString('vi-VN')} kết quả</span>
      <button className="btn ghost sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Sau ›</button>
    </div>
  )
}

export function BarChart({ data, labelKey, valueKey, color = '#6366f1', format = v => v }) {
  const max = Math.max(1, ...data.map(d => d[valueKey]))
  return (
    <div className="barchart">
      {data.map(d => (
        <div key={d[labelKey]} className="bar-row">
          <span className="bar-label">{d[labelKey]}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(d[valueKey] / max) * 100}%`, background: color }} /></div>
          <span className="bar-value">{format(d[valueKey])}</span>
        </div>
      ))}
    </div>
  )
}

export const METHOD_LABEL = { svd: 'SVD', item_knn: 'Item-based KNN', popular: 'Phổ biến', auto: 'Tự động', genre_popular: 'Cùng thể loại' }
