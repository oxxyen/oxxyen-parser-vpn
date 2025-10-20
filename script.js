
/**
 * @author oxxyen
 * @version v0.1
 * @brief main script for vpn and proxy parse
 * @description install npm packages and then node script.js. This script find all open vpn configs, free and pay
 * @channel @oxxyen_dev sucribe please
 */

import { Telegraf } from 'telegraf';
import axios from 'axios';
import * as cheerio from 'cheerio';
import 'dotenv/config';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import dns from 'dns/promises';
import { setTimeout as sleep } from 'timers/promises';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { performance } from 'perf_hooks';

// Плагины для Puppeteer
puppeteer.use(StealthPlugin());

// проверяем работу dotenv
console.log('TELEGRAM_BOT_TOKEN из process.env:', process.env.TELEGRAM_BOT_TOKEN);
console.log('Все env-переменные:', Object.keys(process.env).filter(k => k.startsWith('TELEGRAM')));

// Конфигурация
const CONFIG = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
    SCAN_INTERVAL: parseInt(process.env.SCAN_INTERVAL) || 10,
    MAX_PROXIES: parseInt(process.env.MAX_PROXIES) || 30,
    TIMEOUT: parseInt(process.env.TIMEOUT_MS) || 8000,
    CONCURRENT_CHECKS: parseInt(process.env.CONCURRENT_CHECKS) || 25,
    MAX_SOURCES: parseInt(process.env.MAX_SOURCES) || 60,
    PROXY_CHECK_TIMEOUT: parseInt(process.env.PROXY_CHECK_TIMEOUT) || 10000
};

// Валидация конфигурации
if (!CONFIG.TELEGRAM_BOT_TOKEN) {
    console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не установлен в .env');
    process.exit(1);
}

if (!CONFIG.TELEGRAM_CHANNEL_ID) {
    console.error('❌ Ошибка: TELEGRAM_CHANNEL_ID не установлен в .env');
    process.exit(1);
}

const bot = new Telegraf(CONFIG.TELEGRAM_BOT_TOKEN);

// Расширенная база User-Agents и профилей
const BROWSER_PROFILES = [
    {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        acceptLanguage: 'en-US,en;q=0.9,ru;q=0.8',
        secFetchDest: 'document',
        viewport: { width: 1920, height: 1080 }
    },
    {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        acceptLanguage: 'en-GB,en;q=0.9',
        secFetchDest: 'document',
        viewport: { width: 1440, height: 900 }
    },
    {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        acceptLanguage: 'en-US,en;q=0.5',
        secFetchDest: 'document',
        viewport: { width: 1366, height: 768 }
    }
];

class ResourceManager {
    constructor() {
        this.browsers = new Set();
        this.agents = new Map();
    }

    async createBrowser() {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=VizDisplayCompositor',
                '--window-size=1920,1080',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });
        this.browsers.add(browser);
        return browser;
    }

    async closeAllBrowsers() {
        for (const browser of this.browsers) {
            try {
                await browser.close();
            } catch (error) {
                console.warn('⚠️ Ошибка при закрытии браузера:', error.message);
            }
        }
        this.browsers.clear();
    }

    getProxyAgent(proxy) {
        const key = `${proxy.protocol}://${proxy.ip}:${proxy.port}`;
        if (!this.agents.has(key)) {
            try {
                const agent = proxy.protocol.startsWith('socks') 
                    ? new SocksProxyAgent(key)
                    : new HttpsProxyAgent(key);
                this.agents.set(key, agent);
            } catch (error) {
                return null;
            }
        }
        return this.agents.get(key);
    }

    clearAgents() {
        this.agents.clear();
    }
}

class AdvancedProxyScanner {
    constructor() {
        this.resourceManager = new ResourceManager();
        this.stats = {
            totalFound: 0,
            workingProxies: 0,
            failedSources: 0,
            scanDuration: 0,
            sourcesUsed: 0,
            categoriesFound: {}
        };
        this.cache = new Map();
        this.proxyCategories = {
            elite: [], anonymous: [], transparent: [],
            socks4: [], socks5: [], vpn: [], dns: [],
            http: [], https: [], residential: [],
            mtproto: [], wireguard: [], openvpn: []
        };
    }

    getRandomBrowserProfile() {
        return BROWSER_PROFILES[Math.floor(Math.random() * BROWSER_PROFILES.length)];
    }

    async humanDelay(min = 1000, max = 3000) {
        await sleep(min + Math.random() * (max - min));
    }

