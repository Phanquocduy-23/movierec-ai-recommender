import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

// Chỉ điều hướng giao diện; phân quyền thật được kiểm tra ở backend
export function RequireAuth({ children }) {
  const { user } = useAuth()
  const loc = useLocation()
  return user ? children : <Navigate to="/login" state={{ from: loc.pathname }} replace />
}

export function RequireAdmin({ children }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return isAdmin ? children : <div className="empty">Bạn không có quyền truy cập trang này.</div>
}
