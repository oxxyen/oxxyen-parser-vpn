/**
 * 📈 Прогнозирует будущую скорость прокси на основе временных рядов
 */
export class SpeedPredictor {
  // Простая экспоненциальная скользящая средняя
  static forecast(history, alpha = 0.3) {
    if (!history || history.length === 0) return 5000;
    if (history.length === 1) return history[0];
    
    let forecast = history[0];
    for (let i = 1; i < history.length; i++) {
      forecast = alpha * history[i] + (1 - alpha) * forecast;
    }
    return Math.max(100, Math.min(10000, forecast)); // clamp
  }

  // Прогноз uptime (вероятность, что прокси будет работать через N минут)
  static uptimeProbability(failures, totalChecks, minutesAhead = 10) {
    const baseReliability = totalChecks > 0 ? (totalChecks - failures) / totalChecks : 0.5;
    // Экспоненциальный спад надёжности со временем
    return Math.max(0.1, baseReliability * Math.exp(-minutesAhead / 60));
  }
}