    // УЛЬТРА-БЫСТРАЯ ПРОВЕРКА ПРОКСИ
    async ultraProxyTest(proxy) {
        const testConfigs = [
            {
                url: 'https://httpbin.org/ip',
                validator: (data, proxy) => data.origin === proxy.ip
            },
            {
                url: 'https://api.ipify.org?format=json',
                validator: (data, proxy) => data.ip === proxy.ip
            },
            {
                url: 'https://ident.me/json',
                validator: (data, proxy) => data.ip === proxy.ip
            }
        ];

        const results = [];
        for (const test of testConfigs) {
            try {
                const startTime = performance.now();
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

                const profile = this.getRandomBrowserProfile();
                const config = {
                    method: 'GET',
                    url: test.url,
                    timeout: CONFIG.TIMEOUT,
                    signal: controller.signal,
                    headers: {
                        'User-Agent': profile.userAgent,
                        'Accept': profile.accept,
                        'Accept-Language': profile.acceptLanguage
                    },
                    validateStatus: () => true
                };

                // Добавляем прокси в конфиг
                if (proxy.protocol.startsWith('socks')) {
                    config.httpsAgent = this.resourceManager.getProxyAgent(proxy);
                    config.httpAgent = this.resourceManager.getProxyAgent(proxy);
                } else {
                    config.proxy = {
                        protocol: proxy.protocol,
                        host: proxy.ip,
                        port: parseInt(proxy.port)
                    };
                }

                const response = await axios(config);
                clearTimeout(timeoutId);

                const speed = performance.now() - startTime;
                const success = response.status === 200 && test.validator(response.data, proxy);
                
                results.push({
                    success,
                    speed,
                    status: response.status,
                    test: test.url
                });

            } catch (error) {
                results.push({
                    success: false,
                    speed: CONFIG.TIMEOUT,
                    error: error.message,
                    test: test.url
                });
            }
            await this.humanDelay(200, 500);
        }

        const successfulTests = results.filter(r => r.success);
        if (successfulTests.length >= 2) {
            const avgSpeed = successfulTests.reduce((sum, test) => sum + test.speed, 0) / successfulTests.length;
            return {
                ...proxy,
                working: true,
                speed: Math.round(avgSpeed),
                successRate: (successfulTests.length / testConfigs.length) * 100,
                lastChecked: new Date().toISOString(),
                tests: results
            };
        }

        return { ...proxy, working: false, tests: results };
    }

    // 🔄 РАСШИРЕННАЯ МНОГОПОТОЧНАЯ ОБРАБОТКА
    async processProxiesUltraFast(proxies) {
        const results = [];
        const batchSize = CONFIG.CONCURRENT_CHECKS;
        
        console.log(`🔧 Проверяем ${proxies.length} прокси батчами по ${batchSize}...`);

        for (let i = 0; i < proxies.length; i += batchSize) {
            const batch = proxies.slice(i, i + batchSize);
            const batchPromises = batch.map(proxy => 
                this.ultraProxyTest(proxy)
                    .catch(error => ({ 
                        ...proxy, 
                        working: false, 
                        error: error.message 
                    }))
            );
            
            const batchResults = await Promise.all(batchPromises);
            const workingBatch = batchResults.filter(r => r.working);
            results.push(...workingBatch);
            
            console.log(`📊 Батч ${Math.floor(i/batchSize) + 1}: ${workingBatch.length}/${batch.length} рабочих`);
            
            await this.humanDelay(300, 800);
        }

        return results;
    }

