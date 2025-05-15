// defineConfig used to define Vite configuration in type-safe manner
import { defineConfig } from 'vite';
// enables support for React specific features
import react from '@vitejs/plugin-react';
// enables support for URL and path utilities
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import compression from 'vite-plugin-compression';
// defines varaibles for determining current file location
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// export Vite config object
export default defineConfig({
  // specifies to use react plug to enable JSX support and other optimizations
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false,
      threshold: 10240, // Only compress files larger than 10kb
      compressionOptions: {
        level: 9, // Maximum compression
      },
      filter: /\.(js|css|html|svg|json|txt)$/i,
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      deleteOriginFile: false,
      threshold: 10240,
      compressionOptions: {
        level: 11, // Maximum compression
      },
      filter: /\.(js|css|html|svg|json|txt)$/i,
    }),
  ],
  // sets base public path for app - from root path
  base: './',
  // configures development server
  server: {
    open: true,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Vary': 'Accept-Encoding',
    },
  },
  build: {
    // specifies output directory for build files
    outDir: 'dist',
    // sets where static assets go
    assetsDir: 'assets',
    // configures Rollup for build process
    rollupOptions: {
      // sets entry point
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        // disables manual chunking
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['xlsx', 'pdf-lib'],
        },
        //naming convention for asset files
        assetFileNames: (assetInfo) => {
          if (process.env.NODE_ENV === 'development') {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        // sets naming for chunks and entry points
        chunkFileNames: (chunkInfo) => {
          if (process.env.NODE_ENV === 'development') {
            return 'assets/[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
        entryFileNames: (chunkInfo) => {
          if (process.env.NODE_ENV === 'development') {
            return 'assets/[name].js';
          }
          return 'assets/[name]-[hash].js';
        }
      },
    },
    // enables source map generation and debugs minified production code by mapping it back to source
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
  },
  // specifies directory for static assets
  publicDir: 'public',
  // configures how Vite resolves module imports
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  // configures dependency pre-bundling for improved performance
  optimizeDeps: {
    include: ['react', 'react-dom', 'jspdf', 'xlsx']
  },
  // CSS handling configuration 
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    devSourcemap: true
  }
});
