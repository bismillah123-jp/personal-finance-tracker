import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load Cloudflare plugin (optional, only available on CF Pages)
let cloudflarePlugins: any[] = [];
try {
  const cf = await import('@cloudflare/vite-plugin');
  cloudflarePlugins = [cf.cloudflare()];
} catch {
  // Not on Cloudflare or plugin not installed — skip
}

export default defineConfig({
  plugins: [
    react(),
    ...cloudflarePlugins,
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
  },
});