    // 🌐 РАСШИРЕННЫЕ ИСТОЧНИКИ ДАННЫХ
    async fetchAllSources() {
        const sourceMethods = [
            // Основные источники прокси
            () => this.fetchProxyScrapeMulti(),
            () => this.fetchGeonodeAdvanced(),
            () => this.fetchFreeProxyListUltra(),
            () => this.fetchSpysMeUltra(),
            () => this.fetchHideMyName(),
            () => this.fetchSSLProxies(),
            () => this.fetchOpenProxyList(),
            () => this.fetchProxyDaily(),
            
            // API источники
            () => this.fetchHTMLWebAPI(),
            () => this.fetchProxyListDownloadAPI(),
            
            // Страновые прокси
            () => this.fetchUSProxyList(),
            () => this.fetchUKProxyList(),
            () => this.fetchGermanyProxies(),
            () => this.fetchJapanProxies(),
            () => this.fetchRussiaProxies(),
            
            // VPN конфиги
            () => this.fetchVPNGateConfigs(),
            () => this.fetchOpenVPNConfigs(),
            () => this.fetchWireGuardConfigs(),
            () => this.fetchFreeVPNConfigs(),
            
            // DNS и специальные прокси
            () => this.fetchDNSResolversUltra(),
            () => this.fetchMTProtoProxies()
        ];

        console.log(`🌐 Запускаем ${sourceMethods.length} источников...`);
        
        const results = await Promise.allSettled(
            sourceMethods.map(method => method())
        );

        let allProxies = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const proxies = result.value;
                allProxies.push(...proxies);
                this.stats.sourcesUsed++;
                
                if (proxies.length > 0) {
                    console.log(`✅ ${sourceMethods[index].name}: ${proxies.length} найдено`);
                }
            } else {
                this.stats.failedSources++;
                console.warn(`⚠️ ${sourceMethods[index].name}: ${result.reason.message}`);
            }
        });

        // Удаляем дубликаты
        const uniqueMap = new Map();
        allProxies.forEach(p => {
            const key = `${p.ip}:${p.port}:${p.protocol}:${p.source}`;
            if (!uniqueMap.has(key)) uniqueMap.set(key, p);
        });
        
        const uniqueProxies = Array.from(uniqueMap.values());
        this.stats.totalFound = uniqueProxies.length;
        
        console.log(`📥 Итого уникальных ресурсов: ${uniqueProxies.length}`);
        
        return uniqueProxies;
    }

    // 🎯 API ИСТОЧНИКИ 
    async fetchHTMLWebAPI() {
        const proxies = [];
        try {
            // Используем API из поисковых результатов :cite[5]
            const response = await axios.get(
                'http://htmlweb.ru/json/proxy/get?perpage=50&work=1', 
                { timeout: 10000 }
            );
            
            if (response.data && typeof response.data === 'object') {
                Object.values(response.data).forEach(item => {
                    if (item.name && item.work) {
                        const [ip, port] = item.name.split(':');
                        proxies.push({
                            ip,
                            port,
                            protocol: (item.type || 'http').toLowerCase(),
                            source: 'htmlweb.ru',
                            country: item.country,
                            speed: item.speed || 0,
                            anonymity: 'unknown'
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('⚠️ HTMLWeb API недоступен:', error.message);
        }
        return proxies;
    }

    async fetchProxyListDownloadAPI() {
        const proxies = [];
        try {
            // Используем API вместо парсинга :cite[1]
            const types = ['http', 'https', 'socks4', 'socks5'];
            for (const type of types) {
                try {
                    const response = await axios.get(
                        `https://www.proxy-list.download/api/v1/get?type=${type}`,
                        { timeout: 15000 }
                    );
                    
                    if (response.data) {
                        const lines = response.data.split('\n');
                        lines.forEach(line => {
                            const match = line.trim().match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
                            if (match) {
                                proxies.push({
                                    ip: match[1],
                                    port: match[2],
                                    protocol: type,
                                    source: 'proxy-list.download',
                                    anonymity: 'unknown'
                                });
                            }
                        });
                    }
                    await this.humanDelay(500, 1000);
                } catch (error) {
                    console.warn(`⚠️ ProxyListDownload API (${type}) недоступен`);
                }
            }
        } catch (error) {
            console.warn('⚠️ ProxyListDownload API полностью недоступен');
        }
        return proxies;
    }

    async fetchProxyScrapeMulti() {
        const proxies = [];
        const protocols = [
            { type: 'http', url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all' },
            { type: 'socks4', url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks4&timeout=10000&country=all&ssl=all&anonymity=all' },
            { type: 'socks5', url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks5&timeout=10000&country=all&ssl=all&anonymity=all' }
        ];
        
        for (const protocol of protocols) {
            try {
                const response = await axios.get(protocol.url, { timeout: 15000 });
                const lines = response.data.split('\n');
                
                lines.forEach(line => {
                    const match = line.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
                    if (match) {
                        proxies.push({
                            ip: match[1],
                            port: match[2],
                            protocol: protocol.type,
                            source: 'proxyscrape.com',
                            anonymity: 'unknown'
                        });
                    }
                });
                
                await this.humanDelay(300, 700);
            } catch (error) {
                console.warn(`⚠️ ProxyScrape (${protocol.type}) недоступен`);
            }
        }
        return proxies;
    }

    // 🔒 VPN И MTPROTO ИСТОЧНИКИ
    async fetchMTProtoProxies() {
        const proxies = [];
        try {
            // Используем официальные источники MTProxy :cite[4]
            const response = await axios.get(
                'https://core.telegram.org/getProxyConfig',
                { timeout: 20000 }
            );
            
            // Парсим конфиг MTProto прокси
            const lines = response.data.split('\n');
            lines.forEach(line => {
                if (line.includes('://')) {
                    try {
                        const url = new URL(line.trim());
                        proxies.push({
                            ip: url.hostname,
                            port: url.port || '443',
                            protocol: 'mtproto',
                            source: 'telegram-official',
                            type: 'MTProto',
                            secret: url.password || 'unknown'
                        });
                    } catch (e) {
                        // Пропускаем некорректные строки
                    }
                }
            });
        } catch (error) {
            console.warn('⚠️ MTProto proxies недоступны');
        }
        return proxies;
    }

    async fetchVPNGateConfigs() {
        const configs = [];
        try {
            const response = await axios.get('http://www.vpngate.net/api/iphone/', {
                timeout: 25000,
                headers: {
                    'User-Agent': this.getRandomBrowserProfile().userAgent
                }
            });
            
            const lines = response.data.split('\n');
            for (const line of lines.slice(2, 20)) { // Берем больше конфигов
                if (line && !line.startsWith('*')) {
                    const fields = line.split(',');
                    if (fields.length > 14) {
                        configs.push({
                            type: 'OpenVPN',
                            host: fields[1],
                            ip: fields[2],
                            country: fields[5],
                            speed: parseInt(fields[3]) || 0,
                            ping: parseInt(fields[4]) || 0,
                            config: `http://www.vpngate.net/common/openvpn_download.aspx?sid=156&host=${fields[1]}&ip=${fields[2]}`,
                            source: 'vpngate.net'
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ VPNGate недоступен:', error.message);
        }
        return configs;
    }

    async fetchOpenVPNConfigs() {
        const configs = [];
        try {
            const response = await axios.get(
                'https://api.github.com/search/repositories?q=openvpn+config+filename:.ovpn&sort=updated&per_page=15',
                {
                    timeout: 15000,
                    headers: {
                        'User-Agent': this.getRandomBrowserProfile().userAgent,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            response.data.items.forEach(repo => {
                configs.push({
                    type: 'OpenVPN',
                    name: repo.name,
                    url: repo.html_url,
                    source: 'github.com',
                    description: repo.description,
                    stars: repo.stargazers_count,
                    updated: repo.updated_at
                });
            });
        } catch (error) {
            console.warn('⚠️ OpenVPN configs (GitHub) недоступны');
        }
        return configs;
    }

    async fetchWireGuardConfigs() {
        const configs = [];
        try {
            const response = await axios.get(
                'https://api.github.com/search/repositories?q=wireguard+config+filename:.conf&sort=stars&per_page=10',
                {
                    timeout: 15000,
                    headers: {
                        'User-Agent': this.getRandomBrowserProfile().userAgent,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            response.data.items.forEach(repo => {
                configs.push({
                    type: 'WireGuard',
                    name: repo.name,
                    url: repo.html_url,
                    source: 'github.com',
                    description: repo.description,
                    stars: repo.stargazers_count
                });
            });
        } catch (error) {
            console.warn('⚠️ WireGuard configs недоступны');
        }
        return configs;
    }

    // 🌐 DNS РЕЗОЛВЕРЫ
    async fetchDNSResolversUltra() {
        const resolvers = [
            { ip: '208.67.222.222', port: '53', protocol: 'dns', source: 'opendns', type: 'public', name: 'OpenDNS' },
            { ip: '8.8.8.8', port: '53', protocol: 'dns', source: 'google-dns', type: 'public', name: 'Google DNS' },
            { ip: '1.1.1.1', port: '53', protocol: 'dns', source: 'cloudflare-dns', type: 'public', name: 'Cloudflare DNS' },
            { ip: '9.9.9.9', port: '53', protocol: 'dns', source: 'quad9-dns', type: 'public', name: 'Quad9 DNS' },
            { ip: '94.140.14.14', port: '53', protocol: 'dns', source: 'adguard-dns', type: 'public', name: 'AdGuard DNS' },
            { ip: '185.228.168.168', port: '53', protocol: 'dns', source: 'cleanbrowsing', type: 'public', name: 'CleanBrowsing' }
        ];
        
        const workingResolvers = [];
        for (const resolver of resolvers) {
            try {
                const startTime = performance.now();
                await dns.setServers([resolver.ip]);
                await dns.resolve('google.com');
                const speed = performance.now() - startTime;
                
                workingResolvers.push({ 
                    ...resolver, 
                    working: true, 
                    speed: Math.round(speed),
                    lastChecked: new Date().toISOString()
                });
            } catch (error) {
                // Пропускаем нерабочие резолверы
            }
            await this.humanDelay(100, 300);
        }
        
        return workingResolvers;
    }

    // 🎯 ОСНОВНЫЕ МЕТОДЫ ПАРСИНГА
    async fetchFreeProxyListUltra() {
        const proxies = [];
        let browser;
        
        try {
            browser = await this.resourceManager.createBrowser();
            const page = await browser.newPage();
            const profile = this.getRandomBrowserProfile();
            
            await page.setUserAgent(profile.userAgent);
            await page.setViewport(profile.viewport);
            
            // Обход детекта автоматизации
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'ru'] });
            });

            await page.goto('https://free-proxy-list.net/', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await this.humanDelay(2000, 4000);

            const proxyData = await page.evaluate(() => {
                const proxies = [];
                const rows = document.querySelectorAll('#proxylisttable tbody tr');
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 8) {
                        proxies.push({
                            ip: cells[0].textContent.trim(),
                            port: cells[1].textContent.trim(),
                            protocol: cells[6].textContent.trim() === 'yes' ? 'https' : 'http',
                            anonymity: cells[4].textContent.trim(),
                            country: cells[2].textContent.trim(),
                            code: cells[3].textContent.trim()
                        });
                    }
                });
                
                return proxies;
            });

            proxies.push(...proxyData.map(p => ({
                ...p,
                source: 'free-proxy-list.net'
            })));

        } catch (error) {
            console.warn('⚠️ FreeProxyList недоступен:', error.message);
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (error) {
                    // Игнорируем ошибки закрытия
                }
            }
        }
        return proxies;
    }

    async fetchGeonodeAdvanced() {
        const proxies = [];
        try {
            const response = await axios.get(
                'https://proxylist.geonode.com/api/proxy-list?limit=150&page=1&sort_by=lastChecked&sort_type=desc',
                {
                    timeout: 20000,
                    headers: { 
                        'User-Agent': this.getRandomBrowserProfile().userAgent,
                        'Accept': 'application/json'
                    }
                }
            );
            
            response.data.data.forEach(proxy => {
                proxies.push({
                    ip: proxy.ip,
                    port: proxy.port,
                    protocol: proxy.protocols[0] || 'http',
                    source: 'geonode.com',
                    country: proxy.country,
                    anonymity: proxy.anonymityLevel,
                    speed: proxy.speed,
                    uptime: proxy.uptime,
                    responseTime: proxy.responseTime,
                    lastChecked: proxy.updatedAt
                });
            });
        } catch (error) {
            console.warn('⚠️ Geonode недоступен:', error.message);
        }
        return proxies;
    }

    async fetchSpysMeUltra() {
        const proxies = [];
        try {
            const response = await axios.get('https://spys.me/proxy.txt', {
                timeout: 15000,
                headers: { 'User-Agent': this.getRandomBrowserProfile().userAgent }
            });
            
            const lines = response.data.split('\n');
            for (const line of lines) {
                if (line.includes('HTTP') && !line.includes('(')) {
                    const match = line.match(/(\d+\.\d+\.\d+\.\d+):(\d+)\s+(\w+)-(\w)/);
                    if (match) {
                        proxies.push({
                            ip: match[1],
                            port: match[2],
                            protocol: match[4] === 'S' ? 'socks5' : 'http',
                            source: 'spys.me',
                            anonymity: match[3] === 'A' ? 'high' : 'medium'
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Spys.me недоступен');
        }
        return proxies.slice(0, 30);
    }

    async fetchHideMyName() {
        const proxies = [];
        try {
            const response = await axios.get('https://hidemy.name/ru/proxy-list/', {
                timeout: 15000,
                headers: { 'User-Agent': this.getRandomBrowserProfile().userAgent }
            });
            
            const $ = cheerio.load(response.data);
            $('.table_block tbody tr').each((i, row) => {
                const cells = $(row).find('td');
                if (cells.length >= 6) {
                    const ip = cells.eq(0).text().trim();
                    const port = cells.eq(1).text().trim();
                    if (ip && port) {
                        proxies.push({
                            ip,
                            port,
                            protocol: 'http',
                            source: 'hidemy.name',
                            country: cells.eq(2).text().trim(),
                            speed: parseInt(cells.eq(3).text().replace('ms', '')) || 0
                        });
                    }
                }
            });
        } catch (error) {
            console.warn('⚠️ HideMyName недоступен');
        }
        return proxies;
    }

    // 🌍 СТРАНОВЫЕ ПРОКСИ
    async fetchCountryProxies(countryCode, countryName) {
        const proxies = [];
        try {
            // Используем API для получения страновых прокси
            const response = await axios.get(
                `http://htmlweb.ru/json/proxy/get?country=${countryCode}&perpage=20&work=1`,
                { timeout: 10000 }
            );
            
            if (response.data && typeof response.data === 'object') {
                Object.values(response.data).forEach(item => {
                    if (item.name && item.work && item.country === countryCode) {
                        const [ip, port] = item.name.split(':');
                        proxies.push({
                            ip,
                            port,
                            protocol: (item.type || 'http').toLowerCase(),
                            source: `htmlweb-${countryCode}`,
                            country: countryName,
                            speed: item.speed || 0
                        });
                    }
                });
            }
        } catch (error) {
            // Бесшумно пропускаем ошибки страновых прокси
        }
        return proxies;
    }

    async fetchUSProxyList() { return this.fetchCountryProxies('US', 'United States'); }
    async fetchUKProxyList() { return this.fetchCountryProxies('GB', 'United Kingdom'); }
    async fetchGermanyProxies() { return this.fetchCountryProxies('DE', 'Germany'); }
    async fetchJapanProxies() { return this.fetchCountryProxies('JP', 'Japan'); }
    async fetchRussiaProxies() { return this.fetchCountryProxies('RU', 'Russia'); }

    async fetchSSLProxies() {
        const proxies = [];
        try {
            const response = await axios.get('https://www.sslproxies.org/', {
                timeout: 15000,
                headers: { 'User-Agent': this.getRandomBrowserProfile().userAgent }
            });
            
            const $ = cheerio.load(response.data);
            $('#proxylisttable tbody tr').each((i, el) => {
                const tds = $(el).find('td');
                if (tds.length >= 7) {
                    const ip = tds.eq(0).text().trim();
                    const port = tds.eq(1).text().trim();
                    const https = tds.eq(6).text().trim() === 'yes';
                    if (ip && port) {
                        proxies.push({
                            ip,
                            port,
                            protocol: https ? 'https' : 'http',
                            source: 'sslproxies.org',
                            country: tds.eq(3).text().trim(),
                            anonymity: tds.eq(4).text().trim()
                        });
                    }
                }
            });
        } catch (error) {
            console.warn('⚠️ SSLProxies недоступен');
        }
        return proxies;
    }

    async fetchOpenProxyList() {
        const proxies = [];
        try {
            const response = await axios.get(
                'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
                { timeout: 15000 }
            );
            
            const lines = response.data.split('\n');
            for (const line of lines) {
                const match = line.trim().match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
                if (match) {
                    proxies.push({ 
                        ip: match[1], 
                        port: match[2], 
                        protocol: 'http', 
                        source: 'github-open-proxy' 
                    });
                }
            }
        } catch (error) {
            console.warn('⚠️ OpenProxyList недоступен');
        }
        return proxies;
    }

    async fetchProxyDaily() {
        const proxies = [];
        try {
            const response = await axios.get('https://www.proxydaily.com/', {
                timeout: 15000,
                headers: { 'User-Agent': this.getRandomBrowserProfile().userAgent }
            });
            
            const $ = cheerio.load(response.data);
            // Улучшенный парсинг для ProxyDaily
            $('.proxy-list table tbody tr, table.proxy tbody tr').each((i, el) => {
                const tds = $(el).find('td');
                if (tds.length >= 2) {
                    const ip = tds.eq(0).text().trim();
                    const port = tds.eq(1).text().trim();
                    if (ip && port && ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
                        proxies.push({ 
                            ip, 
                            port, 
                            protocol: 'http', 
                            source: 'proxydaily.com' 
                        });
                    }
                }
            });
        } catch (error) {
            console.warn('⚠️ ProxyDaily недоступен');
        }
        return proxies;
    }

    async fetchFreeVPNConfigs() {
        const configs = [];
        try {
            const response = await axios.get(
                'https://api.github.com/search/repositories?q=free+vpn+config+filename:.ovpn+OR+filename:.conf&sort=stars&per_page=10',
                {
                    timeout: 15000,
                    headers: {
                        'User-Agent': this.getRandomBrowserProfile().userAgent,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            response.data.items.forEach(repo => {
                configs.push({
                    type: 'FreeVPN',
                    name: repo.name,
                    url: repo.html_url,
                    source: 'github.com',
                    description: repo.description,
                    stars: repo.stargazers_count
                });
            });
        } catch (error) {
            console.warn('⚠️ FreeVPN configs недоступны');
        }
        return configs;
    }

    // 🚀 ОСНОВНОЙ МЕТОД СКАНИРОВАНИЯ
    async comprehensiveUltraScan() {
        console.log('🚀 Запуск ультра-сканирования...');
        const startTime = performance.now();
        
        try {
            const allProxies = await this.fetchAllSources();
            console.log(`📥 Найдено ${allProxies.length} ресурсов. Начинаем ультра-проверку...`);
            
            // Фильтруем и ограничиваем количество для проверки
            const proxiesToCheck = allProxies
                .filter(proxy => proxy.ip && proxy.port)
                .slice(0, 300); // Увеличили лимит проверки
            
            const workingProxies = await this.processProxiesUltraFast(proxiesToCheck);
            this.categorizeProxiesUltra(workingProxies);
            
            this.stats.workingProxies = workingProxies.length;
            this.stats.scanDuration = performance.now() - startTime;
            
            // Статистика по категориям
            Object.keys(this.proxyCategories).forEach(category => {
                this.stats.categoriesFound[category] = this.proxyCategories[category].length;
            });

            console.log(`✅ Сканирование завершено за ${Math.round(this.stats.scanDuration / 1000)}с`);
            console.log(`📊 Результаты: ${workingProxies.length} рабочих ресурсов`);
            
            return this.getTopProxiesByCategory();
            
        } catch (error) {
            console.error('💥 Критическая ошибка при сканировании:', error);
            return this.getTopProxiesByCategory(); // Возвращаем пустые результаты
        } finally {
            // Очищаем ресурсы
            await this.resourceManager.closeAllBrowsers();
            this.resourceManager.clearAgents();
        }
    }

    categorizeProxiesUltra(proxies) {
        // Сбрасываем категории
        this.proxyCategories = {
            elite: [], anonymous: [], transparent: [],
            socks4: [], socks5: [], vpn: [], dns: [],
            http: [], https: [], residential: [],
            mtproto: [], wireguard: [], openvpn: []
        };

        proxies.forEach(proxy => {
            // Сортируем по протоколам
            if (proxy.protocol === 'socks4') {
                this.proxyCategories.socks4.push(proxy);
            } else if (proxy.protocol === 'socks5') {
                this.proxyCategories.socks5.push(proxy);
            } else if (proxy.protocol === 'https') {
                this.proxyCategories.https.push(proxy);
            } else if (proxy.protocol === 'http') {
                this.proxyCategories.http.push(proxy);
            } else if (proxy.protocol === 'dns') {
                this.proxyCategories.dns.push(proxy);
            } else if (proxy.protocol === 'mtproto') {
                this.proxyCategories.mtproto.push(proxy);
            }
            
            // Сортируем по анонимности
            if (proxy.anonymity === 'elite' || proxy.anonymity === 'high') {
                this.proxyCategories.elite.push(proxy);
            } else if (proxy.anonymity === 'anonymous') {
                this.proxyCategories.anonymous.push(proxy);
            } else {
                this.proxyCategories.transparent.push(proxy);
            }
            
            // VPN конфиги
            if (proxy.type === 'OpenVPN') {
                this.proxyCategories.openvpn.push(proxy);
            } else if (proxy.type === 'WireGuard') {
                this.proxyCategories.wireguard.push(proxy);
            } else if (proxy.type === 'FreeVPN') {
                this.proxyCategories.vpn.push(proxy);
            }
            
            // VPN-прокси по скорости и анонимности
            if (proxy.speed < 1000 && (proxy.anonymity === 'elite' || proxy.anonymity === 'high')) {
                this.proxyCategories.vpn.push(proxy);
            }
        });

        // Сортируем каждую категорию по скорости
        Object.keys(this.proxyCategories).forEach(category => {
            this.proxyCategories[category].sort((a, b) => (a.speed || 9999) - (b.speed || 9999));
        });
    }

    getTopProxiesByCategory() {
        const result = {};
        const limits = {
            elite: 10, anonymous: 8, transparent: 5,
            socks4: 8, socks5: 10, vpn: 12, dns: 6,
            http: 8, https: 8, residential: 5,
            mtproto: 8, wireguard: 6, openvpn: 8
        };

        for (const [category, proxies] of Object.entries(this.proxyCategories)) {
            result[category] = proxies.slice(0, limits[category] || 5);
        }
        return result;
    }

    // 🛡️ БЕЗОПАСНОЕ ЗАВЕРШЕНИЕ
    async cleanup() {
        await this.resourceManager.closeAllBrowsers();
        this.resourceManager.clearAgents();
    }
}

// 💫 УЛЬТРА-СОВРЕМЕННЫЙ ФОРМАТТЕР СООБЩЕНИЙ
class UltraMessageFormatter {
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
        message += `⏰ <i>${now} (МСК)</i>\n\n`;
        
        message += `📊 <b>СТАТИСТИКА СКАНИРОВАНИЯ:</b>\n`;
        message += `├ 📥 Найдено: ${stats.totalFound} ресурсов\n`;
        message += `├ ✅ Рабочих: ${stats.workingProxies} прокси\n`;
        message += `├ 🌐 Источников: ${stats.sourcesUsed} использовано\n`;
        message += `├ ⚠️ Ошибок: ${stats.failedSources} источников\n`;
        message += `└ ⚡ Длительность: ${Math.round(stats.scanDuration / 1000)}с\n\n`;

        // Статистика по категориям
        const categoryStats = Object.entries(stats.categoriesFound || {})
            .filter(([_, count]) => count > 0)
            .map(([category, count]) => `${this.getCategoryIcon(category)} ${category}: ${count}`)
            .join(' | ');
        
        if (categoryStats) {
            message += `📈 <b>КАТЕГОРИИ:</b> ${categoryStats}\n\n`;
        }

        // Элитные прокси
        if (categorizedProxies.elite.length > 0) {
            message += `🎯 <b>ЭЛИТНЫЕ ПРОКСИ (HIGH ANONYMOUS):</b>\n`;
            categorizedProxies.elite.forEach((proxy, index) => {
                message += this.formatUltraProxyLine(proxy, index + 1);
            });
            message += '\n';
        }

        // SOCKS5 прокси
        if (categorizedProxies.socks5.length > 0) {
            message += `🧦 <b>SOCKS5 ПРОКСИ:</b>\n`;
            categorizedProxies.socks5.forEach((proxy, index) => {
                message += this.formatUltraProxyLine(proxy, index + 1);
            });
            message += '\n';
        }

        // MTPROTO прокси для Telegram
        if (categorizedProxies.mtproto.length > 0) {
            message += `🔐 <b>TELEGRAM MTPROTO ПРОКСИ:</b>\n`;
            categorizedProxies.mtproto.forEach((proxy, index) => {
                message += `${index + 1}. <code>${proxy.ip}:${proxy.port}</code>\n`;
                message += `   ├ 🔧 ${proxy.type || 'MTProto'}\n`;
                message += `   ├ 🔑 ${proxy.secret ? 'Есть секрет' : 'Без секрета'}\n`;
                message += `   └ 🔗 ${proxy.source}\n\n`;
            });
            message += '\n';
        }

        // VPN конфиги
        if (categorizedProxies.openvpn.length > 0 || categorizedProxies.wireguard.length > 0) {
            message += `🔒 <b>VPN КОНФИГУРАЦИИ:</b>\n`;
            
            // OpenVPN
            categorizedProxies.openvpn.forEach((vpn, index) => {
                message += `${index + 1}. ${vpn.host || vpn.name || 'OpenVPN Config'}\n`;
                message += `   ├ 🌍 ${vpn.country || 'Multiple'}\n`;
                message += `   ├ 🔧 ${vpn.type}\n`;
                message += `   ├ ⚡ ${vpn.speed || vpn.ping || 'N/A'} ${vpn.speed ? 'Mbps' : 'ms'}\n`;
                if (vpn.config) {
                    message += `   └ 📎 <a href="${vpn.config}">Скачать OpenVPN конфиг</a>\n\n`;
                } else if (vpn.url) {
                    message += `   └ 🔗 <a href="${vpn.url}">GitHub репозиторий</a>\n\n`;
                } else {
                    message += `   └ 🔗 ${vpn.source}\n\n`;
                }
            });
            
            // WireGuard
            categorizedProxies.wireguard.forEach((vpn, index) => {
                const num = categorizedProxies.openvpn.length + index + 1;
                message += `${num}. ${vpn.name || 'WireGuard Config'}\n`;
                message += `   ├ 🔧 ${vpn.type}\n`;
                message += `   ├ ⭐ ${vpn.stars || 'N/A'} stars\n`;
                message += `   └ 🔗 <a href="${vpn.url}">GitHub репозиторий</a>\n\n`;
            });
            
            message += '\n';
        }

        // DNS резолверы
        if (categorizedProxies.dns.length > 0) {
            message += `🌍 <b>DNS РЕЗОЛВЕРЫ:</b>\n`;
            categorizedProxies.dns.forEach((dns, index) => {
                message += `${index + 1}. <code>${dns.ip}:${dns.port}</code>\n`;
                message += `   ├ 🔧 ${dns.name || dns.source}\n`;
                message += `   ├ ⚡ ${dns.speed}ms\n`;
                message += `   └ 🛡️ ${dns.type}\n\n`;
            });
            message += '\n';
        }

        // HTTPS прокси
        if (categorizedProxies.https.length > 0) {
            message += `🔐 <b>HTTPS ПРОКСИ:</b>\n`;
            categorizedProxies.https.slice(0, 5).forEach((proxy, index) => {
                message += this.formatUltraProxyLine(proxy, index + 1);
            });
            message += '\n';
        }

        message += `💡 <b>РЕКОМЕНДАЦИИ 2025:</b>\n`;
        message += `• Элитные - максимальная анонимность\n`;
        message += `• SOCKS5 - Torrent, UDP, игры\n`;
        message += `• MTPROTO - специально для Telegram\n`;
        message += `• VPN-конфиги - безопасное соединение\n`;
        message += `• DNS - быстрый и безопасный поиск\n`;
        message += `• HTTPS - защищенные соединения\n\n`;
        
        message += `⚠️ <i>Используйте ответственно. Проверяйте актуальность ресурсов перед использованием.</i>`;

        return message;
    }

    static formatUltraProxyLine(proxy, number) {
        const speedIcon = proxy.speed < 300 ? '⚡' : 
                         proxy.speed < 1000 ? '🚀' : '🐢';
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
            anonymous: '👤'
        };
        return icons[category] || '🔧';
    }
}

// 🎯 ГЛАВНЫЙ КЛАСС БОТА
class UltraTelegramBot {
    constructor() {
        this.scanner = new AdvancedProxyScanner();
        this.bot = new Telegraf(CONFIG.TELEGRAM_BOT_TOKEN);
        this.isRunning = false;
        this.cycleCount = 0;
    }

    async validateChat() {
        try {
            await this.bot.telegram.getChat(CONFIG.TELEGRAM_CHANNEL_ID);
            return true;
        } catch (error) {
            console.error('❌ Ошибка валидации чата:', error.message);
            return false;
        }
    }

    async sendUltraResults() {
        this.cycleCount++;
        console.log(`\n🔄 Цикл #${this.cycleCount} запущен...`);

        if (!await this.validateChat()) {
            console.error('❌ Чат невалиден. Проверьте TELEGRAM_CHANNEL_ID');
            return false;
        }

        try {
            const scanResults = await this.scanner.comprehensiveUltraScan();
            const message = UltraMessageFormatter.formatUltraResults(
                scanResults, 
                this.scanner.stats
            );
            
            // Разбиваем сообщение если оно слишком длинное
            const maxLength = 4096;
            if (message.length > maxLength) {
                const parts = [];
                let currentPart = '';
                const lines = message.split('\n');
                
                for (const line of lines) {
                    if (currentPart.length + line.length + 1 > maxLength) {
                        parts.push(currentPart);
                        currentPart = line + '\n';
                    } else {
                        currentPart += line + '\n';
                    }
                }
                if (currentPart) parts.push(currentPart);
                
                for (let i = 0; i < parts.length; i++) {
                    await this.bot.telegram.sendMessage(CONFIG.TELEGRAM_CHANNEL_ID, 
                        `${parts[i]}${i === parts.length - 1 ? '' : '\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯'}`,
                        {
                            parse_mode: 'HTML',
                            disable_web_page_preview: true,
                            disable_notification: i > 0
                        }
                    );
                    if (i < parts.length - 1) await sleep(1000);
                }
            } else {
                await this.bot.telegram.sendMessage(CONFIG.TELEGRAM_CHANNEL_ID, message, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    disable_notification: false
                });
            }
            
            console.log(`✅ Ультра-отчет отправлен: ${this.scanner.stats.workingProxies} рабочих ресурсов`);
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка отправки ультра-отчета:', error.message);
            
            // Отправляем сообщение об ошибке
            try {
                await this.bot.telegram.sendMessage(
                    CONFIG.TELEGRAM_CHANNEL_ID,
                    `❌ <b>Ошибка сканирования</b>\n\n<code>${error.message}</code>\n\n⏳ Следующая попытка через ${CONFIG.SCAN_INTERVAL} минут.`,
                    { parse_mode: 'HTML' }
                );
            } catch (e) {
                console.error('❌ Не удалось отправить сообщение об ошибке:', e.message);
            }
            
            return false;
        }
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️ Сканер уже запущен');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Запуск Ultra Proxy/VPN Scanner 2025...');

        // Отправляем стартовое сообщение
        try {
            await this.bot.telegram.sendMessage(
                CONFIG.TELEGRAM_CHANNEL_ID,
                '🚀 <b>Ultra Proxy/VPN Scanner 2025 активирован!</b>\n\n' +
                '📡 Начинаю регулярное сканирование прокси, VPN конфигов и DNS серверов.\n' +
                `⏰ Интервал сканирования: ${CONFIG.SCAN_INTERVAL} минут\n` +
                '🔒 Использую передовые алгоритмы проверки и обхода блокировок.\n\n' +
                '💎 <i>Ожидайте первый отчет...</i>',
                { parse_mode: 'HTML' }
            );
        } catch (error) {
            console.log('⚠️ Не удалось отправить стартовое сообщение');
        }

        // Основной цикл
        while (this.isRunning) {
            try {
                await this.sendUltraResults();
                
                console.log(`⏳ Ожидаем ${CONFIG.SCAN_INTERVAL} минут до следующего сканирования...`);
                await sleep(CONFIG.SCAN_INTERVAL * 60 * 1000);

            } catch (error) {
                console.error('💥 Ошибка в основном цикле:', error);
                console.log('🔄 Перезапуск через 5 минут...');
                await sleep(5 * 60 * 1000);
            }
        }
    }

    async stop() {
        this.isRunning = false;
        await this.scanner.cleanup();
        console.log('🛑 Ultra Scanner остановлен');
    }
}

// 🛡️ ОБРАБОТКА GRACEFUL SHUTDOWN
process.on('SIGINT', async () => {
    console.log('\n🛑 Получен сигнал прерывания...');
    await bot.telegram.sendMessage(
        CONFIG.TELEGRAM_CHANNEL_ID,
        '🛑 <b>Ultra Proxy/VPN Scanner остановлен</b>\n\nСканирование прервано пользователем.',
        { parse_mode: 'HTML' }
    ).catch(() => {});
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Получен сигнал завершения...');
    await bot.telegram.sendMessage(
        CONFIG.TELEGRAM_CHANNEL_ID,
        '🛑 <b>Ultra Proxy/VPN Scanner остановлен</b>\n\nСканирование завершено.',
        { parse_mode: 'HTML' }
    ).catch(() => {});
    process.exit(0);
});

process.on('uncaughtException', async (error) => {
    console.error('💥 Необработанное исключение:', error);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Необработанный промис:', reason);
});

// 🚀 ЗАПУСК ПРИЛОЖЕНИЯ
async function main() {
    try {
        console.log('🔧 Инициализация Ultra Proxy/VPN Scanner 2025...');
        const bot = new UltraTelegramBot();
        await bot.start();
    } catch (error) {
        console.error('💥 Фатальная ошибка при запуске:', error);
        process.exit(1);
    }
}

// ТОЧКА ВХОДА
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { AdvancedProxyScanner, UltraTelegramBot };