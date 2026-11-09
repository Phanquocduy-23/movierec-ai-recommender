import { useEffect, useState } from 'react'
import { api } from '../../api'
import { ErrorBox, Loading, METHOD_LABEL } from '../../components/ui'

export default function AdminExperiments() {
  const [runs, setRuns] = useState(null)
  const [selected, setSelected] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/admin/experiments').then(setRuns).catch(e => setError(e.message))
  }, [])

  if (error) return <ErrorBox error={error} />
  if (!runs) return <Loading />

  const current = runs[selected]

  return (
    <div>
      <h1>Kết quả thực nghiệm & Đánh giá mô hình</h1>
      <p className="muted">
        Đánh giá độc lập theo giao thức chia tập theo thời gian từng người dùng (70% Train / 15% Validation / 15% Test). Chọn siêu tham số trên Validation, sau đó huấn luyện lại trên Train+Val và đo trên Test đúng một lần.
      </p>

      {runs.length === 0 ? (
        <div className="card">
          <h3>Chưa có kết quả thực nghiệm trong <code>artifacts/experiments</code></h3>
          <p className="muted">
            Hãy chạy bộ script thực nghiệm độc lập từ thư mục gốc của dự án để sinh bảng chỉ số và biểu đồ:
          </p>
          <pre className="code-block">
{`python ml/download_data.py
python ml/prepare_data.py
python ml/train_evaluate.py`}
          </pre>
        </div>
      ) : (
        <>
          <div className="filters">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Chọn lần chạy (run_id):</span>
              <select value={selected} onChange={e => setSelected(Number(e.target.value))}>
                {runs.map((r, i) => (
                  <option key={r.run_id} value={i}>
                    {r.run_id} {r.quick ? '(chạy thử nhanh)' : '(lưới đầy đủ)'} · {r.duration_seconds}s
                  </option>
                ))}
              </select>
            </label>
          </div>

          {current && (
            <>
              <div className="card">
                <div className="two-col">
                  <div>
                    <b>Mã thực nghiệm:</b> <code>{current.run_id}</code><br />
                    <b>Giao thức chia tập:</b> <code>{current.split || 'per_user_temporal_70_15_15_v1'}</code><br />
                    <b>Thời gian chạy:</b> {current.duration_seconds} giây
                  </div>
                  <div className="small muted">
                    <b>Môi trường thư viện:</b><br />
                    {current.libraries && Object.entries(current.libraries).map(([k, v]) => (
                      <span key={k} style={{ marginRight: 12 }}>{k}: <code>{v || 'N/A'}</code></span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="section">
                <h2>Bảng so sánh trên tập Test</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Phương pháp</th>
                      <th>Tham số chọn từ Validation</th>
                      <th>RMSE ↓</th>
                      <th>MAE ↓</th>
                      <th>Precision@10 ↑</th>
                      <th>Recall@10 ↑</th>
                      <th>Coverage ↑</th>
                      <th>Số cặp / Người đủ ĐK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.results.map(r => (
                      <tr key={r.method}>
                        <td><b>{METHOD_LABEL[r.method] || r.method}</b></td>
                        <td><code className="small">{r.params}</code></td>
                        <td><b>{Number(r.rmse).toFixed(4)}</b></td>
                        <td>{Number(r.mae).toFixed(4)}</td>
                        <td><b>{Number(r['precision@10']).toFixed(4)}</b></td>
                        <td><b>{Number(r['recall@10']).toFixed(4)}</b></td>
                        <td>{(Number(r.coverage || 0) * 100).toFixed(2)}%</td>
                        <td className="small">
                          {r.n_pairs_eligible?.toLocaleString('vi-VN')} cặp · {r.n_users_ranked} người
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="muted small">
                  Ghi chú: Nhãn thích được định nghĩa là đánh giá thật trong tập Test ≥ 4.0. Người dùng không có phim thích trong tập giữ lại được loại khỏi trung bình Recall@10.
                </p>
              </div>

              {current.figures?.length > 0 && (
                <div className="section">
                  <h2>Biểu đồ trực quan hóa (Matplotlib)</h2>
                  <div className="fig-grid">
                    {current.figures.map(src => (
                      <div key={src} className="card fig-card">
                        <img src={src} alt={src} style={{ width: '100%', borderRadius: 8 }} />
                        <div className="muted small" style={{ marginTop: 6 }}>{src.split('/').pop()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
