// defineConfig used to define Vite configuration in type-safe manner
import { defineConfig } from 'vite';
// enables support for React specific features
import react from '@vitejs/plugin-react';
// enables support for URL and path utilities
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
// defines varaibles for determining current file location
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// export Vite config object
export default defineConfig({
  // specifies to use react plug to enable JSX support and other optimizations
  plugins: [react()],
  // sets base public path for app - from root path
  base: '/',
  // configures development server
  server: {
    open: true,
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
        manualChunks: undefined,
        //naming convention for asset files
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          // specifies that PDFs should retain their original names in assets directory
          if (name.endsWith('.pdf')) {
            return 'assets/[name][extname]';
          }
          // specifies that CSS files should retain their original names in assets directory
          if (name.endsWith('.css')) {
            return 'assets/[name][extname]';
          }
          // applies hashed naming convention to all other assets
          return 'assets/[name]-[hash][extname]';
        },
        // sets naming for chunks and entry points
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    // enables source map generation and debugs minified production code by mapping it back to source
    sourcemap: true
  },
  // specifies directory for static assets
  publicDir: 'public',
  // configures how Vite resolves module imports
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  // configures dependency pre-bundling for improved performance
  optimizeDeps: {
    include: ['react', 'react-dom', 'jspdf']
  },
  // CSS handling configuration 
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    devSourcemap: true
  }
});
