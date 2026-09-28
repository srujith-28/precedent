import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  /**
   * Never create fake successful API responses.
   * If a relative request hits /analyze or /outcome without an upstream FastAPI server,
   * return 503 so the frontend displays:
   * "Backend unavailable — connect FastAPI to run live analysis."
   */
  app.post('/analyze', (_req, res) => {
    res.status(503).json({
      detail: 'Backend unavailable — connect FastAPI to run live analysis.',
    });
  });

  app.post('/outcome', (_req, res) => {
    res.status(503).json({
      detail: 'Backend unavailable — connect FastAPI to run live analysis.',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Precedent server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
