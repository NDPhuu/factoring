import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true, // Xóa thư mục cũ trước khi build mới
    sourcemap: false   // Tắt sourcemap để build nhanh hơn và nhẹ hơn cho bản demo
  }
})