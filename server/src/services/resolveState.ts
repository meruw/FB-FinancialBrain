import { BlobServiceClient } from '@azure/storage-blob';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import type { MatchedRecord } from './data.js';

// Tracks bank transactions accepted via POST /api/resolve.
// Persisted to Azure Blob Storage when configured — survives server restarts.
// Reset via POST /api/data/reload (clears both in-memory state and the Blob).
// In production this becomes a call to the FastBank matching engine (see CLAUDE.md §23).

const resolvedBankIds = new Set<string>();
const resolvedTimestamps = new Map<string, string>();

const STATE_BLOB = 'resolve-state.json';

function getStateBlobClient() {
  const client = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
  return client.getContainerClient(env.AZURE_STORAGE_CONTAINER).getBlockBlobClient(STATE_BLOB);
}

function persistToBlob(): void {
  if (!env.AZURE_STORAGE_CONNECTION_STRING) return;
  const content = JSON.stringify({
    ids: [...resolvedBankIds],
    timestamps: Object.fromEntries(resolvedTimestamps),
  });
  const buf = Buffer.from(content);
  getStateBlobClient()
    .upload(buf, buf.length, { blobHTTPHeaders: { blobContentType: 'application/json' } })
    .catch((err) => logger.warn('resolve.state.persist.fail', { error: String(err) }));
}

// Called once on server startup to restore state from a previous session.
export async function loadResolveStateFromStorage(): Promise<void> {
  if (!env.AZURE_STORAGE_CONNECTION_STRING) return;
  try {
    const buffer = await getStateBlobClient().downloadToBuffer();
    const data = JSON.parse(buffer.toString()) as { ids: string[]; timestamps: Record<string, string> };
    for (const id of data.ids) resolvedBankIds.add(id);
    for (const [id, ts] of Object.entries(data.timestamps)) resolvedTimestamps.set(id, ts);
    logger.info('resolve.state.loaded', { count: resolvedBankIds.size });
  } catch {
    // Blob doesn't exist yet — start with fresh state
  }
}

export function markResolved(bankId: string): void {
  resolvedBankIds.add(bankId);
  resolvedTimestamps.set(bankId, new Date().toISOString());
  persistToBlob();
}

export function resetResolvedState(): void {
  resolvedBankIds.clear();
  resolvedTimestamps.clear();
  if (env.AZURE_STORAGE_CONNECTION_STRING) {
    getStateBlobClient()
      .deleteIfExists()
      .catch((err) => logger.warn('resolve.state.reset.fail', { error: String(err) }));
  }
}

export function isResolved(bankId: string): boolean {
  return resolvedBankIds.has(bankId);
}

export function buildSyntheticMatches(): MatchedRecord[] {
  return [...resolvedBankIds].map((bankId) => ({
    id: `MANUAL-${bankId}`,
    bankId,
    sapId: `SAP-MANUAL-${bankId}`,
    ruleUsed: 'ManualMatch',
    matchedAt: resolvedTimestamps.get(bankId) ?? new Date().toISOString(),
  }));
}
