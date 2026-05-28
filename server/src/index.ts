import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { logger } from './utils/logger.js';
import { loadBrain } from './services/brain.js';
import { warmupCache } from './services/data.js';
import { callClaude, configureAnthropicKey } from './services/claude.js';
import { fetchAnthropicApiKey } from './services/keyvault.js';
import { dataRouter } from './routes/data.js';
import { briefRouter } from './routes/brief.js';
import { debugRouter } from './routes/debug.js';
import { riskRouter } from './routes/risk.js';
import { narratorRouter } from './routes/narrator.js';
import { advisorRouter } from './routes/advisor.js';
import { simulateRouter } from './routes/simulate.js';
import { resolveRouter } from './routes/resolve.js';
import { exportRouter } from './routes/export.js';

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
app.use('/api/simulate', simulateRouter);
app.use('/api/resolve', resolveRouter);
app.use('/api/export', exportRouter);

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

async function main() {
  // Fetch Anthropic API key from Azure Key Vault if configured.
  // Must happen before app.listen so the first real request is never cold with a bad key.
  if (env.AZURE_KEYVAULT_URL && !env.DEMO_MODE) {
    try {
      const apiKey = await fetchAnthropicApiKey();
      configureAnthropicKey(apiKey);
      logger.info('startup.keyvault.ok', { vault: env.AZURE_KEYVAULT_URL });
    } catch (err) {
      logger.warn('startup.keyvault.fail', { error: String(err) });
      // Falls back to ANTHROPIC_API_KEY env var — server still starts
    }
  }

  app.listen(env.PORT, '0.0.0.0', () => {
    logger.info('server.up', {
      port: env.PORT,
      demoMode: env.DEMO_MODE,
      model: env.CLAUDE_MODEL,
    });

    Promise.all([loadBrain(), warmupCache()]).catch((err) =>
      logger.error('startup.warmup.fail', { error: String(err) })
    );

    if (!env.DEMO_MODE) {
      callClaude({ system: 'ping', user: 'ping', maxTokens: 1, timeoutMs: 8000 })
        .catch(() => {});
    }
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
