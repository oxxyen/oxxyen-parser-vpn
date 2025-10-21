import { performance } from 'perf_hooks';
import axios from 'axios';
import { ResourceManager } from '../../utils/browser.js';

/**
 * 🧠 Гениальный валидатор с памятью и самообучением
 * Использует историю проверок для адаптации стратегии
 */
export class LearningProxyValidator {
  constructor(historyStore) {
    this.history = historyStore; // { ip:port → { successRate, avgSpeed, lastFail, ... } }
    this.resourceManager = new ResourceManager();
    this.testEndpoints = [
      { url: 'https://httpbin.org/ip', weight: 0.4 },
      { url: 'https://api.ipify.org?format=json', weight: 0.3 },
      { url: 'https://ident.me/json', weight: 0.3 }
    ];
  }

  async validate(proxy) {
    const key = `${proxy.ip}:${proxy.port}`;
    const past = this.history.get(key) || { successRate: 0.5, avgSpeed: 5000, reliability: 0.5 };

    // 🧬 Динамический выбор количества тестов на основе надёжности
    const minTests = past.reliability > 0.8 ? 2 : 3;
    const testsToRun = this.testEndpoints.slice(0, minTests);

    let successCount = 0;
    let totalSpeed = 0;
    const results = [];

    for (const test of testsToRun) {
      const result = await this.runTest(proxy, test.url, past.avgSpeed * 1.5);
      results.push(result);
      if (result.success) {
        successCount++;
        totalSpeed += result.speed;
      }
    }

    const successRate = successCount / testsToRun.length;
    const avgSpeed = successCount > 0 ? totalSpeed / successCount : CONFIG.TIMEOUT;

    // 📈 Обновляем историю с экспоненциальным сглаживанием
    const alpha = 0.3; // скорость обучения
    const newSuccessRate = alpha * successRate + (1 - alpha) * (past.successRate || 0);
    const newAvgSpeed = alpha * avgSpeed + (1 - alpha) * (past.avgSpeed || 5000);
    const reliability = newSuccessRate * (1 - Math.min(1, avgSpeed / 10000));

    this.history.set(key, {
      successRate: newSuccessRate,
      avgSpeed: newAvgSpeed,
      reliability,
      lastChecked: Date.now(),
      lastSuccess: successCount > 0 ? Date.now() : past.lastSuccess,
      consecutiveFails: successCount === 0 ? (past.consecutiveFails || 0) + 1 : 0
    });

    return {
      ...proxy,
      working: successCount >= Math.ceil(minTests / 2),
      speed: Math.round(avgSpeed),
      successRate: newSuccessRate,
      reliability,
      tests: results
    };
  }

  async runTest(proxy, url, timeoutMs) {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const config = {
        url,
        method: 'GET',
        timeout: timeoutMs,
        signal: controller.signal,
        headers: { 'User-Agent': this.getRandomUA() },
        validateStatus: () => true,
        ...(proxy.protocol.startsWith('socks')
          ? {
              httpsAgent: this.resourceManager.getProxyAgent(proxy),
              httpAgent: this.resourceManager.getProxyAgent(proxy)
            }
          : {
              proxy: {
                protocol: proxy.protocol,
                host: proxy.ip,
                port: parseInt(proxy.port)
              }
            })
      };
      const res = await axios(config);
      clearTimeout(id);
      const speed = performance.now() - startTime;
      const success = res.status === 200 && this.validateIP(res.data, proxy.ip);
      return { success, speed, status: res.status };
    } catch {
      return { success: false, speed: timeoutMs, error: 'timeout' };
    }
  }

  validateIP(data, expectedIP) {
    return (
      (data?.origin === expectedIP) ||
      (data?.ip === expectedIP) ||
      (data?.['YourFuckingIPAddress'] === expectedIP)
    );
  }

  getRandomUA() {
    const uas = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    return uas[Math.floor(Math.random() * uas.length)];
  }
}