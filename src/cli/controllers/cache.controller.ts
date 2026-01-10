import fs from 'fs';

import { config } from '@common';
import path from 'path';

export default class CacheController {
  public getCacheSize(): number {
    let size = 0;

    if (fs.existsSync(config.cacheDir)) {
      const files = fs.readdirSync(config.cacheDir);

      for (const file of files) {
        size += fs.statSync(path.join(config.cacheDir, file)).size;
      }
    }

    if (fs.existsSync(config.downloadDir)) {
      const files = fs.readdirSync(config.downloadDir);

      for (const file of files) {
        size += fs.statSync(path.join(config.downloadDir, file)).size;
      }
    }

    return size;
  }

  public clearCache(): void {
    if (fs.existsSync(config.cacheDir)) {
      fs.rmSync(config.cacheDir, { recursive: true, force: true });
    }

    fs.rmSync(config.downloadDir, { recursive: true, force: true });
  }
}
