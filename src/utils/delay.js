import { setTimeout as sleep } from 'timers/promises';

export async function humanDelay(min = 1000, max = 3000) {
  await sleep(min + Math.random() * (max - min));
}