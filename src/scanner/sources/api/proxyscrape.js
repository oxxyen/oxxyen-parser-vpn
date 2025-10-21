// src/scanner/sources/api/proxyscrape.js
import { BaseSource } from '../BaseSource.js';
import axios from 'axios';

export class ProxyScrapeSource extends BaseSource {
  constructor() {
    super('proxyscrape.com', 'proxy');
  }

  async fetch() {
    const protocols = ['http', 'socks4', 'socks5'];
    let all = [];
    for (const p of protocols) {
      try {
        const res = await axios.get(`https://api.proxyscrape.com/...&protocol=${p}`);
        const proxies = res.data.split('\n').map(line => {
          const m = line.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
          return m ? { ip: m[1], port: m[2], protocol: p, source: this.name } : null;
        }).filter(Boolean);
        all.push(...proxies);
      } catch {}
    }
    return all;
  }
}