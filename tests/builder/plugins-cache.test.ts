import path from 'path';
import fs from 'fs';
import rimraf from 'rimraf';
import { mkdirp } from 'mkdirp';
import NodeCache from 'node-cache';

import { TEST_TMP_DIR } from '../constants';
import PluginsCache, { CacheValueType } from '../../src/builder/plugins-cache';
import ProjectConfig from '../../src/project-config';
import { IResolvedProjectConfig } from '../../src/types';
import config from '../../src/config';

const TEST_DIR = path.join(TEST_TMP_DIR, 'plugin-cache');
const TEST_INCLUDE_DIR = path.join(TEST_DIR, 'include');

describe('Plugins Cache', () => {
  let projectConfig: IResolvedProjectConfig;
  let pluginCache: PluginsCache;

  beforeAll(async () => {
    projectConfig = ProjectConfig.resolve(config.defaultProjectType, {}, TEST_DIR);
    await mkdirp(TEST_DIR);
  });

  afterAll(() => {
    rimraf.sync(`${TEST_DIR}/*`);
  });

  beforeEach(async () => {
    rimraf.sync(`${TEST_DIR}/*`);
    jest.clearAllMocks();
    await mkdirp(TEST_INCLUDE_DIR);

    pluginCache = new PluginsCache(TEST_DIR, [TEST_INCLUDE_DIR], projectConfig.compiler.config.fileExtensions);
  });

  it('should update files in cache', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updateSrc(srcPath);
    await pluginCache.updateFile(pluginPath);

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(true);
    expect(await pluginCache.isRelevantPlugin(pluginPath)).toBe(true);
  });

  it('should detect cached plugin file changes', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updateSrc(srcPath);
    await pluginCache.updateFile(pluginPath);

    await fs.promises.writeFile(pluginPath, 'compiled-content-changed');

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(true);
    expect(await pluginCache.isRelevantPlugin(pluginPath)).toBe(false);
  });

  it('should detect cached src file changes', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updateSrc(srcPath);
    await pluginCache.updateFile(pluginPath);

    await fs.promises.writeFile(srcPath, 'src-content-changed');

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(false);
    expect(await pluginCache.isRelevantPlugin(pluginPath)).toBe(true);
  });

  it('should detect cached plugin file deletion', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updateSrc(srcPath);
    await pluginCache.updateFile(pluginPath);

    await fs.promises.unlink(pluginPath);

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(true);
    expect(await pluginCache.isRelevantPlugin(pluginPath)).toBe(false);
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

    await pluginCache.updateSrc(srcPath);
    await pluginCache.updateFile(pluginPath);
    await pluginCache.updateSrc(includePath);

    await fs.promises.writeFile(includePath, 'include-content-changed');
    await pluginCache.updateSrc(includePath);

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(false);
    expect(await pluginCache.isRelevantPlugin(pluginPath)).toBe(true);
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

    await pluginCache.updateSrc(srcPath);
    await pluginCache.updateFile(pluginPath);
    await pluginCache.updateSrc(includePath);

    await fs.promises.writeFile(includePath, 'include-content');
    await pluginCache.updateSrc(includePath);

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(true);
    expect(await pluginCache.isRelevantPlugin(pluginPath)).toBe(true);
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

    await pluginCache.updateSrc(srcPath);
    await pluginCache.updateFile(pluginPath);
    await pluginCache.updateSrc(includePath);
    await pluginCache.updateSrc(nestedIncludePath);
    await pluginCache.updateSrc(nestedNestedIncludePath);

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(true);
    expect(await pluginCache.isRelevantPlugin(pluginPath)).toBe(true);

    await fs.promises.writeFile(nestedNestedIncludePath, 'changed-content');
    await pluginCache.updateSrc(nestedNestedIncludePath);

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(false);
    expect(await pluginCache.isRelevantPlugin(pluginPath)).toBe(true);
  });

  it('should delete files from cache', async () => {
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updateSrc(srcPath);
    await pluginCache.updateFile(pluginPath);

    await pluginCache.deleteFile(srcPath);
    await pluginCache.deleteFile(pluginPath);

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(false);
    expect(await pluginCache.isRelevantPlugin(pluginPath)).toBe(false);
  });

  it('should load cache file', async () => {
    const cacheFilePath = path.join(TEST_DIR, 'cache.json');
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    const nodeCache = new NodeCache();
    nodeCache.set(pluginCache.getFileCacheKey(srcPath, CacheValueType.Hash), 'src-hash');
    nodeCache.set(pluginCache.getFileCacheKey(pluginPath, CacheValueType.Hash), 'plugin-hash');
    await fs.promises.writeFile(cacheFilePath, JSON.stringify(nodeCache.data));

    pluginCache.load(cacheFilePath);
    expect(pluginCache['cache'].data).toMatchObject(nodeCache.data);
  });

  it('should save cache file', async () => {
    const cacheFilePath = path.join(TEST_DIR, 'cache.json');
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    const nodeCache = new NodeCache();
    nodeCache.set(pluginCache.getFileCacheKey(srcPath, CacheValueType.Hash), 'src-hash');
    nodeCache.set(pluginCache.getFileCacheKey(pluginPath, CacheValueType.Hash), 'plugin-hash');
    await fs.promises.writeFile(cacheFilePath, JSON.stringify(nodeCache.data));

    pluginCache['cache'].data = nodeCache.data;
    pluginCache.save(cacheFilePath);

    const cacheFileContent = await fs.promises.readFile(cacheFilePath, 'utf8');
    const cacheData = JSON.parse(cacheFileContent);

    expect(cacheData).toMatchObject(nodeCache.data);
  });

  it('should correctly save states in cache file', async () => {
    const cacheFilePath = path.join(TEST_DIR, 'cache.json');

    const srcPath = path.join(TEST_DIR, 'test.sma');

    await fs.promises.writeFile(srcPath, 'src-content');

    await pluginCache.updateSrc(srcPath);

    const reloadCache = () => {
      pluginCache.save(cacheFilePath);
      pluginCache.clear();
      pluginCache.load(cacheFilePath);
    };

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(true);

    reloadCache();

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(true);

    await fs.promises.writeFile(srcPath, 'src-content-changed');

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(false);

    reloadCache();

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(false);

    await pluginCache.updateSrc(srcPath);

    reloadCache();

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(true);

    await fs.promises.writeFile(srcPath, 'src-content-changed2');

    reloadCache();

    expect(await pluginCache.isRelevantSrc(srcPath)).toBe(false);
  });
});
