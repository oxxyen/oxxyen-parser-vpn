import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(10, 'TELEGRAM_BOT_TOKEN слишком короткий'),
  TELEGRAM_CHANNEL_ID: z.string().regex(/^(@[a-zA-Z0-9_]+|-100\d+)$/, 'Неверный формат TELEGRAM_CHANNEL_ID'),
  SCAN_INTERVAL: z.coerce.number().int().min(1).max(1440).default(10),
  MAX_PROXIES: z.coerce.number().int().min(1).default(30),
  TIMEOUT_MS: z.coerce.number().int().min(1000).default(8000),
  CONCURRENT_CHECKS: z.coerce.number().int().min(1).default(25),
  MAX_SOURCES: z.coerce.number().int().min(1).default(60),
  PROXY_CHECK_TIMEOUT: z.coerce.number().int().min(1000).default(10000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DRY_RUN: z.coerce.boolean().default(false)
});

const config = configSchema.parse(process.env);

export default config;