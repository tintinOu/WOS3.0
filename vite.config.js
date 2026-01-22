import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    // Base path for GitHub Pages deployment
    // Change 'WOS3.0' to your repository name
    base: process.env.NODE_ENV === 'production' ? '/WOS3.0/' : '/',
    server: {
        port: 5173,
        open: true
    },
    build: {
        outDir: 'dist',
        sourcemap: false
    }
})
