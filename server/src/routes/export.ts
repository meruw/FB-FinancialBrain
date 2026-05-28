import { Router } from 'express';
import { z } from 'zod';
import { narratorSchema } from '../schemas/narrator.js';
import { loadSession } from '../services/data.js';
import { generatePdf } from '../services/pdf.js';
import { buildClosingReportHtml } from '../templates/closing-report.js';
import { parseBody } from '../utils/validate.js';
import { logger } from '../utils/logger.js';

const InputSchema = z.object({
  narrator: narratorSchema,
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

    const html = buildClosingReportHtml(body.narrator, session, generatedAt);
    const pdf = await generatePdf(html);

    const period = session.period.replace(/\s+/g, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="financial-brain-closing-${period}.pdf"`);
    res.setHeader('Content-Length', pdf.byteLength);
    res.end(Buffer.from(pdf));

    logger.info('export.pdf.ok', { sessionId: body.narrator.sessionId, bytes: pdf.length });
  } catch (err) {
    logger.error('export.pdf.fail', { error: String(err) });
    res.status(500).json({ error: 'PDF generation failed', message: String(err) });
  }
});
