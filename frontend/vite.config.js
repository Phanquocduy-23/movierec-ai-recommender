import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api và /static sang FastAPI khi chạy dev -> không cần cấu hình URL trong code
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/static': 'http://127.0.0.1:8000',
    },
  },
})
