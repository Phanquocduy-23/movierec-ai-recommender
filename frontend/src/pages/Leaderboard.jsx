import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { cleanTitle, ErrorBox, Loading, MovieCard, Poster, Stars } from '../components/ui'

const TABS = [
  { id: 'bayesian', label: '🏆 Top Trọng số Bayes (IMDb Style)' },
  { id: 'gems', label: '💎 Viên Ngọc Ẩn (Hidden Gems)' },
  { id: 'blockbusters', label: '🔥 Bom Tấn Đông Khán Giả' },
  { id: 'champions', label: '🎭 Quán Quân 20 Thể Loại' },
]

export default function Leaderboard() {
  const [tab, setTab] = useState('bayesian')
  const [mParam, setMParam] = useState(50)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null); setError('')
    api(`/api/leaderboard?m=${mParam}&n=30`).then(setData).catch(e => setError(e.message))
  }, [mParam])

  return (
    <div>
      <div className="section-head">
        <div>
          <h1>🏆 Bảng Xếp Hạng Điện Ảnh & Phân Tích Trọng Số</h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Xếp hạng theo công thức Trọng số Bayes <code>WR = (v/(v+m))·R + (m/(v+m))·C</code> trên 100.836 đánh giá MovieLens
          </p>
        </div>
        <div className="row-actions">
          <span className="muted small">Tham số ngưỡng <code>m</code>:</span>
          <select value={mParam} onChange={e => setMParam(Number(e.target.value))}>
            <option value={10}>m = 10 (Ưu tiên điểm trung bình R)</option>
            <option value={25}>m = 25 (Cân bằng nhẹ)</option>
            <option value={50}>m = 50 (Chuẩn thực nghiệm AI)</option>
            <option value={100}>m = 100 (Ưu tiên phim nhiều lượt chấm)</option>
            <option value={200}>m = 200 (Khắt khe kiểu Bom tấn)</option>
          </select>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 18 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`chip ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ErrorBox error={error} />
      {!data ? <Loading /> : (
        <>
          {tab === 'bayesian' && (
            <div>
              <div className="alert info" style={{ marginBottom: 16 }}>
                <b>🧮 Giải thích thuật toán Baseline:</b> Với điểm trung bình toàn cục <code>C = {data.global_mean} ★</code> và ngưỡng <code>m = {data.m}</code>, những bộ phim có ít lượt chấm sẽ được kéo về gần <code>{data.global_mean} ★</code> để tránh hiện tượng phim chỉ có 1 người chấm 5 sao đứng đầu bảng.
              </div>
              <div className="list">
                {data.bayesian_top.map(({ movie: mv, weighted_score }, idx) => (
                  <div key={mv.id} className="list-row">
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: idx < 3 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(99, 102, 241, 0.18)',
                        color: idx < 3 ? '#0f172a' : '#a5b4fc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 15,
                      }}
                    >
                      #{idx + 1}
                    </div>
                    <Link to={`/movies/${mv.id}`}><Poster movie={mv} size="sm" /></Link>
                    <div className="grow">
                      <Link to={`/movies/${mv.id}`} className="movie-title">{cleanTitle(mv.title)}</Link>
                      <div className="muted small">
                        Năm: <b>{mv.year || '—'}</b> · Thể loại: {mv.genres.map(g => g.name).join(', ')}
                      </div>
                      <div className="muted small">
                        Điểm TB gốc (R): <b>★ {mv.rating_avg}</b> · Số lượt chấm (v): <b>{mv.rating_count}</b>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 150 }}>
                      <div className="muted small">Điểm Trọng số Bayes (WR)</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>★ {weighted_score.toFixed(3)}</div>
                    </div>
                    <Link to={`/movies/${mv.id}`} className="btn ghost sm">Chi tiết →</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'gems' && (
            <div>
              <div className="alert ok" style={{ marginBottom: 16 }}>
                <b>💎 Viên Ngọc Ẩn (Hidden Gems):</b> Các bộ phim có chất lượng nghệ thuật rất cao (<code>R ≥ 4.0 ★</code>) nhưng có lượng khán giả vừa phải (<code>12 ≤ v ≤ 60</code>). Đây chính là nhóm phim mà <b>Item-based KNN</b> và <b>SVD</b> giúp khám phá tốt hơn phương pháp Phổ biến!
              </div>
              <div className="movie-grid">
                {data.hidden_gems.map((mv, idx) => (
                  <MovieCard
                    key={mv.id}
                    movie={mv}
                    badge={`Gem #${idx + 1}`}
                    extra={<div className="pred">Điểm TB: <b>★ {mv.rating_avg}</b> ({mv.rating_count} lượt)</div>}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === 'blockbusters' && (
            <div>
              <div className="alert info" style={{ marginBottom: 16 }}>
                <b>🔥 Bom Tấn Đông Khán Giả Nhất:</b> Những bộ phim kinh điển có nhiều người xem và chấm điểm nhất trong bộ dữ liệu MovieLens.
              </div>
              <div className="movie-grid">
                {data.most_rated.map((mv, idx) => (
                  <MovieCard
                    key={mv.id}
                    movie={mv}
                    badge={`#${idx + 1}`}
                    extra={<div className="pred"><b>{mv.rating_count}</b> lượt chấm · ★ {mv.rating_avg}</div>}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === 'champions' && (
            <div>
              <div className="alert info" style={{ marginBottom: 16 }}>
                <b>🎭 Quán Quân Theo Từng Thể Loại:</b> Bộ phim đứng số #1 về Điểm Trọng số Bayes (<code>WR</code>) đại diện cho từng thể loại trong 20 thể loại điện ảnh.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                {data.genre_champions.map(({ genre, movie: mv, weighted_score }) => (
                  <div key={genre.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Link to={`/movies/${mv.id}`}><Poster movie={mv} size="sm" /></Link>
                    <div className="grow">
                      <Link to={`/movies?genre_id=${genre.id}`} className="tag ok" style={{ marginBottom: 6, display: 'inline-block' }}>
                        🏆 Top 1 {genre.name}
                      </Link>
                      <div>
                        <Link to={`/movies/${mv.id}`} className="movie-title" style={{ fontSize: 15 }}>
                          {cleanTitle(mv.title)}
                        </Link>
                      </div>
                      <div className="muted small">
                        {mv.year || '—'} · <Stars value={mv.rating_avg} /> ({mv.rating_count})
                      </div>
                      <div className="small" style={{ color: '#f59e0b', fontWeight: 700, marginTop: 2 }}>
                        WR: ★ {weighted_score.toFixed(3)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
