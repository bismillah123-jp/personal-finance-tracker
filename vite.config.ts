import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Cloudflare plugin is optional — only loaded when available
let cloudflarePlugin: any = null;
try {
  const cf = await import('@cloudflare/vite-plugin');
  cloudflarePlugin = cf.cloudflare();
} catch {
  // Not on Cloudflare — skip plugin
}

export default defineConfig({
  plugins: [
    react(),
    ...(cloudflarePlugin ? [cloudflarePlugin] : []),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
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
