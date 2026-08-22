import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(import.meta.dirname);
const outputDirectory = process.env.MUNIN_WEB_OUT_DIR
  ? path.resolve(process.env.MUNIN_WEB_OUT_DIR)
  : path.resolve(root, '../../dist-web');
const apiTarget = `http://127.0.0.1:${process.env.MUNIN_API_PORT ?? 4310}`;
const allowedHosts = ['localhost', '127.0.0.1', '.ts.net'];

export default defineConfig({
  root,
  plugins: [react()],
  server: { allowedHosts, headers: { 'Cache-Control': 'no-store' }, proxy: { '/api': apiTarget } },
  preview: { allowedHosts, headers: { 'Cache-Control': 'no-store' }, proxy: { '/api': apiTarget } },
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(root, 'index.html'),
        mobile: path.resolve(root, 'mobile.html'),
        hud: path.resolve(root, 'hud.html'),
        'career-command': path.resolve(root, 'career-command.html'),
        'career-inbox': path.resolve(root, 'career-inbox.html'),
        'career-intake': path.resolve(root, 'career-intake.html'),
        'action-inbox': path.resolve(root, 'action-inbox.html'),
        radar: path.resolve(root, 'radar.html'),
        manus: path.resolve(root, 'manus.html'),
        flows: path.resolve(root, 'flows.html'),
        'operator-chat': path.resolve(root, 'operator-chat.html'),
        intelligence: path.resolve(root, 'intelligence.html'),
        'context-memory': path.resolve(root, 'context-memory.html'),
        council: path.resolve(root, 'council.html'),
        'executive-briefing': path.resolve(root, 'executive-briefing.html'),
        'image-settings': path.resolve(root, 'image-settings.html'),
        'linkedin-assets': path.resolve(root, 'linkedin-assets.html'),
        'linkedin-compose': path.resolve(root, 'linkedin-compose.html'),
        'linkedin-history': path.resolve(root, 'linkedin-history.html'),
        'linkedin-publisher': path.resolve(root, 'linkedin-publisher.html'),
        linkedin: path.resolve(root, 'linkedin.html'),
        settings: path.resolve(root, 'settings.html'),
      },
    },
  },
});
