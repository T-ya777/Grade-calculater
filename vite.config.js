import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://T-ya777.github.io/Grade-calculater/ via GitHub
  // Pages, not the domain root — asset URLs need this prefix or they 404
  // (which is what causes a blank white page after deploy).
  base: '/Grade-calculater/',
  plugins: [react()],
})
