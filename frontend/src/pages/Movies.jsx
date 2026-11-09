import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, qs } from '../api'
import { cleanTitle, Empty, ErrorBox, Loading, MovieCard, Pagination, Poster, Stars } from '../components/ui'

const DECADES = [
  { label: 'Tất cả năm', from: '', to: '' },
  { label: '2010 – nay', from: '2010', to: '' },
  { label: '2000 – 2009', from: '2000', to: '2009' },
  { label: '1990 – 1999', from: '1990', to: '1999' },
  { label: '1980 – 1989', from: '1980', to: '1989' },
  { label: 'Kinh điển (<1980)', from: '', to: '1979' },
]

export default function Movies() {
  const [params, setParams] = useSearchParams()
  const [genres, setGenres] = useState([])
  const [data, setData] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [error, setError] = useState('')
  const [q, setQ] = useState(params.get('q') || '')

  const filters = {
    q: params.get('q') || '',
    genre_id: params.get('genre_id') || '',
    sort: params.get('sort') || 'popular',
    year_from: params.get('year_from') || '',
    year_to: params.get('year_to') || '',
    min_ratings: params.get('min_ratings') || '',
    page: Number(params.get('page') || 1),
  }

  const update = (patch) => {
    const next = { ...filters, page: 1, ...patch }
    Object.keys(next).forEach(k => (next[k] === '' || next[k] == null) && delete next[k])
    setParams(next)
  }

  useEffect(() => { setQ(params.get('q') || '') }, [params])
  useEffect(() => { api('/api/genres').then(setGenres).catch(() => {}) }, [])
  useEffect(() => {
    setData(null); setError('')
    api('/api/movies' + qs({ ...filters, size: 24 })).then(setData).catch(e => setError(e.message))
  }, [params.toString()]) // eslint-disable-line

  const hasActiveFilter = Boolean(filters.q || filters.genre_id || filters.year_from || filters.year_to || filters.min_ratings)

  return (
    <div>
      <div className="section-head">
        <div>
          <h1>Khám phá kho phim</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            {data ? `Tìm thấy ${data.total.toLocaleString('vi-VN')} bộ phim trong cơ sở dữ liệu MovieLens` : 'Đang tải danh mục phim…'}
          </p>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className={`btn sm ${viewMode === 'grid' ? '' : 'ghost'}`}
            onClick={() => setViewMode('grid')}
          >
            ▦ Lưới Poster
          </button>
          <button
            type="button"
            className={`btn sm ${viewMode === 'list' ? '' : 'ghost'}`}
            onClick={() => setViewMode('list')}
          >
            ☰ Danh sách
          </button>
        </div>
      </div>

      <form className="filters card" style={{ padding: 14 }} onSubmit={e => { e.preventDefault(); update({ q }) }}>
        <input placeholder="🔍 Tìm theo tên phim (vd: Toy Story, Inception, Star Wars)…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={filters.genre_id} onChange={e => update({ genre_id: e.target.value })}>
          <option value="">Tất cả thể loại</option>
          {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input type="number" placeholder="Từ năm" style={{ width: 105 }} value={filters.year_from} onChange={e => update({ year_from: e.target.value })} />
        <input type="number" placeholder="Đến năm" style={{ width: 105 }} value={filters.year_to} onChange={e => update({ year_to: e.target.value })} />
        <select value={filters.min_ratings} onChange={e => update({ min_ratings: e.target.value })}>
          <option value="">Mọi số lượt chấm</option>
          <option value="20">≥ 20 lượt chấm</option>
          <option value="50">≥ 50 lượt chấm</option>
          <option value="100">≥ 100 lượt chấm</option>
        </select>
        <select value={filters.sort} onChange={e => update({ sort: e.target.value })}>
          <option value="popular">🔥 Nhiều đánh giá nhất</option>
          <option value="rating">⭐ Điểm trung bình cao</option>
          <option value="year">🆕 Mới phát hành</option>
          <option value="title">🔤 Tên A-Z</option>
        </select>
        <button className="btn">Lọc phim</button>
        {hasActiveFilter && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => { setQ(''); setParams({}) }}
          >
            ✕ Xóa lọc
          </button>
        )}
      </form>

      <div className="chips" style={{ marginBottom: 16 }}>
        {DECADES.map(d => {
          const active = filters.year_from === d.from && filters.year_to === d.to
          return (
            <button
              key={d.label}
              type="button"
              className={`chip ${active ? 'active' : ''}`}
              onClick={() => update({ year_from: d.from, year_to: d.to })}
            >
              {d.label}
            </button>
          )
        })}
      </div>

      <ErrorBox error={error} />
      {!data ? <Loading /> : data.items.length === 0 ? <Empty>Không có phim phù hợp bộ lọc.</Empty> : (
        <>
          {viewMode === 'grid' ? (
            <div className="movie-grid">{data.items.map(m => <MovieCard key={m.id} movie={m} />)}</div>
          ) : (
            <div className="list">
              {data.items.map(m => (
                <div key={m.id} className="list-row">
                  <Link to={`/movies/${m.id}`}><Poster movie={m} size="sm" /></Link>
                  <div className="grow">
                    <Link to={`/movies/${m.id}`} className="movie-title">{cleanTitle(m.title)}</Link>
                    <div className="muted small">
                      Năm: <b>{m.year || '—'}</b> · Thể loại: {m.genres.map(g => g.name).join(', ') || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div><Stars value={m.rating_avg} /></div>
                    <div className="muted small">{m.rating_count} lượt đánh giá</div>
                  </div>
                  <Link to={`/movies/${m.id}`} className="btn ghost sm">Chi tiết & Chấm điểm →</Link>
                </div>
              ))}
            </div>
          )}
          <Pagination page={data.page} size={data.size} total={data.total} onChange={p => update({ page: p })} />
        </>
      )}
    </div>
  )
}
