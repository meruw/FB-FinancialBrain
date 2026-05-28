import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

export async function fetchAnthropicApiKey(): Promise<string> {
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(env.AZURE_KEYVAULT_URL, credential);
  const secret = await client.getSecret(env.AZURE_KEYVAULT_SECRET_NAME);
  if (!secret.value) {
    throw new Error(`Key Vault secret "${env.AZURE_KEYVAULT_SECRET_NAME}" has no value`);
  }
  logger.info('keyvault.fetch.ok', { secret: env.AZURE_KEYVAULT_SECRET_NAME });
  return secret.value;
}
