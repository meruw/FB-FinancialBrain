/**
 * Minimal logger. Adds timestamp + level prefix. Nothing fancy.
 * If you need structured logging, swap this for pino — same surface area.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

function fmt(level: Level, msg: string, meta?: unknown): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${msg}`;
  if (meta === undefined) return base;
  try {
    return `${base} ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`;
  } catch {
    return `${base} [unserializable meta]`;
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => console.debug(fmt('debug', msg, meta)),
  info: (msg: string, meta?: unknown) => console.log(fmt('info', msg, meta)),
  warn: (msg: string, meta?: unknown) => console.warn(fmt('warn', msg, meta)),
  error: (msg: string, meta?: unknown) => console.error(fmt('error', msg, meta)),
};
