import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/ai-tasks': {
          target: env.VITE_CLAWBUDDY_API_URL,
          changeOrigin: true,
          rewrite: () => '/functions/v1/ai-tasks',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.CLAWBUDDY_WEBHOOK_SECRET) {
                proxyReq.setHeader('x-webhook-secret', env.CLAWBUDDY_WEBHOOK_SECRET);
              }
            });
          },
        },
      },
    },
  };
});
