import crypto from 'crypto';

/**
 * 🧬 Генерирует уникальный "отпечаток" прокси для кэширования и анализа
 * Включает гео, скорость, анонимность, источник
 */
export class ProxyDNA {
  static encode(proxy) {
    const payload = [
      proxy.ip,
      proxy.port,
      proxy.protocol,
      proxy.country || 'XX',
      proxy.anonymity || 'unknown',
      proxy.source,
      Math.floor((proxy.speed || 0) / 100), // квантование скорости
      proxy.type || 'proxy'
    ].join('|');
    return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
  }

  static isSimilar(dna1, dna2, threshold = 0.9) {
    // Можно реализовать fuzzy matching
    return dna1 === dna2;
  }
}