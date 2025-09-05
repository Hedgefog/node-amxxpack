import path from 'path';
import fs from 'fs';
import Chance from 'chance';

import CacheController from '../../src/cli/controllers/cache.controller';
import config from '../../src/common/config';

const chance = new Chance();

describe('Cache Controller', () => {
  beforeAll(() => {
    fs.rmSync(config.downloadDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    fs.mkdirSync(config.downloadDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(config.downloadDir, { recursive: true, force: true });
  });

  it('should get cache size', async () => {
    const cacheController = new CacheController();

    const randomSize = () => chance.integer({ min: 10000, max: 10000 });

    let totalSize = 0;

    const writeFile = async (filePath: string) => {
      const size = randomSize();
      await fs.promises.writeFile(filePath, Buffer.alloc(size));
      totalSize += size;
    };

    await writeFile(config.cacheFile);

    for (let i = 0; i < 10; i++) {
      await writeFile(path.join(config.downloadDir, chance.word({ length: 8 })));
    }

    expect(cacheController.getCacheSize()).toBe(totalSize);
  });

  it('should clear cache', async () => {
    const cacheController = new CacheController();

    await fs.promises.writeFile(config.cacheFile, 'test');

    for (let i = 0; i < 10; i++) {
      await fs.promises.writeFile(path.join(config.downloadDir, chance.word({ length: 8 })), 'test');
    }

    await cacheController.clearCache();

    expect(fs.existsSync(config.cacheFile)).toBe(false);
    expect(fs.existsSync(config.downloadDir)).toBe(false);
  });
});
