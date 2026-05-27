import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { logger } from './utils/logger.js';
import { loadBrain } from './services/brain.js';
import { warmupCache } from './services/data.js';
import { dataRouter } from './routes/data.js';
import { briefRouter } from './routes/brief.js';
import { debugRouter } from './routes/debug.js';
import { riskRouter } from './routes/risk.js';
import { narratorRouter } from './routes/narrator.js';
import { advisorRouter } from './routes/advisor.js';

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

app.use('/api/data', dataRouter);
app.use('/api/brief', briefRouter);
app.use('/api/debug', debugRouter);
app.use('/api/risk', riskRouter);
app.use('/api/narrate', narratorRouter);
app.use('/api/advisor', advisorRouter);

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

  // Pre-load all data into memory so the first real request is never the slow one.
  // Errors here are logged but don't crash the server — routes have their own error handling.
  Promise.all([loadBrain(), warmupCache()]).catch((err) =>
    logger.error('startup.warmup.fail', { error: String(err) })
  );
});
