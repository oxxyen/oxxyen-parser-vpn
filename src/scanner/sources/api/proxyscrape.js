import axios from 'axios';
import { humanDelay } from '../../../utils/delay.js';

export async function fetchProxyScrapeMulti() {
  const proxies = [];
  const protocols = ['http', 'socks4', 'socks5'];
  for (const type of protocols) {
    try {
      const res = await axios.get(
        `https://api.proxyscrape.com/v2/?request=getproxies&protocol=${type}&timeout=10000&country=all&ssl=all&anonymity=all`,
        { timeout: 15000 }
      );
      const lines = res.data.split('\n');
      for (const line of lines) {
        const match = line.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
        if (match) {
          proxies.push({ ip: match[1], port: match[2], protocol: type, source: 'proxyscrape.com' });
        }
      }
      await humanDelay(300, 700);
    } catch {}
  }
  return proxies;
}