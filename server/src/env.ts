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

    // Azure Blob Storage — PDF archival (optional)
    AZURE_STORAGE_CONNECTION_STRING: z.string().default(''),
    AZURE_STORAGE_CONTAINER: z.string().default('closing-reports'),

    // Azure Key Vault — Anthropic API key source (optional, overrides ANTHROPIC_API_KEY)
    AZURE_KEYVAULT_URL: z.string().default(''),
    AZURE_KEYVAULT_SECRET_NAME: z.string().default('anthropic-api-key'),

    // Azure Service Bus — critical risk alerts (optional)
    AZURE_SERVICEBUS_CONNECTION_STRING: z.string().default(''),
    AZURE_SERVICEBUS_QUEUE: z.string().default('risk-alerts'),
  })
  .refine(
    (d) => d.DEMO_MODE || d.ANTHROPIC_API_KEY.length > 0 || d.AZURE_KEYVAULT_URL.length > 0,
    {
      message: 'ANTHROPIC_API_KEY or AZURE_KEYVAULT_URL is required when DEMO_MODE is false',
      path: ['ANTHROPIC_API_KEY'],
    },
  );

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
