import { Router } from 'express';
import { z } from 'zod';
import { narratorSchema } from '../schemas/narrator.js';
import { loadSession } from '../services/data.js';
import { generatePdf } from '../services/pdf.js';
import { uploadPdf, listReports } from '../services/blob.js';
import { buildClosingReportHtml } from '../templates/closing-report.js';
import { parseBody } from '../utils/validate.js';
import { logger } from '../utils/logger.js';
import { env } from '../env.js';

const InputSchema = z.object({
  narrator: narratorSchema,
  generatedBy: z.string().optional(),
});

export const exportRouter = Router();

exportRouter.post('/pdf', async (req, res) => {
  const body = parseBody(InputSchema, req, res);
  if (!body) return;

  try {
    const session = await loadSession();

    const generatedAt = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = buildClosingReportHtml(body.narrator, session, generatedAt, body.generatedBy);
    const pdf = await generatePdf(html);
    const pdfBuffer = Buffer.from(pdf);

    // Upload to Azure Blob Storage if configured — before sending response so we can add the header
    if (env.AZURE_STORAGE_CONNECTION_STRING) {
      try {
        const blobName = `${body.narrator.sessionId}/${Date.now()}.pdf`;
        const blobUrl = await uploadPdf(blobName, pdfBuffer);
        res.setHeader('X-Blob-Url', blobUrl);
      } catch (err) {
        logger.warn('export.blob.fail', { error: String(err) });
        // PDF download still works without Blob Storage
      }
    }

    const period = session.period.replace(/\s+/g, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="financial-brain-closing-${period}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.byteLength);
    res.end(pdfBuffer);

    logger.info('export.pdf.ok', { sessionId: body.narrator.sessionId, bytes: pdf.length });
  } catch (err) {
    logger.error('export.pdf.fail', { error: String(err) });
    res.status(500).json({ error: 'PDF generation failed', message: String(err) });
  }
});

// Returns all archived closing reports from Azure Blob Storage with 24h SAS URLs.
// Returns [] if Blob Storage is not configured.
exportRouter.get('/reports', async (_req, res) => {
  if (!env.AZURE_STORAGE_CONNECTION_STRING) {
    return res.json([]);
  }
  try {
    const reports = await listReports();
    return res.json(reports);
  } catch (err) {
    logger.error('export.reports.fail', { error: String(err) });
    return res.status(500).json({ error: 'Failed to list reports' });
  }
});
