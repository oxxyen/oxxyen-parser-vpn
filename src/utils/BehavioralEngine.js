import { sleep } from 'timers/promises';

/**
 * 🧠 Имитирует человеческое поведение при парсинге
 */
export class BehavioralEngine {
  static async humanBrowse(page, options = {}) {
    const { minDelay = 800, maxDelay = 2500, scroll = true } = options;

    // Случайная задержка
    await sleep(minDelay + Math.random() * (maxDelay - minDelay));

    // Имитация скролла
    if (scroll) {
      const heights = [0.3, 0.6, 0.9, 1.0];
      for (const h of heights) {
        await page.evaluate((height) => {
          window.scrollTo(0, document.body.scrollHeight * height);
        }, h);
        await sleep(300 + Math.random() * 700);
      }
    }

    // TODO: движения мыши 
  }

  static getRandomViewport() {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }
}