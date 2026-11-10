import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { cleanTitle, Empty, ErrorBox, Loading, Poster, StarInput, Stars } from '../components/ui'

export default function Watchlist() {
  const [items, setItems] = useState(null)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('added')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = () => api('/api/watchlist').then(setItems).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const remove = async (id) => {
    try { await api(`/api/watchlist/${id}`, { method: 'DELETE' }); load() } catch (e) { setError(e.message) }
  }

  const saveNote = async (id, note) => {
    try {
      await api(`/api/watchlist/${id}`, { method: 'POST', body: { note } })
      setMsg('✓ Đã lưu ghi chú cho phim trong danh sách muốn xem.')
    } catch (e) { setError(e.message) }
  }

  const rateAndMarkWatched = async (movie, score) => {
    try {
      await api(`/api/ratings/${movie.id}`, { method: 'PUT', body: { score } })
      await api(`/api/watchlist/${movie.id}`, { method: 'DELETE' })
      setMsg(`🎉 Đã chấm ${score} ★ cho "${cleanTitle(movie.title)}" và chuyển sang Lịch sử đã xem!`)
      load()
    } catch (e) { setError(e.message) }
  }

  const filtered = useMemo(() => {
    if (!items) return []
    let list = [...items]
    if (q.trim()) {
      const kw = q.trim().toLowerCase()
      list = list.filter(w =>
        cleanTitle(w.movie.title).toLowerCase().includes(kw) ||
        (w.note || '').toLowerCase().includes(kw)
      )
    }
    if (sort === 'rating') {
      list.sort((a, b) => (b.movie.rating_avg || 0) - (a.movie.rating_avg || 0))
    } else if (sort === 'year') {
      list.sort((a, b) => (b.movie.year || 0) - (a.movie.year || 0))
    }
    return list
  }, [items, q, sort])

  return (
    <div>
      <div className="section-head">
        <div>
          <h1>📌 Danh sách Muốn xem {items && <span className="muted">({items.length})</span>}</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Lưu lại những bộ phim sắp xem, thêm ghi chú cá nhân hoặc chấm điểm ngay sau khi xem xong
          </p>
        </div>
        <div className="row-actions">
          <input
            placeholder="🔍 Tìm trong danh sách..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: 210 }}
          />
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="added">🕒 Mới thêm gần đây</option>
            <option value="rating">⭐ Điểm cộng đồng cao</option>
            <option value="year">📅 Năm phát hành mới</option>
          </select>
        </div>
      </div>

      {msg && <div className="alert ok">{msg}</div>}
      <ErrorBox error={error} />

      {!items ? <Loading /> : filtered.length === 0 ? (
        <Empty>
          {items.length === 0
            ? <>Danh sách trống. Hãy bấm <b>“+ Thêm vào Muốn xem”</b> ở trang chi tiết phim hoặc <Link to="/recommendations">Gợi ý AI</Link>.</>
            : 'Không có phim nào khớp từ khóa tìm kiếm.'}
        </Empty>
      ) : (
        <div className="list">
          {filtered.map(w => (
            <div key={w.movie_id} className="list-row" style={{ flexWrap: 'wrap', gap: 14 }}>
              <Link to={`/movies/${w.movie_id}`}><Poster movie={w.movie} size="sm" /></Link>
              <div className="grow" style={{ minWidth: 240 }}>
                <Link to={`/movies/${w.movie_id}`} className="movie-title">{cleanTitle(w.movie.title)}</Link>
                <div className="muted small">
                  {w.movie.year || '—'} · {w.movie.genres.map(g => g.name).join(', ')} ·{' '}
                  <Stars value={w.movie.rating_avg} /> ({w.movie.rating_count} lượt) · Thêm ngày {new Date(w.added_at + 'Z').toLocaleDateString('vi-VN')}
                </div>
                <input
                  className="note-input"
                  placeholder="📝 Ghi chú cá nhân (vd: cuối tuần xem cùng bạn bè, ấn Enter/nhấp ra ngoài để lưu)…"
                  defaultValue={w.note || ''}
                  onBlur={e => saveNote(w.movie_id, e.target.value)}
                />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted small" style={{ marginBottom: 4 }}>Chấm điểm = Đánh dấu đã xem:</div>
                <StarInput value={null} onChange={s => rateAndMarkWatched(w.movie, s)} />
              </div>
              <button className="btn ghost sm" onClick={() => remove(w.movie_id)}>Bỏ lưu</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
