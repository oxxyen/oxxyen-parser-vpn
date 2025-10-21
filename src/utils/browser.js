import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

puppeteer.use(StealthPlugin());

export class ResourceManager {
  constructor() {
    this.browsers = new Set();
    this.agents = new Map();
  }

  async createBrowser() {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1920,1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    this.browsers.add(browser);
    return browser;
  }

  async closeAllBrowsers() {
    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (error) {
        // silent
      }
    }
    this.browsers.clear();
  }

  getProxyAgent(proxy) {
    const key = `${proxy.protocol}://${proxy.ip}:${proxy.port}`;
    if (!this.agents.has(key)) {
      try {
        const agent = proxy.protocol.startsWith('socks')
          ? new SocksProxyAgent(key)
          : new HttpsProxyAgent(key);
        this.agents.set(key, agent);
      } catch {
        return null;
      }
    }
    return this.agents.get(key);
  }

  clearAgents() {
    this.agents.clear();
  }
}