// Lớp gọi REST API: tự gắn JWT, chuẩn hóa thông báo lỗi
const BASE = import.meta.env.VITE_API_URL || ''

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

function errorMessage(data, status) {
  if (!data) return `Lỗi ${status}`
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) {
    return data.detail.map(d => (d.msg || '').replace('Value error, ', '')).join('; ')
  }
  return `Lỗi ${status}`
}

export async function api(path, { method = 'GET', body, form, files, raw } = {}) {
  const headers = {}
  const token = localStorage.getItem('token')
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (files) { payload = files }
  else if (form) { payload = new URLSearchParams(form); headers['Content-Type'] = 'application/x-www-form-urlencoded' }
  else if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json' }

  let res
  try {
    res = await fetch(BASE + path, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ API')
  }
  if (res.status === 401 && token) {
    localStorage.removeItem('token')
    window.dispatchEvent(new Event('auth-expired'))
  }
  if (raw) return res
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, errorMessage(data, res.status))
  return data
}

export const qs = (obj) => {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}
