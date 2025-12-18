import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Set base path for GitHub Pages deployment
      // When deploying to GitHub Pages at username.github.io/repo-name/
      // Vercel and other platforms ignore this since they deploy to root
      base: process.env.GITHUB_PAGES ? '/lu-lu-sticker-tools_v3/' : '/',
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
