import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/api.js';
import { CONFIG } from './server/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount API endpoints
  app.use('/api', apiRouter);

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite dev server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[OmniStream] Vite dev middleware mounted');
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`[OmniStream Server] Listening on http://0.0.0.0:${CONFIG.PORT}`);
    console.log(`[OmniStream Server] Scratch directory: ${CONFIG.SCRATCH_DIR}`);
    console.log(`[OmniStream Server] Engine: yt-dlp & ffmpeg ready`);
  });
}

startServer().catch((err) => {
  console.error('[OmniStream Server] Failed to start:', err);
  process.exit(1);
});
