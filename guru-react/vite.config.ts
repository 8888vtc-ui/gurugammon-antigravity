import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

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
            proxy: {
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    };
})
