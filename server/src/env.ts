import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment schema.
 * Validated once at boot. If anything is missing or wrong, the server fails fast
 * with a readable error instead of dying mid-request during the demo.
 */
const EnvSchema = z
  .object({
    ANTHROPIC_API_KEY: z.string().optional().default(''),
    CLAUDE_MODEL: z.string().default('claude-sonnet-4-6'),
    CLAUDE_MODEL_NARRATOR: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(4000),
    CLIENT_PORT: z.coerce.number().int().positive().default(5173),
    DEMO_MODE: z
      .string()
      .default('false')
      .transform((v) => v.toLowerCase() === 'true'),
  })
  .refine((d) => d.DEMO_MODE || d.ANTHROPIC_API_KEY.length > 0, {
    message: 'ANTHROPIC_API_KEY is required when DEMO_MODE is false',
    path: ['ANTHROPIC_API_KEY'],
  });

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
