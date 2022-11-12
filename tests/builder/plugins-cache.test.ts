/* eslint-disable @typescript-eslint/dot-notation */
import path from 'path';
import fs from 'fs';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import NodeCache from 'node-cache';

import { TEST_TMP_DIR } from '../constants';
import PluginsCache, { CacheValueType } from '../../src/builder/plugins-cache';

const TEST_DIR = path.join(TEST_TMP_DIR, 'plugin-cache');

describe('Plugins Cache', () => {
  beforeAll(async () => {
    await mkdirp(TEST_DIR);
  });

  afterAll(() => {
    rimraf.sync(`${TEST_DIR}/*`);
  });

  beforeEach(() => {
    rimraf.sync(`${TEST_DIR}/*`);
    jest.clearAllMocks();
  });

  it('should update files in cache', async () => {
    const pluginCache = new PluginsCache();

    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updatePlugin(srcPath, pluginPath);

    const isUpdated = await pluginCache.isPluginUpdated(srcPath, pluginPath);

    expect(isUpdated).toBe(true);
  });

  it('should detect cached plugin file changes', async () => {
    const pluginCache = new PluginsCache();

    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updatePlugin(srcPath, pluginPath);

    await fs.promises.writeFile(pluginPath, 'compiled-content-changed');

    const isUpdated = await pluginCache.isPluginUpdated(srcPath, pluginPath);

    expect(isUpdated).toBe(false);
  });

  it('should detect cached src file changes', async () => {
    const pluginCache = new PluginsCache();

    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updatePlugin(srcPath, pluginPath);

    await fs.promises.writeFile(srcPath, 'src-content-changed');

    const isUpdated = await pluginCache.isPluginUpdated(srcPath, pluginPath);

    expect(isUpdated).toBe(false);
  });

  it('should detect cached plugin file deletion', async () => {
    const pluginCache = new PluginsCache();

    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updatePlugin(srcPath, pluginPath);

    await fs.promises.unlink(pluginPath);

    const isUpdated = await pluginCache.isPluginUpdated(srcPath, pluginPath);

    expect(isUpdated).toBe(false);
  });

  it('should delete files from cache', async () => {
    const pluginCache = new PluginsCache();

    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    await fs.promises.writeFile(srcPath, 'src-content');
    await fs.promises.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updatePlugin(srcPath, pluginPath);

    await pluginCache.deletePlugin(srcPath);

    const isUpdated = await pluginCache.isPluginUpdated(srcPath, pluginPath);

    expect(isUpdated).toBe(false);
  });

  it('should load cache file', async () => {
    const pluginCache = new PluginsCache();

    const cacheFilePath = path.join(TEST_DIR, 'cache.json');
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    const nodeCache = new NodeCache();
    nodeCache.set(pluginCache.getFileCacheKey(srcPath, CacheValueType.Source), 'src-hash');
    nodeCache.set(pluginCache.getFileCacheKey(pluginPath, CacheValueType.Compiled), 'plugin-hash');
    await fs.promises.writeFile(cacheFilePath, JSON.stringify(nodeCache.data));

    pluginCache.load(cacheFilePath);
    expect(pluginCache['cache'].data).toMatchObject(nodeCache.data);
  });

  it('should save cache file', async () => {
    const pluginCache = new PluginsCache();

    const cacheFilePath = path.join(TEST_DIR, 'cache.json');
    const srcPath = path.join(TEST_DIR, 'test.sma');
    const pluginPath = path.join(TEST_DIR, 'test.amxx');

    const nodeCache = new NodeCache();
    nodeCache.set(pluginCache.getFileCacheKey(srcPath, CacheValueType.Source), 'src-hash');
    nodeCache.set(pluginCache.getFileCacheKey(pluginPath, CacheValueType.Compiled), 'plugin-hash');
    await fs.promises.writeFile(cacheFilePath, JSON.stringify(nodeCache.data));

    pluginCache['cache'].data = nodeCache.data;
    pluginCache.save(cacheFilePath);

    const cacheFileContent = await fs.promises.readFile(cacheFilePath, 'utf8');
    const cacheData = JSON.parse(cacheFileContent);

    expect(cacheData).toMatchObject(nodeCache.data);
  });
});
