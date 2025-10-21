import axios from 'axios';
import { performance } from 'perf_hooks';
import config from '../config.js';
import { humanDelay } from '../utils/delay.js';
import { ResourceManager } from '../utils/browser.js';

const resourceManager = new ResourceManager();

const TEST_CONFIGS = [
  { url: 'https://httpbin.org/ip', validator: (data, proxy) => data.origin === proxy.ip },
  { url: 'https://api.ipify.org?format=json', validator: (data, proxy) => data.ip === proxy.ip },
  { url: 'https://ident.me/json', validator: (data, proxy) => data.ip === proxy.ip }
];

export async function ultraProxyTest(proxy) {
  const results = [];
  for (const test of TEST_CONFIGS) {
    try {
      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.TIMEOUT_MS);
      const response = await axios({
        method: 'GET',
        url: test.url,
        timeout: config.TIMEOUT_MS,
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0...' },
        validateStatus: () => true,
        ...(proxy.protocol.startsWith('socks')
          ? {
              httpsAgent: resourceManager.getProxyAgent(proxy),
              httpAgent: resourceManager.getProxyAgent(proxy)
            }
          : {
              proxy: {
                protocol: proxy.protocol,
                host: proxy.ip,
                port: parseInt(proxy.port)
              }
            })
      });
      clearTimeout(timeoutId);
      const speed = performance.now() - startTime;
      const success = response.status === 200 && test.validator(response.data, proxy);
      results.push({ success, speed, status: response.status });
    } catch {
      results.push({ success: false, speed: config.TIMEOUT_MS });
    }
    await humanDelay(200, 500);
  }

  const successful = results.filter(r => r.success);
  if (successful.length >= 2) {
    const avgSpeed = successful.reduce((sum, t) => sum + t.speed, 0) / successful.length;
    return { ...proxy, working: true, speed: Math.round(avgSpeed) };
  }
  return { ...proxy, working: false };
}

export async function processProxiesUltraFast(proxies) {
  const results = [];
  const batchSize = config.CONCURRENT_CHECKS;
  for (let i = 0; i < proxies.length; i += batchSize) {
    const batch = proxies.slice(i, i + batchSize);
    const batchPromises = batch.map(p => ultraProxyTest(p).catch(() => ({ ...p, working: false })));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(r => r.working));
    await humanDelay(300, 800);
  }
  return results;
}