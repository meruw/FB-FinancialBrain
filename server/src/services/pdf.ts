import puppeteer, { type Browser } from 'puppeteer';
import { logger } from '../utils/logger.js';

const PURPLE = '#8E31B5';

// Footer rendered by Puppeteer at the bottom of every page — outside the HTML flow,
// so it always sits at the physical page bottom regardless of content length.
// System font only (Google Fonts don't load inside Puppeteer header/footer templates).
export const PDF_FOOTER_TEMPLATE = `
  <div style="width:100%;font-size:8.5px;color:#9ca3af;text-align:center;
    padding:6px 48px;border-top:1px solid #f0ecf5;
    font-family:system-ui,-apple-system,sans-serif;box-sizing:border-box;">
    <span style="color:${PURPLE};font-weight:700;">fast</span><span style="color:#6b7280;font-weight:700;">bank</span>
    <span style="margin:0 6px;color:#d1d5db;">·</span>Memories
    <span style="margin:0 6px;color:#d1d5db;">·</span>Powered by Anthropic Claude
    <span style="margin:0 6px;color:#d1d5db;">·</span>
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>`;

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
    await page.setContent(html, { waitUntil: 'load' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: PDF_FOOTER_TEMPLATE,
      margin: { top: '0', right: '0', bottom: '36px', left: '0' },
    });
  } finally {
    await page.close();
  }
}
