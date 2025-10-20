# 🌐 Ultra Proxy/VPN Scanner 2025  
> **Автоматический парсер + Telegram-бот для ультра-быстрого поиска рабочих прокси и VPN-конфигураций**

[![OXXYEN AI](https://img.shields.io/badge/OXXYEN%20AI-%D0%98%D0%BD%D1%82%D0%B5%D0%BB%D0%BB%D0%B5%D0%BA%D1%82-%2300f?style=for-the-badge)](https://t.me/oxxy3n)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518.x-green?logo=node.js&style=flat)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)]()

🚀 **Сканирует 30+ источников**  
⚡ **Проверяет прокси с ультра-скоростью**  
🔒 **Собирает OpenVPN, WireGuard, DNS-резолверы**  
🤖 **Автоматически отправляет отчёты в Telegram**

---

## 🔥 Возможности

- **Поддержка всех типов прокси**: HTTP, HTTPS, SOCKS4, SOCKS5  
- **Категоризация по анонимности**: elite, anonymous, transparent  
- **Страновые фильтры**: US, RU, DE, JP, BR, IN и др.  
- **VPN-конфигурации**: OpenVPN, WireGuard из GitHub и VPNGate  
- **DNS-резолверы**: Cloudflare, Google, Quad9, AdGuard  
- **Анти-детект**: Puppeteer + Stealth-плагин + рандомизированные профили  
- **Умный параллелизм**: до 20 проверок одновременно  
- **Telegram-отчёты**: HTML, эмодзи, категории, рекомендации  

---

## 🛠️ Установка

### 1. Клонируйте репозиторий
```bash
git clone https://github.com/oxxy3n/ultra-proxy-scanner.git
cd ultra-proxy-scanner
```
### 2. Установите зависимости
```bash
npm install
```
> Требуется Node.js ≥ 18.x 

### 3. Настройте .env

Создайте файл .env в корне проекта:

```
TELEGRAM_BOT_TOKEN=ваш_токен_от_@BotFather
TELEGRAM_CHANNEL_ID=@ваш_канал_или_-1001234567890
SCAN_INTERVAL=15
MAX_PROXIES=25
TIMEOUT_MS=5000
CONCURRENT_CHECKS=20
MAX_SOURCES=50
```
> 💡 Получите токен у @BotFather
> 💡 Добавьте бота в канал как администратора 

## ▶️ Запуск

```bash
node script.js
```

Бот начнёт:

Собирать прокси из 30+ источников
Проверять их скорость и анонимность
Отправлять красивый отчёт в Telegram каждые SCAN_INTERVAL минут

## 🧠 Источники данных

| Тип       | Источники                                                                 |
|-----------|---------------------------------------------------------------------------|
| **Прокси** | `free-proxy-list.net`, `hidemy.name`, `spys.me`, `proxyscrape.com`, `geonode.com`, GitHub-листы |
| **Страны** | US, GB, DE, JP, RU, CN, BR, IN, KR, FR и др.                              |
| **VPN**    | VPNGate, GitHub (OpenVPN, WireGuard)                                      |
| **DNS**    | Cloudflare (1.1.1.1), Google (8.8.8.8), Quad9 (9.9.9.9), AdGuard          |

---

## 📬 Пример отчёта в Telegram

> 🌐 **ULTRA PROXY/VPN SCANNER 2025**  
> ⏰ *20.10.2025 14:30:22 (МСК)*  
>  
> 📊 **СТАТИСТИКА СКАНИРОВАНИЯ:**  
> ├ 📥 Найдено: 1240 ресурсов  
> ├ ✅ Рабочих: 87 прокси  
> ├ 🌐 Источников: 28 использовано  
> └ ⚡ Длительность: 42с  
>  
> 🎯 **ЭЛИТНЫЕ ПРОКСИ (HIGH ANONYMOUS):**  
> `67.43.236.20:3209`  
> ├ 🔧 HTTPS  
> ├ 🎭 elite proxy  
> ├ ⚡ 210ms  
> ├ 📍 Canada  
> └ 🔗 free-proxy-list.net  
>  
> 🔒 **VPN КОНФИГУРАЦИИ:**  
> vpngate.net  
> ├ 🌍 Japan  
> ├ 🔧 OpenVPN  
> ├ ⚡ 45 Mbps  
> └ 📎 [Скачать конфиг](http://...)

---

## 🛡️ Безопасность

- Все токены хранятся в `.env` (не коммитятся!)  
- Нет внешних API — только прямые запросы к источникам  
- Поддержка HTTPS и анонимных прокси по умолчанию  

---

## 🤝 Поддержка

Если у вас есть идеи, баги или предложения — пишите:  
👤 **[@oxxy3n](https://t.me/oxxy3n)** (техническая поддержка)  
🌐 **OXXYEN AI Project**
