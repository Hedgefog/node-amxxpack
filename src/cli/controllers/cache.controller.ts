import fs from 'fs';

import { config } from '@common';

export default class CacheController {
  public getCacheSize(): number {
    try {
      const { size } = fs.statSync(config.cacheFile);
      return size;
    } catch (_err) {
      return 0;
    }
  }

  public clearCache(): void {
    if (fs.existsSync(config.cacheFile)) {
      fs.rmSync(config.cacheFile);
    }

    fs.rmSync(config.downloadDir, { recursive: true, force: true });
  }
}
