import path from 'path';
import fs from 'fs';
import rimraf from 'rimraf';
import NodeCache from 'node-cache';

import { TEST_TMP_DIR } from '../constants';
import Cache from '../../src/builder/services/cache.service';
import { CacheValueType } from '../../src/builder/constants';
import { createProjectConfig } from '../../src/project-config';
import { IResolvedProjectConfig } from '../../src/common/types';
import config from '../../src/common/config';

const TEST_DIR = path.join(TEST_TMP_DIR, 'cache');
const TEST_INCLUDE_DIR = path.join(TEST_DIR, 'include');

describe('Cache', () => {
  let projectConfig: IResolvedProjectConfig;
  let cache: Cache;

  beforeAll(async () => {
    projectConfig = createProjectConfig(config.project.defaultType, {}, TEST_DIR);
    await fs.promises.mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rimraf.sync(`${TEST_DIR}/*`);
  });

  beforeEach(async () => {
    rimraf.sync(`${TEST_DIR}/*`);
    jest.clearAllMocks();
    await fs.promises.mkdir(TEST_INCLUDE_DIR, { recursive: true });

    cache = new Cache(TEST_DIR, [TEST_INCLUDE_DIR], projectConfig.compiler.config.fileExtensions);
  });

  it('should update files in cache', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await cache.updateSrc(srcPath);
    await cache.updateFile(pluginPath);

    expect(await cache.isRelevantSrc(srcPath)).toBe(true);
    expect(await cache.isRelevantFile(pluginPath)).toBe(true);
  });

  it('should detect cached plugin file changes', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await cache.updateSrc(srcPath);
    await cache.updateFile(pluginPath);

    await fs.promises.writeFile(pluginPath, 'compiled-content-changed');

    expect(await cache.isRelevantSrc(srcPath)).toBe(true);
    expect(await cache.isRelevantFile(pluginPath)).toBe(false);
  });

  it('should detect cached src file changes', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await cache.updateSrc(srcPath);
    await cache.updateFile(pluginPath);

    await fs.promises.writeFile(srcPath, 'src-content-changed');

    expect(await cache.isRelevantSrc(srcPath)).toBe(false);
    expect(await cache.isRelevantFile(pluginPath)).toBe(true);
  });

  it('should detect cached plugin file deletion', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await cache.updateSrc(srcPath);
    await cache.updateFile(pluginPath);

    await fs.promises.unlink(pluginPath);

    expect(await cache.isRelevantSrc(srcPath)).toBe(true);
    expect(await cache.isRelevantFile(pluginPath)).toBe(false);
  });

  it('should detect include changes', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');
    const includePath = path.join(TEST_INCLUDE_DIR, 'test.inc');

    await fs.promises.writeFile(srcPath, `
        #include <test>
    `);
    await fs.promises.writeFile(pluginPath, 'compiled-content');
    await fs.promises.writeFile(includePath, 'include-content');

    await cache.updateSrc(srcPath);
    await cache.updateFile(pluginPath);
    await cache.updateSrc(includePath);

    await fs.promises.writeFile(includePath, 'include-content-changed');
    await cache.updateSrc(includePath);

    expect(await cache.isRelevantSrc(srcPath)).toBe(false);
    expect(await cache.isRelevantFile(pluginPath)).toBe(true);
  });

  it('shoud return that plugin is relevant if include has same content', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');
    const includePath = path.join(TEST_INCLUDE_DIR, 'test.inc');

    await fs.promises.writeFile(srcPath, `
        #include <test>
    `);
    await fs.promises.writeFile(pluginPath, 'compiled-content');
    await fs.promises.writeFile(includePath, 'include-content');

    await cache.updateSrc(srcPath);
    await cache.updateFile(pluginPath);
    await cache.updateSrc(includePath);

    await fs.promises.writeFile(includePath, 'include-content');
    await cache.updateSrc(includePath);

    expect(await cache.isRelevantSrc(srcPath)).toBe(true);
    expect(await cache.isRelevantFile(pluginPath)).toBe(true);
  });

  it('should detect changes of nested dependencies', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');
    const includePath = path.join(TEST_INCLUDE_DIR, 'test.inc');
    const nestedIncludePath = path.join(TEST_INCLUDE_DIR, 'test2.inc');
    const nestedNestedIncludePath = path.join(TEST_INCLUDE_DIR, 'test3.inc');

    await fs.promises.writeFile(srcPath, '#include <test>');
    await fs.promises.writeFile(pluginPath, 'compiled-content');
    await fs.promises.writeFile(includePath, '#include <test2>');
    await fs.promises.writeFile(nestedIncludePath, '#include <test3>');
    await fs.promises.writeFile(nestedNestedIncludePath, 'content');

    await cache.updateSrc(srcPath);
    await cache.updateFile(pluginPath);
    await cache.updateSrc(includePath);
    await cache.updateSrc(nestedIncludePath);
    await cache.updateSrc(nestedNestedIncludePath);

    expect(await cache.isRelevantSrc(srcPath)).toBe(true);
    expect(await cache.isRelevantFile(pluginPath)).toBe(true);

    await fs.promises.writeFile(nestedNestedIncludePath, 'changed-content');
    await cache.updateSrc(nestedNestedIncludePath);

    expect(await cache.isRelevantSrc(srcPath)).toBe(false);
    expect(await cache.isRelevantFile(pluginPath)).toBe(true);
  });

  it('should delete files from cache', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await cache.updateSrc(srcPath);
    await cache.updateFile(pluginPath);

    await cache.deleteFile(srcPath);
    await cache.deleteFile(pluginPath);

    expect(await cache.isRelevantSrc(srcPath)).toBe(false);
    expect(await cache.isRelevantFile(pluginPath)).toBe(false);
  });

  it('should load cache file', async () => {
    const cacheFilePath = path.join(TEST_DIR, 'cache.json');
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    const nodeCache = new NodeCache();
    nodeCache.set(cache['getFileCacheKey'](srcPath, CacheValueType.Hash), 'src-hash');
    nodeCache.set(cache['getFileCacheKey'](pluginPath, CacheValueType.Hash), 'plugin-hash');
    await fs.promises.writeFile(cacheFilePath, JSON.stringify(nodeCache.data));

    cache.load(cacheFilePath);
    expect(cache['cache'].data).toMatchObject(nodeCache.data);
  });

  it('should save cache file', async () => {
    const cacheFilePath = path.join(TEST_DIR, 'cache.json');
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    const nodeCache = new NodeCache();
    nodeCache.set(cache['getFileCacheKey'](srcPath, CacheValueType.Hash), 'src-hash');
    nodeCache.set(cache['getFileCacheKey'](pluginPath, CacheValueType.Hash), 'plugin-hash');
    await fs.promises.writeFile(cacheFilePath, JSON.stringify(nodeCache.data));

    cache['cache'].data = nodeCache.data;
    cache.save(cacheFilePath);

    const cacheFileContent = await fs.promises.readFile(cacheFilePath, 'utf8');
    const cacheData = JSON.parse(cacheFileContent);

    expect(cacheData).toMatchObject(nodeCache.data);
  });

  it('should correctly save states in cache file', async () => {
    const cacheFilePath = path.join(TEST_DIR, 'cache.json');

    const srcPath = path.join(TEST_DIR, 'test.sma');

    await fs.promises.writeFile(srcPath, 'src-content');

    await cache.updateSrc(srcPath);

    const reloadCache = () => {
      cache.save(cacheFilePath);
      cache.clear();
      cache.load(cacheFilePath);
    };

    expect(await cache.isRelevantSrc(srcPath)).toBe(true);

    reloadCache();

    expect(await cache.isRelevantSrc(srcPath)).toBe(true);

    await fs.promises.writeFile(srcPath, 'src-content-changed');

    expect(await cache.isRelevantSrc(srcPath)).toBe(false);

    reloadCache();

    expect(await cache.isRelevantSrc(srcPath)).toBe(false);

    await cache.updateSrc(srcPath);

    reloadCache();

    expect(await cache.isRelevantSrc(srcPath)).toBe(true);

    await fs.promises.writeFile(srcPath, 'src-content-changed2');

    reloadCache();

    expect(await cache.isRelevantSrc(srcPath)).toBe(false);
  });
});
