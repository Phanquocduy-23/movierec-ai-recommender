import { useEffect, useState } from 'react'
import { api } from '../../api'
import { ErrorBox, Loading } from '../../components/ui'

export default function AdminGenres() {
  const [genres, setGenres] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const load = () => api('/api/genres').then(setGenres).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault(); setError('')
    try { await api('/api/admin/genres', { method: 'POST', body: { name } }); setName(''); load() } catch (err) { setError(err.message) }
  }
  const rename = async (g) => {
    const n = prompt('Tên mới', g.name)
    if (!n || n === g.name) return
    try { await api(`/api/admin/genres/${g.id}`, { method: 'PUT', body: { name: n } }); load() } catch (err) { setError(err.message) }
  }
  const remove = async (g) => {
    if (!confirm(`Xóa thể loại "${g.name}"? Các phim sẽ mất gán thể loại này.`)) return
    try { await api(`/api/admin/genres/${g.id}`, { method: 'DELETE' }); load() } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <h1>Quản lý thể loại</h1>
      <form className="filters" onSubmit={add}>
        <input required placeholder="Tên thể loại mới" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn">Thêm</button>
      </form>
      <ErrorBox error={error} />
      {!genres ? <Loading /> : (
        <table className="table">
          <thead><tr><th>ID</th><th>Tên</th><th></th></tr></thead>
          <tbody>{genres.map(g => (
            <tr key={g.id}><td>{g.id}</td><td>{g.name}</td>
              <td className="nowrap"><button className="btn ghost sm" onClick={() => rename(g)}>Đổi tên</button> <button className="btn ghost sm danger" onClick={() => remove(g)}>Xóa</button></td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}
