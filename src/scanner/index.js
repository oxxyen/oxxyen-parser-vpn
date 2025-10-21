import { performance } from 'perf_hooks';
import logger from '../utils/logger.js';
import { sourceMethods } from './sources/index.js';
import { processProxiesUltraFast } from './proxyChecker.js';
import { categorizeProxiesUltra, getTopProxiesByCategory } from './categorizer.js';
import { ResourceManager } from '../utils/browser.js';

export class AdvancedProxyScanner {
  constructor() {
    this.resourceManager = new ResourceManager();
    this.stats = { totalFound: 0, workingProxies: 0, scanDuration: 0, sourcesUsed: 0, failedSources: 0 };
  }

  async fetchAllSources() {
    const results = await Promise.allSettled(sourceMethods.map(fn => fn()));
    let all = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        all.push(...r.value);
        this.stats.sourcesUsed++;
      } else {
        this.stats.failedSources++;
      }
    });
    const unique = Array.from(new Map(all.map(p => [`${p.ip}:${p.port}:${p.protocol}`, p])).values());
    this.stats.totalFound = unique.length;
    return unique.slice(0, 300);
  }

  async comprehensiveUltraScan() {
    const start = performance.now();
    const all = await this.fetchAllSources();
    const working = await processProxiesUltraFast(all);
    const categorized = categorizeProxiesUltra(working);
    this.stats.workingProxies = working.length;
    this.stats.scanDuration = performance.now() - start;
    return getTopProxiesByCategory(categorized);
  }

  async cleanup() {
    await this.resourceManager.closeAllBrowsers();
    this.resourceManager.clearAgents();
  }
}