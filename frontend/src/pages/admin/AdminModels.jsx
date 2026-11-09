import { useEffect, useState } from 'react'
import { api } from '../../api'
import { ErrorBox, Loading } from '../../components/ui'

const DEFAULT_PARAMS = {
  svd_factors: 50,
  svd_epochs: 20,
  svd_lr: 0.005,
  svd_reg: 0.02,
  knn_k: 40,
  knn_shrink: 0.0,
  pop_m: 10,
  auto_activate: true,
}

export default function AdminModels() {
  const [form, setForm] = useState(DEFAULT_PARAMS)
  const [models, setModels] = useState(null)
  const [runs, setRuns] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => {
    api('/api/admin/models').then(setModels).catch(e => setError(e.message))
    api('/api/admin/training-runs').then(setRuns).catch(e => setError(e.message))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!runs?.some(r => r.status === 'pending' || r.status === 'running')) return
    const t = setInterval(load, 2500)
    return () => clearInterval(t)
  }, [runs])

  const startTrain = async (e) => {
    e.preventDefault()
    setBusy(true); setError(''); setMsg('')
    try {
      const body = {
        svd_factors: Number(form.svd_factors),
        svd_epochs: Number(form.svd_epochs),
        svd_lr: Number(form.svd_lr),
        svd_reg: Number(form.svd_reg),
        knn_k: Number(form.knn_k),
        knn_shrink: Number(form.knn_shrink),
        pop_m: Number(form.pop_m),
        auto_activate: Boolean(form.auto_activate),
      }
      const run = await api('/api/admin/train', { method: 'POST', body })
      setMsg(`Đã khởi chạy job huấn luyện #${run.id}. Mô hình hiện tại vẫn tiếp tục phục vụ trong lúc huấn luyện.`)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const activate = async (mv) => {
    setError(''); setMsg('')
    try {
      await api(`/api/admin/models/${mv.id}/activate`, { method: 'POST' })
      setMsg(`Đã phát hành phiên bản mô hình ${mv.version}. Cache gợi ý đã được làm mới.`)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const num = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div>
      <h1>Huấn luyện & Phát hành mô hình</h1>
      <p className="muted">
        Huấn luyện đồng thời cả 3 mô hình phục vụ web (<b>Popularity</b>, <b>Item-based KNN</b>, <b>SVD</b>) trên dữ liệu MovieLens + đánh giá web với namespace tách biệt (<code>ml:&lt;id&gt;</code> và <code>web:&lt;id&gt;</code>). Mô hình mới được kiểm tra đầu ra và ID mapping trước khi phát hành.
      </p>

      <form className="card form-grid" onSubmit={startTrain}>
        <h3 className="full">Cấu hình công việc huấn luyện mới</h3>
        <label>
          SVD - Số nhân tố ẩn (n_factors)
          <input type="number" min={5} max={300} value={form.svd_factors} onChange={num('svd_factors')} />
        </label>
        <label>
          SVD - Số vòng lặp (n_epochs)
          <input type="number" min={5} max={200} value={form.svd_epochs} onChange={num('svd_epochs')} />
        </label>
        <label>
          SVD - Tốc độ học (lr_all)
          <input type="number" step="0.001" min={0.0005} max={0.1} value={form.svd_lr} onChange={num('svd_lr')} />
        </label>
        <label>
          SVD - Điều chuẩn (reg_all)
          <input type="number" step="0.005" min={0} max={1} value={form.svd_reg} onChange={num('svd_reg')} />
        </label>
        <label>
          Item-KNN - Số láng giềng (k)
          <input type="number" min={5} max={200} value={form.knn_k} onChange={num('knn_k')} />
        </label>
        <label>
          Item-KNN - Hệ số co (shrink)
          <input type="number" step="0.5" min={0} max={100} value={form.knn_shrink} onChange={num('knn_shrink')} />
        </label>
        <label>
          Phổ biến - Ngưỡng làm mịn (m)
          <input type="number" min={1} max={1000} value={form.pop_m} onChange={num('pop_m')} />
        </label>
        <label className="check">
          <input type="checkbox" checked={form.auto_activate} onChange={e => setForm({ ...form, auto_activate: e.target.checked })} />
          Tự động phát hành ngay sau khi kiểm tra hợp lệ
        </label>
        <div className="full row-actions">
          <button className="btn" disabled={busy}>
            {busy ? 'Đang tạo job…' : '▶ Bắt đầu huấn luyện nền'}
          </button>
          <button type="button" className="btn ghost" onClick={() => setForm(DEFAULT_PARAMS)}>
            Khôi phục mặc định
          </button>
        </div>
      </form>

      {msg && <div className="alert ok">{msg}</div>}
      <ErrorBox error={error} />

      <div className="section">
        <h2>Các phiên bản mô hình (Model Registry)</h2>
        {!models ? <Loading /> : models.length === 0 ? (
          <div className="empty">Chưa có phiên bản mô hình nào. Hãy chạy huấn luyện sau khi nhập dữ liệu.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Phiên bản</th>
                <th>Trạng thái</th>
                <th>Dữ liệu fit</th>
                <th>Tham số chính</th>
                <th>Kiểm tra đầu ra</th>
                <th>Thời gian tạo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.id}>
                  <td><code>{m.version}</code></td>
                  <td>
                    {m.status === 'active'
                      ? <span className="tag ok">Đang hoạt động</span>
                      : m.status === 'ready'
                        ? <span className="tag info">Sẵn sàng</span>
                        : <span className="tag">Đã lưu trữ</span>}
                  </td>
                  <td className="small">
                    {m.n_ratings.toLocaleString('vi-VN')} điểm · {m.n_users} người · {m.n_items} phim
                  </td>
                  <td className="small">
                    <code>
                      SVD(f={m.params?.svd_factors ?? 50}, e={m.params?.svd_epochs ?? 20}) · KNN(k={m.params?.knn_k ?? 40})
                    </code>
                  </td>
                  <td className="small">
                    {m.validation ? (
                      <span>
                        SVD fit-sample RMSE: <b>{m.validation.svd_train_rmse_sample}</b>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="small">{new Date(m.trained_at + 'Z').toLocaleString('vi-VN')}</td>
                  <td className="nowrap">
                    {m.status !== 'active' && (
                      <button className="btn sm ghost" onClick={() => activate(m)}>
                        Phát hành / Rollback
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2>Lịch sử công việc huấn luyện (Training Runs)</h2>
        {!runs ? <Loading /> : runs.length === 0 ? (
          <div className="empty">Chưa có lịch sử huấn luyện.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Run #</th>
                <th>Trạng thái</th>
                <th>Tự phát hành</th>
                <th>Thông báo / Chi tiết</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>
                    <span className={`tag ${r.status === 'succeeded' ? 'ok' : r.status === 'failed' ? 'warn' : 'info'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.auto_activate ? 'Có' : 'Không'}</td>
                  <td className="small">{r.message || 'Đang xử lý…'}</td>
                  <td className="small">{r.started_at ? new Date(r.started_at + 'Z').toLocaleString('vi-VN') : '—'}</td>
                  <td className="small">{r.finished_at ? new Date(r.finished_at + 'Z').toLocaleString('vi-VN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
