import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const outputDir = new URL('../docs/demo-video/capture/', import.meta.url).pathname;
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--hide-scrollbars']
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: outputDir, size: { width: 1920, height: 1080 } },
  colorScheme: 'dark'
});
const page = await context.newPage();
const video = page.video();

async function hold(milliseconds) {
  await page.waitForTimeout(milliseconds);
}

async function focus(selector, block = 'center') {
  await page.locator(selector).evaluate((element, position) => {
    element.scrollIntoView({ behavior: 'smooth', block: position });
  }, block);
  await hold(1500);
}

try {
  await page.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await hold(5000);

  await page.locator('#run-sim').click();
  await hold(5500);

  await focus('#edge-agent', 'start');
  await hold(4500);

  await page.locator('#analyze-factory').click();
  await page.waitForFunction(() => document.querySelector('#agent-mode')?.textContent?.includes('LIVE'), null, { timeout: 60_000 });
  await hold(9500);

  await page.locator('#apply-agent-action').click();
  await hold(6500);

  await focus('#operations', 'start');
  await hold(6500);

  await focus('.mobility-card', 'start');
  await hold(6500);

  await focus('#openusd-studio', 'start');
  await hold(8500);

  await focus('#edge-agent', 'start');
  await hold(5500);
} finally {
  await context.close();
  await browser.close();
}

console.log(await video.path());
