import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vite.dev/config/
export default defineConfig({
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: true,
    allowedHosts: ["myfamilytree-4wss.onrender.com"]
  },
  preview: {
    port: parseInt(process.env.PORT) || 3000,
    host: true,
    allowedHosts: ["myfamilytree-4wss.onrender.com"]
  },
  plugins: [react()],
})
