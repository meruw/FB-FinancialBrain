import puppeteer, { type Browser } from 'puppeteer';
import { logger } from '../utils/logger.js';

// Lazy singleton — created on first request, reused thereafter.
// Re-created automatically if the browser process crashes or disconnects.
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    logger.info('pdf.browser.launched');
  }
  return browser;
}

export async function generatePdf(html: string): Promise<Uint8Array> {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  } finally {
    await page.close();
  }
}
