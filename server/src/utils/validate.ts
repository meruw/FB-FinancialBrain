import type { Request, Response } from 'express';
import { z } from 'zod';

/**
 * Parses the request body against a Zod schema.
 * Returns the typed data on success, or sends a 400 and returns null.
 *
 * Usage in a route:
 *   const body = parseBody(InputSchema, req, res);
 *   if (!body) return;
 */
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  req: Request,
  res: Response
): z.infer<T> | null {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', issues: result.error.issues });
    return null;
  }
  return result.data as z.infer<T>;
}
