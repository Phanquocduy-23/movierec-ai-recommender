import { useEffect, useState } from 'react'
import { api } from '../../api'
import { BarChart, ErrorBox, Loading, METHOD_LABEL } from '../../components/ui'

const LABELS = {
  users: 'Tài khoản web', movies: 'Phim', genres: 'Thể loại', web_ratings: 'Đánh giá từ web',
  dataset_ratings: 'Đánh giá MovieLens', watchlist_items: 'Mục muốn xem', recommendation_requests: 'Lượt lấy gợi ý',
  users_with_ratings: 'Người dùng đã chấm',
}

export default function Dashboard() {
  const [s, setS] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api('/api/admin/stats').then(setS).catch(e => setError(e.message)) }, [])

  const downloadReport = async () => {
    const res = await api('/api/admin/report/movies.csv', { raw: true })
    const url = URL.createObjectURL(await res.blob())
    Object.assign(document.createElement('a'), { href: url, download: 'movies_report.csv' }).click()
    URL.revokeObjectURL(url)
  }

  if (error) return <ErrorBox error={error} />
  if (!s) return <Loading />
  return (
    <div>
      <div className="section-head">
        <h1>Thống kê hệ thống</h1>
        <button className="btn sm" onClick={downloadReport}>⬇ Xuất báo cáo phim (CSV)</button>
      </div>
      <div className="stat-grid">
        {Object.entries(s.counts).map(([k, v]) => (
          <div key={k} className="stat card"><div className="stat-value">{v.toLocaleString('vi-VN')}</div><div className="muted">{LABELS[k] || k}</div></div>
        ))}
      </div>
      <div className="card">
        <b>Mô hình đang hoạt động:</b>{' '}
        {s.active_model ? <><code>{s.active_model.version}</code> · {s.active_model.n_ratings.toLocaleString()} đánh giá · {s.active_model.n_users} người · {s.active_model.n_items} phim</> : <span className="muted">Chưa phát hành mô hình nào</span>}
      </div>
      <div className="two-col">
        <div className="card"><h3>Phân bố điểm (MovieLens + web)</h3><BarChart data={s.rating_distribution} labelKey="score" valueKey="count" color="#f59e0b" format={v => v.toLocaleString()} /></div>
        <div className="card"><h3>Số đánh giá theo thể loại</h3><BarChart data={s.genres.slice(0, 12)} labelKey="genre" valueKey="ratings" color="#10b981" format={v => v.toLocaleString()} /></div>
        <div className="card">
          <h3>Phương pháp đã phục vụ</h3>
          {s.recommendation_methods.length === 0 ? <p className="muted">Chưa có lượt gợi ý</p> :
            <table className="table"><thead><tr><th>Phương pháp</th><th>Số lượt</th><th>Dự phòng</th></tr></thead>
              <tbody>{s.recommendation_methods.map(m => <tr key={m.method}><td>{METHOD_LABEL[m.method] || m.method}</td><td>{m.count}</td><td>{m.fallback}</td></tr>)}</tbody></table>}
        </div>
        <div className="card">
          <h3>Top 10 điểm cao (≥ 50 lượt)</h3>
          <ol className="top-list">{s.top_movies.map(m => <li key={m.id}>{m.title} <span className="muted">★ {m.rating_avg} ({m.rating_count})</span></li>)}</ol>
        </div>
      </div>
    </div>
  )
}
