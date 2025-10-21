import { ResourceManager } from '../../../utils/browser.js';
import { humanDelay } from '../../../utils/delay.js';

export async function fetchFreeProxyListUltra() {
  const rm = new ResourceManager();
  let browser;
  try {
    browser = await rm.createBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0...');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    await page.goto('https://free-proxy-list.net/', { waitUntil: 'networkidle2', timeout: 30000 });
    await humanDelay(2000, 4000);
    const data = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#proxylisttable tbody tr'))
        .map(row => {
          const tds = row.querySelectorAll('td');
          return tds.length >= 8
            ? { ip: tds[0].textContent.trim(), port: tds[1].textContent.trim(), https: tds[6].textContent.trim() === 'yes' }
            : null;
        })
        .filter(Boolean);
    });
    return data.map(p => ({
      ip: p.ip,
      port: p.port,
      protocol: p.https ? 'https' : 'http',
      source: 'free-proxy-list.net'
    }));
  } catch {
    return [];
  } finally {
    if (browser) await browser.close();
  }
}