import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // .env ファイルから環境変数を読み込む
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      proxy: {
        // /api へのリクエストを実際のOpenAI APIにプロキシ
        '/api/openai': {
          target: env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // ログ出力
              console.log('Proxying request:', req.method, req.url, '→', options.target + req.url.replace(/^\/api\/openai/, ''));
            });
          }
        }
      }
    }
  };
});
