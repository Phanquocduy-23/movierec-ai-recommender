import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Empty, ErrorBox, Loading, Pagination, Poster, StarInput } from '../components/ui'

export default function MyRatings() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('recent')
  const [error, setError] = useState('')

  const load = () => api(`/api/ratings/me?page=${page}&size=20&sort=${sort}`).then(setData).catch(e => setError(e.message))
  useEffect(() => { load() }, [page, sort]) // eslint-disable-line

  const rate = async (movieId, score) => {
    try { await api(`/api/ratings/${movieId}`, { method: 'PUT', body: { score } }); load() } catch (e) { setError(e.message) }
  }
  const remove = async (movieId) => {
    if (!confirm('Xóa đánh giá này?')) return
    try { await api(`/api/ratings/${movieId}`, { method: 'DELETE' }); load() } catch (e) { setError(e.message) }
  }

  return (
    <div>
      <div className="section-head">
        <h1>Lịch sử đánh giá {data && <span className="muted">({data.total})</span>}</h1>
        <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}>
          <option value="recent">Mới cập nhật</option>
          <option value="score_desc">Điểm cao → thấp</option>
          <option value="score_asc">Điểm thấp → cao</option>
        </select>
      </div>
      <ErrorBox error={error} />
      {!data ? <Loading /> : data.items.length === 0 ? <Empty>Bạn chưa đánh giá phim nào. <Link to="/movies">Khám phá phim</Link></Empty> : (
        <>
          <div className="list">
            {data.items.map(r => (
              <div key={r.movie_id} className="list-row">
                <Link to={`/movies/${r.movie_id}`}><Poster movie={r.movie} size="sm" /></Link>
                <div className="grow">
                  <Link to={`/movies/${r.movie_id}`} className="movie-title">{r.movie.title}</Link>
                  <div className="muted small">{r.movie.year} · {r.movie.genres.map(g => g.name).join(', ')} · TB cộng đồng {r.movie.rating_avg ?? '–'}</div>
                  <div className="muted small">Cập nhật {new Date(r.updated_at + 'Z').toLocaleString('vi-VN')}</div>
                </div>
                <StarInput value={r.score} onChange={s => rate(r.movie_id, s)} />
                <button className="btn ghost sm" onClick={() => remove(r.movie_id)}>Xóa</button>
              </div>
            ))}
          </div>
          <Pagination page={data.page} size={data.size} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  )
}
