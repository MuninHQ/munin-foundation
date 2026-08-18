import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(import.meta.dirname);
const apiTarget = `http://127.0.0.1:${process.env.MUNIN_API_PORT ?? 4310}`;
const allowedHosts = ['localhost', '127.0.0.1', '.ts.net'];

export default defineConfig({
  root,
  plugins: [react()],
  server: { allowedHosts, proxy: { '/api': apiTarget } },
  preview: { allowedHosts, proxy: { '/api': apiTarget } },
  build: {
    outDir: path.resolve(root, '../../dist-web'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(root, 'index.html'),
        mobile: path.resolve(root, 'mobile.html'),
        hud: path.resolve(root, 'hud.html'),
        'career-command': path.resolve(root, 'career-command.html'),
        'career-inbox': path.resolve(root, 'career-inbox.html'),
        'career-intake': path.resolve(root, 'career-intake.html'),
        intelligence: path.resolve(root, 'intelligence.html'),
        'context-memory': path.resolve(root, 'context-memory.html'),
        council: path.resolve(root, 'council.html'),
        'executive-briefing': path.resolve(root, 'executive-briefing.html'),
        'image-settings': path.resolve(root, 'image-settings.html'),
        'linkedin-assets': path.resolve(root, 'linkedin-assets.html'),
        'linkedin-compose': path.resolve(root, 'linkedin-compose.html'),
        'linkedin-history': path.resolve(root, 'linkedin-history.html'),
        linkedin: path.resolve(root, 'linkedin.html'),
        settings: path.resolve(root, 'settings.html'),
      },
    },
  },
});