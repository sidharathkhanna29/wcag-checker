import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Requirement 2: render the page in a real browser and run axe-core. */
export async function scanUrl(url) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(1500); // let late JS render
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    return results.violations;
  } finally {
    await browser.close();
  }
}
