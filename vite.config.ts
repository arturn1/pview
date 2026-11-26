import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.API_PORT || '3001');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT inválida.');
  return {
    server: {
      host: 'localhost', port: 3000, strictPort: true,
      proxy: { '/api': `http://localhost:${port}` },
      fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/flowdoc.db', '**/flowdoc.db-*'] },
    },
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  };
});
