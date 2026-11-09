import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Empty, ErrorBox, Loading, Poster } from '../components/ui'

export default function Watchlist() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const load = () => api('/api/watchlist').then(setItems).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const remove = async (id) => {
    try { await api(`/api/watchlist/${id}`, { method: 'DELETE' }); load() } catch (e) { setError(e.message) }
  }
  const saveNote = async (id, note) => {
    try { await api(`/api/watchlist/${id}`, { method: 'POST', body: { note } }) } catch (e) { setError(e.message) }
  }

  return (
    <div>
      <h1>Danh sách muốn xem {items && <span className="muted">({items.length})</span>}</h1>
      <ErrorBox error={error} />
      {!items ? <Loading /> : items.length === 0 ? <Empty>Danh sách trống. Bấm “+ Muốn xem” ở trang chi tiết phim để lưu lại.</Empty> : (
        <div className="list">
          {items.map(w => (
            <div key={w.movie_id} className="list-row">
              <Link to={`/movies/${w.movie_id}`}><Poster movie={w.movie} size="sm" /></Link>
              <div className="grow">
                <Link to={`/movies/${w.movie_id}`} className="movie-title">{w.movie.title}</Link>
                <div className="muted small">{w.movie.year} · {w.movie.genres.map(g => g.name).join(', ')} · Thêm ngày {new Date(w.added_at + 'Z').toLocaleDateString('vi-VN')}</div>
                <input className="note-input" placeholder="Ghi chú (vd: xem cùng bạn bè)…" defaultValue={w.note || ''} onBlur={e => saveNote(w.movie_id, e.target.value)} />
              </div>
              <button className="btn ghost sm" onClick={() => remove(w.movie_id)}>Bỏ</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
