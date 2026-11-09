import { NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  const links = [
    ['/admin', 'Thống kê', true], ['/admin/movies', 'Phim'], ['/admin/genres', 'Thể loại'], ['/admin/users', 'Người dùng'],
    ['/admin/data', 'Nhập dữ liệu'], ['/admin/models', 'Huấn luyện & mô hình'], ['/admin/experiments', 'Kết quả thực nghiệm'],
  ]
  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-title">Quản trị</div>
        {links.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
      </aside>
      <section className="admin-main"><Outlet /></section>
    </div>
  )
}
