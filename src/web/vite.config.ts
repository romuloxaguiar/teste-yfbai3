import { defineConfig } from 'vite'; // ^4.0.0
import react from '@vitejs/plugin-react'; // ^4.0.0
import tsconfigPaths from 'vite-tsconfig-paths'; // ^4.2.0

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    tsconfigPaths()
  ],

  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
    cors: true,
    hmr: {
      overlay: true
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'teams-vendor': ['@microsoft/teams-js', '@microsoft/teams-react-hooks'],
          'fluentui-vendor': ['@fluentui/react', '@fluentui/react-components'],
          'utils-vendor': ['lodash', 'date-fns', 'uuid']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
    cssCodeSplit: true,
    assetsInlineLimit: 4096
  },

  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@services': '/src/services', 
      '@utils': '/src/utils',
      '@hooks': '/src/hooks',
      '@contexts': '/src/contexts',
      '@types': '/src/types',
      '@constants': '/src/constants',
      '@assets': '/src/assets',
      '@teams': '/src/teams',
      '@layouts': '/src/layouts',
      '@features': '/src/features'
    }
  },

  define: {
    __APP_VERSION__: 'JSON.stringify(process.env.npm_package_version)'
  },

  optimizeDeps: {
    include: ['react', 'react-dom', '@microsoft/teams-js'],
    exclude: ['@microsoft/teams-react-hooks']
  },

  esbuild: {
    jsxInject: "import React from 'react'",
    legalComments: 'none'
  }
});