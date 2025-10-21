import { Telegraf } from 'telegraf';
import config from './config.js';
import logger from './utils/logger.js';
import { formatUltraResults } from './formatter/messageFormatter.js';

export class UltraTelegramBot {
  constructor(scanner) {
    this.scanner = scanner;
    this.bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
    this.isRunning = false;
  }

  async validateChat() {
    try {
      await this.bot.telegram.getChat(config.TELEGRAM_CHANNEL_ID);
      return true;
    } catch (e) {
      logger.error({ err: e.message }, 'Ошибка валидации чата');
      return false;
    }
  }

  async sendUltraResults() {
    if (config.DRY_RUN) {
      logger.info('🧪 DRY RUN: отчет не отправляется');
      return true;
    }

    if (!(await this.validateChat())) return false;

    try {
      const scanResults = await this.scanner.comprehensiveUltraScan();
      let message = formatUltraResults(scanResults, this.scanner.stats);

      const MAX_LEN = 4096;
      if (message.length <= MAX_LEN) {
        await this.bot.telegram.sendMessage(config.TELEGRAM_CHANNEL_ID, message, {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
      } else {
        // разбивка на части
        const parts = [];
        let current = '';
        const lines = message.split('\n');
        for (const line of lines) {
          if (current.length + line.length + 1 > MAX_LEN) {
            parts.push(current);
            current = line + '\n';
          } else {
            current += line + '\n';
          }
        }
        if (current) parts.push(current);
        for (let i = 0; i < parts.length; i++) {
          await this.bot.telegram.sendMessage(
            config.TELEGRAM_CHANNEL_ID,
            parts[i] + (i < parts.length - 1 ? '\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯' : ''),
            { parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: i > 0 }
          );
          if (i < parts.length - 1) await new Promise(r => setTimeout(r, 1000));
        }
      }
      logger.info({ working: this.scanner.stats.workingProxies }, '✅ Отчет отправлен');
      return true;
    } catch (e) {
      logger.error({ err: e.message }, '❌ Ошибка отправки отчета');
      return false;
    }
  }

  async start() {
    this.isRunning = true;
    logger.info('🚀 Запуск Ultra Scanner...');
    await this.sendUltraResults();
    while (this.isRunning) {
      await new Promise(r => setTimeout(r, config.SCAN_INTERVAL * 60 * 1000));
      await this.sendUltraResults();
    }
  }

  async stop() {
    this.isRunning = false;
    logger.info('🛑 Остановка...');
  }
}