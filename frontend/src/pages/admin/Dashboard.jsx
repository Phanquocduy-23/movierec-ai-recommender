import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { BarChart, cleanTitle, ErrorBox, Loading, METHOD_LABEL } from '../../components/ui'

const LABELS = {
  users: 'Tài khoản web', movies: 'Phim', genres: 'Thể loại', web_ratings: 'Đánh giá từ web',
  dataset_ratings: 'Đánh giá MovieLens', watchlist_items: 'Mục muốn xem', recommendation_requests: 'Lượt lấy gợi ý',
  users_with_ratings: 'Người dùng đã chấm',
}

export default function Dashboard() {
  const [s, setS] = useState(null)
  const [logs, setLogs] = useState([])
  const [reviews, setReviews] = useState([])
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const loadAll = () => {
    api('/api/admin/stats').then(setS).catch(e => setError(e.message))
    api('/api/admin/recommendation-logs?limit=15').then(setLogs).catch(() => {})
    api('/api/admin/recent-reviews?limit=15').then(setReviews).catch(() => {})
  }

  useEffect(() => { loadAll() }, [])

  const downloadReport = async () => {
    const res = await api('/api/admin/report/movies.csv', { raw: true })
    const url = URL.createObjectURL(await res.blob())
    Object.assign(document.createElement('a'), { href: url, download: 'movies_report.csv' }).click()
    URL.revokeObjectURL(url)
  }

  const clearReviewComment = async (ratingId) => {
    if (!confirm('Xóa nội dung bình luận này (vẫn giữ điểm đánh giá)?')) return
    try {
      await api(`/api/admin/reviews/${ratingId}/comment`, { method: 'DELETE' })
      setMsg('Đã ẩn/xóa nội dung bình luận thành công.')
      loadAll()
    } catch (e) { setError(e.message) }
  }

  if (error) return <ErrorBox error={error} />
  if (!s) return <Loading />
  return (
    <div>
      <div className="section-head">
        <h1>🛡️ Tổng quan Hệ thống & Giám sát AI</h1>
        <div className="row-actions">
          <button className="btn ghost sm" onClick={loadAll}>🔄 Làm mới</button>
          <button className="btn sm" onClick={downloadReport}>⬇ Xuất báo cáo phim (CSV)</button>
        </div>
      </div>

      {msg && <div className="alert ok">{msg}</div>}

      <div className="stat-grid">
        {Object.entries(s.counts).map(([k, v]) => (
          <div key={k} className="stat card">
            <div className="stat-value">{v.toLocaleString('vi-VN')}</div>
            <div className="muted">{LABELS[k] || k}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <b>🧬 Mô hình AI đang hoạt động (Active Model):</b>{' '}
        {s.active_model ? (
          <>
            <code>{s.active_model.version}</code> · Huấn luyện trên{' '}
            <b>{s.active_model.n_ratings.toLocaleString('vi-VN')}</b> đánh giá ·{' '}
            <b>{s.active_model.n_users}</b> người dùng · <b>{s.active_model.n_items.toLocaleString('vi-VN')}</b> bộ phim
          </>
        ) : (
          <span className="muted">Chưa phát hành mô hình nào</span>
        )}
      </div>

      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>📊 Phân bố điểm (MovieLens + Web)</h3>
          <BarChart data={s.rating_distribution} labelKey="score" valueKey="count" color="#f59e0b" format={v => v.toLocaleString()} />
        </div>
        <div className="card">
          <h3>🎭 Số đánh giá theo thể loại</h3>
          <BarChart data={s.genres.slice(0, 12)} labelKey="genre" valueKey="ratings" color="#10b981" format={v => v.toLocaleString()} />
        </div>
        <div className="card">
          <h3>🤖 Thống kê Nhánh Thuật toán đã phục vụ</h3>
          {s.recommendation_methods.length === 0 ? <p className="muted">Chưa có lượt gợi ý</p> : (
            <table className="table">
              <thead><tr><th>Phương pháp</th><th>Số lượt phục vụ</th><th>Lượt dự phòng (Fallback)</th></tr></thead>
              <tbody>
                {s.recommendation_methods.map(m => (
                  <tr key={m.method}>
                    <td><b>{METHOD_LABEL[m.method] || m.method}</b></td>
                    <td>{m.count}</td>
                    <td>{m.fallback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>🏆 Top 10 Phim điểm cao (≥ 50 lượt)</h3>
          <ol className="top-list">
            {s.top_movies.map(m => (
              <li key={m.id}>
                <Link to={`/movies/${m.id}`}>{cleanTitle(m.title)}</Link>{' '}
                <span className="muted">★ {m.rating_avg} ({m.rating_count})</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>📡 Nhật ký Phục vụ Gợi ý Thời gian thực (Live AI Telemetry)</h3>
          {logs.length === 0 ? <p className="muted">Chưa có nhật ký gợi ý</p> : (
            <table className="table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Yêu cầu</th>
                  <th>Phục vụ</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(lg => (
                  <tr key={lg.id}>
                    <td><b>{lg.username}</b></td>
                    <td><code>{lg.requested_method}</code></td>
                    <td>
                      <span className={`tag ${lg.fallback ? 'warn' : 'ok'}`}>
                        {lg.served_method}{lg.fallback ? ' (FB)' : ''}
                      </span>
                    </td>
                    <td className="muted small">
                      {new Date(lg.created_at + 'Z').toLocaleTimeString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3>💬 Kiểm duyệt Bình luận Cộng đồng Mới nhất ({reviews.length})</h3>
          {reviews.length === 0 ? <p className="muted">Chưa có bình luận văn bản nào</p> : (
            <div className="list">
              {reviews.slice(0, 8).map(rv => (
                <div key={rv.id} className="list-row" style={{ padding: '8px 10px' }}>
                  <div className="grow">
                    <div>
                      <b>@{rv.username}</b> · <Link to={`/movies/${rv.movie_id}`}>{cleanTitle(rv.movie_title)}</Link>{' '}
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {rv.score}</span>
                    </div>
                    <div className="small" style={{ color: '#cbd5e1', marginTop: 2 }}>“{rv.comment}”</div>
                  </div>
                  <button className="btn ghost sm" onClick={() => clearReviewComment(rv.id)}>
                    Xóa BL
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
