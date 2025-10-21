/**
 * @author oxxyen
 * @description Ultra-modern message formatter for Telegram with rich formatting, icons, and category support
 */

export class UltraMessageFormatter {
  static formatUltraResults(categorizedProxies, stats) {
    const now = new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let message = `🌐 <b>ULTRA PROXY/VPN SCANNER 2025</b>\n`;
    message += `⏰ <i>${now} (МСК)</i>\n`;
    message += `📊 <b>СТАТИСТИКА СКАНИРОВАНИЯ:</b>\n`;
    message += `├ 📥 Найдено: ${stats.totalFound} ресурсов\n`;
    message += `├ ✅ Рабочих: ${stats.workingProxies} прокси\n`;
    message += `├ 🌐 Источников: ${stats.sourcesUsed} использовано\n`;
    message += `├ ⚠️ Ошибок: ${stats.failedSources} источников\n`;
    message += `└ ⚡ Длительность: ${Math.round(stats.scanDuration / 1000)}с\n`;

    // Статистика по категориям
    const categoryStats = Object.entries(stats.categoriesFound || {})
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => `${this.getCategoryIcon(category)} ${category}: ${count}`)
      .join(' | ');
    if (categoryStats) {
      message += `📈 <b>КАТЕГОРИИ:</b> ${categoryStats}\n`;
    }

    // Элитные прокси
    if (categorizedProxies.elite?.length > 0) {
      message += `\n🎯 <b>ЭЛИТНЫЕ ПРОКСИ (HIGH ANONYMOUS):</b>\n`;
      categorizedProxies.elite.forEach((proxy, index) => {
        message += this.formatUltraProxyLine(proxy, index + 1);
      });
    }

    // SOCKS5
    if (categorizedProxies.socks5?.length > 0) {
      message += `\n🧦 <b>SOCKS5 ПРОКСИ:</b>\n`;
      categorizedProxies.socks5.forEach((proxy, index) => {
        message += this.formatUltraProxyLine(proxy, index + 1);
      });
    }

    // MTPROTO
    if (categorizedProxies.mtproto?.length > 0) {
      message += `\n🔐 <b>TELEGRAM MTPROTO ПРОКСИ:</b>\n`;
      categorizedProxies.mtproto.forEach((proxy, index) => {
        message += `${index + 1}. <code>${proxy.ip}:${proxy.port}</code>\n`;
        message += `   ├ 🔧 ${proxy.type || 'MTProto'}\n`;
        message += `   ├ 🔑 ${proxy.secret ? 'Есть секрет' : 'Без секрета'}\n`;
        message += `   └ 🔗 ${proxy.source}\n`;
      });
    }

    // VPN конфиги
    if ((categorizedProxies.openvpn?.length || 0) + (categorizedProxies.wireguard?.length || 0) > 0) {
      message += `\n🔒 <b>VPN КОНФИГУРАЦИИ:</b>\n`;

      (categorizedProxies.openvpn || []).forEach((vpn, index) => {
        message += `${index + 1}. ${vpn.host || vpn.name || 'OpenVPN Config'}\n`;
        message += `   ├ 🌍 ${vpn.country || 'Multiple'}\n`;
        message += `   ├ 🔧 ${vpn.type}\n`;
        message += `   ├ ⚡ ${vpn.speed || vpn.ping || 'N/A'} ${vpn.speed ? 'Mbps' : 'ms'}\n`;
        if (vpn.config) {
          message += `   └ 📎 <a href="${vpn.config}">Скачать OpenVPN конфиг</a>\n`;
        } else if (vpn.url) {
          message += `   └ 🔗 <a href="${vpn.url}">GitHub репозиторий</a>\n`;
        } else {
          message += `   └ 🔗 ${vpn.source}\n`;
        }
      });

      (categorizedProxies.wireguard || []).forEach((vpn, index) => {
        const num = (categorizedProxies.openvpn?.length || 0) + index + 1;
        message += `${num}. ${vpn.name || 'WireGuard Config'}\n`;
        message += `   ├ 🔧 ${vpn.type}\n`;
        message += `   ├ ⭐ ${vpn.stars || 'N/A'} stars\n`;
        message += `   └ 🔗 <a href="${vpn.url}">GitHub репозиторий</a>\n`;
      });
    }

    // DNS
    if (categorizedProxies.dns?.length > 0) {
      message += `\n🌍 <b>DNS РЕЗОЛВЕРЫ:</b>\n`;
      categorizedProxies.dns.forEach((dns, index) => {
        message += `${index + 1}. <code>${dns.ip}:${dns.port}</code>\n`;
        message += `   ├ 🔧 ${dns.name || dns.source}\n`;
        message += `   ├ ⚡ ${dns.speed}ms\n`;
        message += `   └ 🛡️ ${dns.type}\n`;
      });
    }

    // HTTPS
    if (categorizedProxies.https?.length > 0) {
      message += `\n🔐 <b>HTTPS ПРОКСИ:</b>\n`;
      categorizedProxies.https.slice(0, 5).forEach((proxy, index) => {
        message += this.formatUltraProxyLine(proxy, index + 1);
      });
    }

    message += `\n💡 <b>РЕКОМЕНДАЦИИ 2025:</b>\n`;
    message += `• Элитные — максимальная анонимность\n`;
    message += `• SOCKS5 — Torrent, UDP, игры\n`;
    message += `• MTPROTO — специально для Telegram\n`;
    message += `• VPN-конфиги — безопасное соединение\n`;
    message += `• DNS — быстрый и безопасный поиск\n`;
    message += `• HTTPS — защищенные соединения\n`;
    message += `⚠️ <i>Используйте ответственно. Проверяйте актуальность ресурсов перед использованием.</i>`;

    return message;
  }

  static formatUltraProxyLine(proxy, number) {
    const speedIcon = proxy.speed < 300 ? '⚡' : proxy.speed < 1000 ? '🚀' : '🐢';
    const anonymityIcon = proxy.anonymity === 'elite' ? '🎭' :
                          proxy.anonymity === 'anonymous' ? '👤' : '👁️';
    return `${number}. <code>${proxy.ip}:${proxy.port}</code>\n` +
           `   ├ 🔧 ${proxy.protocol.toUpperCase()}\n` +
           `   ├ ${anonymityIcon} ${proxy.anonymity || 'unknown'}\n` +
           `   ├ ${speedIcon} ${proxy.speed}ms\n` +
           `   ├ 📍 ${proxy.country || 'N/A'}\n` +
           `   └ 🔗 ${proxy.source}\n`;
  }

  static getCategoryIcon(category) {
    const icons = {
      elite: '🎯',
      socks5: '🧦',
      mtproto: '🔐',
      openvpn: '🔒',
      wireguard: '🛡️',
      dns: '🌍',
      https: '🔐',
      anonymous: '👤',
      vpn: '🌐'
    };
    return icons[category] || '🔧';
  }
}