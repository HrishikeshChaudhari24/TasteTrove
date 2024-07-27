import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHtmlPlugin } from 'vite-plugin-html';
import { visualizer } from 'rollup-plugin-visualizer';
import ImageminPlugin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    react(),
    createHtmlPlugin(),
    visualizer({ open: true }),
    ImageminPlugin({
      // configure options here, e.g., for PNG optimization
      pngquant: {
        quality: [0.65, 0.9],
      },
    }),
    CompressionPlugin({
      verbose: true,
      threshold: 10240,
      algorithm: 'gzip',
      minRatio: 0.8,
    }),
  ],
  build: {
    rollupOptions: {
      // Customize Rollup options here if needed
    },
  },
});
