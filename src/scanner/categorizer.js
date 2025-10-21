export function categorizeProxiesUltra(proxies) {
  const cats = {
    elite: [], socks5: [], mtproto: [], openvpn: [], wireguard: [], dns: [], https: [], http: []
  };
  for (const p of proxies) {
    if (p.protocol === 'socks5') cats.socks5.push(p);
    else if (p.protocol === 'https') cats.https.push(p);
    else if (p.protocol === 'http') cats.http.push(p);
    else if (p.protocol === 'mtproto') cats.mtproto.push(p);
    else if (p.protocol === 'dns') cats.dns.push(p);
    if (p.type === 'OpenVPN') cats.openvpn.push(p);
    else if (p.type === 'WireGuard') cats.wireguard.push(p);
    if (['elite', 'high'].includes(p.anonymity)) cats.elite.push(p);
    if (p.speed < 1000 && ['elite', 'high'].includes(p.anonymity)) cats.vpn = cats.vpn || [];
  }
  Object.keys(cats).forEach(k => cats[k].sort((a, b) => (a.speed || 9999) - (b.speed || 9999)));
  return cats;
}

export function getTopProxiesByCategory(categorized) {
  const limits = { elite:10, socks5:10, mtproto:8, openvpn:8, wireguard:6, dns:6, https:8 };
  const res = {};
  for (const [k, v] of Object.entries(categorized)) {
    res[k] = v.slice(0, limits[k] || 5);
  }
  return res;
}