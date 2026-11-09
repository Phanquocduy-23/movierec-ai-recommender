import { useEffect, useState } from 'react'
import { api } from '../../api'
import { ErrorBox, Loading } from '../../components/ui'

const STATUS_TAG = {
  succeeded: 'ok',
  running: 'info',
  pending: 'info',
  failed: 'warn',
}

export default function AdminData() {
  const [datasets, setDatasets] = useState(null)
  const [jobs, setJobs] = useState(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => {
    api('/api/admin/datasets').then(setDatasets).catch(e => setError(e.message))
    api('/api/admin/import-jobs').then(setJobs).catch(e => setError(e.message))
  }

  useEffect(() => { load() }, [])

  // Tự động làm mới khi có job đang chạy
  useEffect(() => {
    if (!jobs?.some(j => j.status === 'pending' || j.status === 'running')) return
    const t = setInterval(load, 2500)
    return () => clearInterval(t)
  }, [jobs])

  const startImport = async (useDefault) => {
    setBusy(true); setError(''); setMsg('')
    try {
      let opts = { method: 'POST' }
      if (!useDefault && file) {
        const fd = new FormData()
        fd.append('file', file)
        opts.files = fd
      }
      const job = await api('/api/admin/import', opts)
      setMsg(`Đã tạo công việc nhập dữ liệu #${job.id} (${job.status}).`)
      setFile(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1>Quản lý & Nhập dữ liệu MovieLens</h1>
      <p className="muted">
        Hệ thống kiểm tra mã băm SHA-256 của <code>ratings.csv</code> để chống nhập trùng lặp, tự động làm sạch điểm ngoài thang và tách riêng người dùng MovieLens (<code>dataset_ratings</code>) với tài khoản đăng ký web (<code>users</code>).
      </p>

      <div className="two-col">
        <div className="card">
          <h3>Cách 1: Nhập từ thư mục mặc định</h3>
          <p className="muted small">
            Đọc trực tiếp từ <code>data/raw/ml-latest-small</code> (sau khi chạy <code>python ml/download_data.py</code>).
          </p>
          <button className="btn" disabled={busy} onClick={() => startImport(true)}>
            {busy ? 'Đang gửi…' : 'Nhập từ data/raw/ml-latest-small'}
          </button>
        </div>

        <div className="card">
          <h3>Cách 2: Tải lên gói ZIP MovieLens</h3>
          <p className="muted small">
            Chọn file <code>.zip</code> chứa <code>movies.csv</code>, <code>ratings.csv</code> (và <code>links.csv</code> nếu có).
          </p>
          <div className="row-actions">
            <input type="file" accept=".zip" onChange={e => setFile(e.target.files?.[0] || null)} />
            <button className="btn" disabled={busy || !file} onClick={() => startImport(false)}>
              Tải lên & Nhập
            </button>
          </div>
        </div>
      </div>

      {msg && <div className="alert ok">{msg}</div>}
      <ErrorBox error={error} />

      <div className="section">
        <h2>Phiên bản bộ dữ liệu đã nhập</h2>
        {!datasets ? <Loading /> : datasets.length === 0 ? (
          <div className="empty">Chưa có bộ dữ liệu nào trong CSDL.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên bộ dữ liệu</th>
                <th>Số phim</th>
                <th>Số đánh giá sạch</th>
                <th>Số người dùng (ML)</th>
                <th>SHA-256 (ratings.csv)</th>
                <th>Thời gian nhập</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map(d => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td><b>{d.name}</b></td>
                  <td>{d.n_movies.toLocaleString('vi-VN')}</td>
                  <td>{d.n_ratings.toLocaleString('vi-VN')}</td>
                  <td>{d.n_users.toLocaleString('vi-VN')}</td>
                  <td><code className="small">{d.sha256.slice(0, 16)}…</code></td>
                  <td className="small">{new Date(d.imported_at + 'Z').toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Lịch sử công việc nhập dữ liệu (Import Jobs)</h2>
        {!jobs ? <Loading /> : jobs.length === 0 ? (
          <div className="empty">Chưa có lịch sử nhập dữ liệu.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Job #</th>
                <th>Trạng thái</th>
                <th>Dòng hợp lệ</th>
                <th>Dòng bị loại</th>
                <th>Nhật ký làm sạch / Thông báo</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id}>
                  <td>#{j.id}</td>
                  <td><span className={`tag ${STATUS_TAG[j.status] || ''}`}>{j.status}</span></td>
                  <td>{j.rows_ok.toLocaleString('vi-VN')}</td>
                  <td>{j.rows_error.toLocaleString('vi-VN')}</td>
                  <td className="small">{j.message || '—'}</td>
                  <td className="small">{new Date(j.created_at + 'Z').toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
