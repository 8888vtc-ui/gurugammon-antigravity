import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:3001';

    return {
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
                ...(env.VITE_CLERK_PUBLISHABLE_KEY?.includes('dummy') ? {
                    '@clerk/clerk-react': path.resolve(__dirname, "./src/utils/MockClerk.tsx"),
                    // Use suffix matching to replace the hook file
                    [path.resolve(__dirname, "./src/hooks/useWebSocket.ts")]: path.resolve(__dirname, "./src/utils/MockWebSocket.tsx")
                } : {})
            },
        },
        server: {
            port: 5173,
            host: true,
            proxy: {
                '/api': {
                    target: backendUrl,
                    changeOrigin: true,
                    secure: false,
                },
                '/ws': {
                    target: backendUrl.replace('http', 'ws'),
                    ws: true,
                    changeOrigin: true,
                },
            },
        },
        build: {
            sourcemap: true,
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor: ['react', 'react-dom', 'react-router-dom'],
                        animations: ['framer-motion'],
                    }
                }
            }
        }
    };
})
