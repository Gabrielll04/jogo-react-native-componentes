import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

/**
 * Configuração do Vite para usar componentes do React Native no navegador:
 *  - alias "react-native" -> "react-native-web": o código importa de 'react-native'
 *    exatamente como num app mobile, e o Vite troca pela versão web.
 *  - extensões ".web.*" têm prioridade (convenção do React Native para código específico de web).
 *  - em dev, o Vite (porta 5173) repassa Socket.io e rotas REST para o servidor (porta 3000).
 */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      '@shared': path.resolve(import.meta.dirname, '../shared'),
    },
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  define: {
    // algumas libs do ecossistema RN esperam essa global
    __DEV__: JSON.stringify(mode !== 'production'),
  },
  server: {
    host: true, // acessível na rede local também em modo dev
    port: 5173,
    fs: { allow: ['..'] }, // permite importar ../shared
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/modules': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    // duas páginas: o jogo (index.html) e a galeria de componentes (demos.html)
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, 'index.html'),
        demos: path.resolve(import.meta.dirname, 'demos.html'),
      },
    },
    chunkSizeWarningLimit: 2000, // Phaser é grande; tudo bem para rede local
  },
}));
