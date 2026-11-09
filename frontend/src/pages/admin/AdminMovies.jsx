import { useEffect, useState } from 'react'
import { api, qs } from '../../api'
import { ErrorBox, Loading, Pagination } from '../../components/ui'

const EMPTY = { title: '', year: '', overview: '', poster_url: '', genre_ids: [], is_active: true, imdb_id: '', tmdb_id: '' }

export default function AdminMovies() {
  const [data, setData] = useState(null)
  const [genres, setGenres] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null) // null | 'new' | movie
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  const load = () => api('/api/admin/movies' + qs({ q, page, size: 15 })).then(setData).catch(e => setError(e.message))
  useEffect(() => { load() }, [page]) // eslint-disable-line
  useEffect(() => { api('/api/genres').then(setGenres) }, [])

  const open = (m) => {
    setError('')
    setEditing(m || 'new')
    setForm(m ? {
      title: m.title, year: m.year || '', overview: m.overview || '', poster_url: m.poster_url || '',
      genre_ids: m.genres.map(g => g.id), is_active: m.is_active, imdb_id: m.link?.imdb_id || '', tmdb_id: m.link?.tmdb_id || '',
    } : EMPTY)
  }
  const save = async (e) => {
    e.preventDefault()
    const body = { ...form, year: form.year ? Number(form.year) : null, tmdb_id: form.tmdb_id ? Number(form.tmdb_id) : null, imdb_id: form.imdb_id || null }
    try {
      if (editing === 'new') await api('/api/admin/movies', { method: 'POST', body })
      else await api(`/api/admin/movies/${editing.id}`, { method: 'PUT', body })
      setEditing(null); load()
    } catch (err) { setError(err.message) }
  }
  const remove = async (m) => {
    if (!confirm(`Xóa/ẩn phim "${m.title}"? Phim đã có đánh giá sẽ chỉ bị ẩn.`)) return
    try { await api(`/api/admin/movies/${m.id}`, { method: 'DELETE' }); load() } catch (err) { setError(err.message) }
  }
  const toggleGenre = (id) => setForm(f => ({ ...f, genre_ids: f.genre_ids.includes(id) ? f.genre_ids.filter(x => x !== id) : [...f.genre_ids, id] }))

  return (
    <div>
      <div className="section-head">
        <h1>Quản lý phim</h1>
        <button className="btn sm" onClick={() => open(null)}>+ Thêm phim</button>
      </div>
      <form className="filters" onSubmit={e => { e.preventDefault(); setPage(1); load() }}>
        <input placeholder="Tìm tên phim…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn">Tìm</button>
      </form>
      <ErrorBox error={error} />
      {editing && (
        <form className="card form-grid" onSubmit={save}>
          <h3>{editing === 'new' ? 'Thêm phim mới' : `Sửa phim #${editing.id}`}</h3>
          <label>Tên phim<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label>Năm<input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></label>
          <label className="full">Mô tả<textarea rows={3} value={form.overview} onChange={e => setForm({ ...form, overview: e.target.value })} /></label>
          <label className="full">URL poster (tùy chọn)<input value={form.poster_url} onChange={e => setForm({ ...form, poster_url: e.target.value })} /></label>
          <label>IMDb ID<input value={form.imdb_id} onChange={e => setForm({ ...form, imdb_id: e.target.value })} placeholder="tt0114709" /></label>
          <label>TMDB ID<input type="number" value={form.tmdb_id} onChange={e => setForm({ ...form, tmdb_id: e.target.value })} /></label>
          <div className="full">
            <div className="label">Thể loại</div>
            <div className="chips">{genres.map(g => <button type="button" key={g.id} className={`chip ${form.genre_ids.includes(g.id) ? 'active' : ''}`} onClick={() => toggleGenre(g.id)}>{g.name}</button>)}</div>
          </div>
          <label className="check"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Hiển thị trong danh mục</label>
          <div className="full row-actions"><button className="btn">Lưu</button><button type="button" className="btn ghost" onClick={() => setEditing(null)}>Hủy</button></div>
        </form>
      )}
      {!data ? <Loading /> : (
        <>
          <table className="table">
            <thead><tr><th>ID</th><th>ML ID</th><th>Tên phim</th><th>Năm</th><th>Thể loại</th><th>Lượt / TB</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {data.items.map(m => (
                <tr key={m.id}>
                  <td>{m.id}</td><td>{m.movielens_id ?? '–'}</td><td>{m.title}</td><td>{m.year}</td>
                  <td className="small">{m.genres.map(g => g.name).join(', ')}</td>
                  <td>{m.rating_count} / {m.rating_avg ?? '–'}</td>
                  <td>{m.is_active ? <span className="tag ok">Hiện</span> : <span className="tag warn">Ẩn</span>}</td>
                  <td className="nowrap"><button className="btn ghost sm" onClick={() => open(m)}>Sửa</button> <button className="btn ghost sm danger" onClick={() => remove(m)}>Xóa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} size={data.size} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  )
}
