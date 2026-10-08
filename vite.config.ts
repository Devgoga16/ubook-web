import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // En desarrollo la API se sirve en el mismo origen: la cookie de sesión funciona sin CORS.
    // API_TARGET permite levantar una web de pruebas contra otra API sin tocar esta.
    proxy: { '/api': process.env.API_TARGET ?? 'http://localhost:4000' },
  },
})
