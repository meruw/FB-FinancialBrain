import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

export interface BlobReport {
  name: string;
  url: string;
  sizeBytes: number;
  lastModified: string;
}

function getContainerClient() {
  const client = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
  return client.getContainerClient(env.AZURE_STORAGE_CONTAINER);
}

async function getSasUrl(blobName: string): Promise<string> {
  const blob = getContainerClient().getBlockBlobClient(blobName);
  return blob.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'),
    expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  });
}

export async function uploadPdf(blobName: string, buffer: Buffer): Promise<string> {
  const blob = getContainerClient().getBlockBlobClient(blobName);

  await blob.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: 'application/pdf' },
  });

  const sasUrl = await getSasUrl(blobName);
  logger.info('blob.upload.ok', { blobName, bytes: buffer.length });
  return sasUrl;
}

export async function listReports(): Promise<BlobReport[]> {
  const reports: BlobReport[] = [];

  for await (const blob of getContainerClient().listBlobsFlat()) {
    const sasUrl = await getSasUrl(blob.name);
    reports.push({
      name: blob.name,
      url: sasUrl,
      sizeBytes: blob.properties.contentLength ?? 0,
      lastModified: blob.properties.lastModified?.toISOString() ?? '',
    });
  }

  return reports.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}
