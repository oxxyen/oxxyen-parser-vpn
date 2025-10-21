/**
 * @author oxxyen
 * @description Registry of all proxy/VPN/DNS sources
 */

// === API SOURCES ===
import { fetchProxyScrapeMulti } from './api/proxyscrape.js';
import { fetchGeonodeAdvanced } from './api/geonode.js';
import { fetchHTMLWebAPI } from './api/htmlweb.js';
import { fetchProxyListDownloadAPI } from './api/proxylistdownload.js';

// === HTML PARSING SOURCES ===
import { fetchFreeProxyListUltra } from './html/freeProxyList.js';
import { fetchSpysMeUltra } from './html/spysMe.js';
import { fetchHideMyName } from './html/hidemyName.js';
import { fetchSSLProxies } from './html/sslProxies.js';
import { fetchOpenProxyList } from './html/openProxyList.js';
import { fetchProxyDaily } from './html/proxyDaily.js';

// === COUNTRY-SPECIFIC SOURCES ===
import { fetchUSProxyList } from './country/us.js';
import { fetchUKProxyList } from './country/uk.js';
import { fetchGermanyProxies } from './country/germany.js';
import { fetchJapanProxies } from './country/japan.js';
import { fetchRussiaProxies } from './country/russia.js';

// === VPN & SPECIAL CONFIGS ===
import { fetchVPNGateConfigs } from './vpn/vpngate.js';
import { fetchOpenVPNConfigs } from './vpn/openvpn.js';
import { fetchWireGuardConfigs } from './vpn/wireguard.js';
import { fetchFreeVPNConfigs } from './vpn/freevpn.js';

// === SPECIAL PROTOCOLS ===
import { fetchMTProtoProxies } from './special/mtproto.js';
import { fetchDNSResolversUltra } from './special/dns.js';

// Экспортируем массив всех методов источников
export const sourceMethods = [
  // Основные API
  fetchProxyScrapeMulti,
  fetchGeonodeAdvanced,
  fetchHTMLWebAPI,
  fetchProxyListDownloadAPI,

  // HTML-парсинг
  fetchFreeProxyListUltra,
  fetchSpysMeUltra,
  fetchHideMyName,
  fetchSSLProxies,
  fetchOpenProxyList,
  fetchProxyDaily,

  // Страновые прокси
  fetchUSProxyList,
  fetchUKProxyList,
  fetchGermanyProxies,
  fetchJapanProxies,
  fetchRussiaProxies,

  // VPN
  fetchVPNGateConfigs,
  fetchOpenVPNConfigs,
  fetchWireGuardConfigs,
  fetchFreeVPNConfigs,

  // Специальные
  fetchMTProtoProxies,
  fetchDNSResolversUltra
];