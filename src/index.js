import config from './config.js';
import logger from './utils/logger.js';
import { AdvancedProxyScanner } from './scanner/index.js';
import { UltraTelegramBot } from './bot.js';

async function main() {
  logger.info('🔧 Инициализация Ultra Proxy/VPN Scanner 2025...');
  const scanner = new AdvancedProxyScanner();
  const bot = new UltraTelegramBot(scanner);

  const signals = ['SIGINT', 'SIGTERM'];
  for (const sig of signals) {
    process.on(sig, async () => {
      logger.info(`🛑 Получен ${sig}...`);
      await bot.stop();
      await scanner.cleanup();
      process.exit(0);
    });
  }

  await bot.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('💥 Фатальная ошибка:', err);
    process.exit(1);
  });
}