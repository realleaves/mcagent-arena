import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: fileURLToPath(new URL('.', import.meta.url)),
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: Number(env.WEB_PORT || 5173),
      strictPort: true,
      proxy: { '/api': { target: `http://127.0.0.1:${env.API_PORT || 3001}` } },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: { output: { manualChunks: { charts: ['recharts'] } } },
    },
  };
});
