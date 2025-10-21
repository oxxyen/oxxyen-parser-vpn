/**
 * 🧠 Умный планировщик источников с самообучением
 * Отключает "мертвые" источники, активирует резервные
 */
export class DynamicSourceScheduler {
  constructor(sources) {
    this.sources = sources.map((src, i) => ({
      ...src,
      id: i,
      health: { 
        successRate: 0.5, 
        avgLatency: 5000, 
        lastSuccess: 0,
        consecutiveFails: 0,
        enabled: true
      }
    }));
    this.alpha = 0.2; // скорость адаптации
  }

  async fetchAll() {
    const promises = this.sources
      .filter(s => s.health.enabled)
      .map(src => this.executeWithMonitoring(src));

    const results = await Promise.allSettled(promises);
    this.updateHealth(results);
    return results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value || []);
  }

  async executeWithMonitoring(source) {
    const start = Date.now();
    try {
      const result = await source.fetch();
      const latency = Date.now() - start;
      source.health.lastSuccess = Date.now();
      source.health.consecutiveFails = 0;
      source.health.avgLatency = this.alpha * latency + (1 - this.alpha) * source.health.avgLatency;
      source.health.successRate = this.alpha * 1 + (1 - this.alpha) * source.health.successRate;
      return result;
    } catch (e) {
      source.health.consecutiveFails++;
      source.health.successRate = (1 - this.alpha) * source.health.successRate;
      // Отключаем источник при 3+ ошибках подряд
      if (source.health.consecutiveFails >= 3) {
        source.health.enabled = false;
        console.warn(`⚠️ Источник ${source.name} отключен из-за нестабильности`);
      }
      return [];
    }
  }

  updateHealth(results) {
    // todo: добавить глобальную аналитику
  }

  getStats() {
    return this.sources.map(s => ({
      name: s.name,
      enabled: s.health.enabled,
      successRate: s.health.successRate,
      avgLatency: Math.round(s.health.avgLatency)
    }));
  }
}