import { useEffect, useState } from 'react'
import { api, qs } from '../../api'
import { useAuth } from '../../auth'
import { ErrorBox, Loading, Pagination } from '../../components/ui'

// Form chính - chi tiết: danh sách người dùng (chính) và lịch sử đánh giá của người được chọn (chi tiết)
export default function AdminUsers() {
  const { user: me } = useAuth()
  const [data, setData] = useState(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')

  const load = () => api('/api/admin/users' + qs({ q, page })).then(setData).catch(e => setError(e.message))
  useEffect(() => { load() }, [page]) // eslint-disable-line

  const select = (id) => api(`/api/admin/users/${id}`).then(setDetail).catch(e => setError(e.message))
  const update = async (u, body) => {
    setError('')
    try { await api(`/api/admin/users/${u.id}`, { method: 'PUT', body }); load(); if (detail?.user.id === u.id) select(u.id) }
    catch (e) { setError(e.message) }
  }

  return (
    <div>
      <h1>Quản lý người dùng</h1>
      <form className="filters" onSubmit={e => { e.preventDefault(); setPage(1); load() }}>
        <input placeholder="Tìm email, tên đăng nhập, họ tên…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn">Tìm</button>
      </form>
      <ErrorBox error={error} />
      <div className="master-detail">
        <div>
          {!data ? <Loading /> : (
            <>
              <table className="table">
                <thead><tr><th>ID</th><th>Tài khoản</th><th>Vai trò</th><th>Số điểm</th><th>Trạng thái</th><th></th></tr></thead>
                <tbody>{data.items.map(u => (
                  <tr key={u.id} className={detail?.user.id === u.id ? 'selected' : ''} onClick={() => select(u.id)}>
                    <td>{u.id}</td>
                    <td><b>{u.username}</b><div className="muted small">{u.email}</div></td>
                    <td>
                      <select value={u.role_name} disabled={u.id === me.id} onClick={e => e.stopPropagation()} onChange={e => update(u, { role: e.target.value })}>
                        <option value="user">user</option><option value="admin">admin</option>
                      </select>
                    </td>
                    <td>{u.n_ratings}</td>
                    <td>{u.is_active ? <span className="tag ok">Hoạt động</span> : <span className="tag warn">Đã khóa</span>}</td>
                    <td><button className="btn ghost sm" disabled={u.id === me.id} onClick={e => { e.stopPropagation(); update(u, { is_active: !u.is_active }) }}>{u.is_active ? 'Khóa' : 'Mở khóa'}</button></td>
                  </tr>
                ))}</tbody>
              </table>
              <Pagination page={data.page} size={data.size} total={data.total} onChange={setPage} />
            </>
          )}
        </div>
        <div className="card">
          {!detail ? <p className="muted">Chọn một người dùng để xem chi tiết.</p> : (
            <>
              <h3>{detail.user.full_name || detail.user.username}</h3>
              <p className="muted small">{detail.user.email} · tạo {new Date(detail.user.created_at + 'Z').toLocaleDateString('vi-VN')} · {detail.watchlist_count} phim muốn xem</p>
              <h4>Lịch sử đánh giá ({detail.ratings.length})</h4>
              <table className="table compact">
                <thead><tr><th>Phim</th><th>Điểm</th><th>Cập nhật</th></tr></thead>
                <tbody>{detail.ratings.map(r => <tr key={r.movie_id}><td>{r.movie.title}</td><td>★ {r.score}</td><td className="small">{new Date(r.updated_at + 'Z').toLocaleString('vi-VN')}</td></tr>)}</tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
