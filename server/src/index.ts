import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { logger } from './utils/logger.js';

const app = express();

app.use(cors({ origin: `http://localhost:${env.CLIENT_PORT}` }));
app.use(express.json({ limit: '1mb' }));

// Request log - simple, one line per request
app.use((req, _res, next) => {
  logger.info('http.in', { method: req.method, path: req.path });
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    demoMode: env.DEMO_MODE,
    model: env.CLAUDE_MODEL,
    modelNarrator: env.CLAUDE_MODEL_NARRATOR ?? env.CLAUDE_MODEL,
  });
});

// Feature routes will be mounted here as they ship:
// import { briefRouter } from './routes/brief.js';
// import { debugRouter } from './routes/debug.js';
// import { adviseRouter } from './routes/advise.js';
// import { narrateRouter } from './routes/narrate.js';
// app.use('/api/brief', briefRouter);
// app.use('/api/debug', debugRouter);
// app.use('/api/advise', adviseRouter);
// app.use('/api/narrate', narrateRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handler - last
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('http.error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(env.PORT, () => {
  logger.info('server.up', {
    port: env.PORT,
    demoMode: env.DEMO_MODE,
    model: env.CLAUDE_MODEL,
  });
});
