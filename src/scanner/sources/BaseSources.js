/**
 * 🧩 Базовый класс для всех источников
 */
export class BaseSource {
  constructor(name, type = 'proxy') {
    this.name = name;
    this.type = type; // 'proxy', 'vpn', 'dns', 'mtproto'
  }

  async fetch() {
    throw new Error('Метод fetch() должен быть реализован в подклассе');
  }

  validate(item) {
    return !!item.ip && !!item.port;
  }
}