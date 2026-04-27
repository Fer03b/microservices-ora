import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En dev : Vite proxy les 3 microservices
//   /api/products/* → http://localhost:3000/products/*  (product-service)
//   /api/auth/*     → http://localhost:3001/auth/*      (auth-service)
//   /api/orders/*   → http://localhost:3002/orders/*    (order-service)
// En prod : la gateway Kubernetes (Istio/Ingress) prendra le relais.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/products': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/api/orders': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
