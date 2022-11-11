/* eslint-disable @typescript-eslint/dot-notation */
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import NodeCache from 'node-cache';

import PluginsCache from '../../src/builder/plugins-cache';

const TEST_TMP_DIR = path.join(os.tmpdir(), 'amxxpack-tests');

describe('Plugins Cache', () => {
  it('should update files in cache', async () => {
    const pluginCache = new PluginsCache();

    const srcPath = path.join(TEST_TMP_DIR, 'test.sma');
    const pluginPath = path.join(TEST_TMP_DIR, 'test.amxx');

    await fs.writeFile(srcPath, 'src-content');
    await fs.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updatePlugin(srcPath, pluginPath);

    const isUpdated = await pluginCache.isPluginUpdated(srcPath, pluginPath);

    expect(isUpdated).toBe(true);
  });

  it('should detect cached plugin file changes', async () => {
    const pluginCache = new PluginsCache();

    const srcPath = path.join(TEST_TMP_DIR, 'test.sma');
    const pluginPath = path.join(TEST_TMP_DIR, 'test.amxx');

    await fs.writeFile(srcPath, 'src-content');
    await fs.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updatePlugin(srcPath, pluginPath);

    await fs.writeFile(pluginPath, 'compiled-content-changed');

    const isUpdated = await pluginCache.isPluginUpdated(srcPath, pluginPath);

    expect(isUpdated).toBe(false);
  });

  it('should detect cached src file changes', async () => {
    const pluginCache = new PluginsCache();

    const srcPath = path.join(TEST_TMP_DIR, 'test.sma');
    const pluginPath = path.join(TEST_TMP_DIR, 'test.amxx');

    await fs.writeFile(srcPath, 'src-content');
    await fs.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updatePlugin(srcPath, pluginPath);

    await fs.writeFile(srcPath, 'src-content-changed');

    const isUpdated = await pluginCache.isPluginUpdated(srcPath, pluginPath);

    expect(isUpdated).toBe(false);
  });

  it('should delete files from cache', async () => {
    const pluginCache = new PluginsCache();

    const srcPath = path.join(TEST_TMP_DIR, 'test.sma');
    const pluginPath = path.join(TEST_TMP_DIR, 'test.amxx');

    await fs.writeFile(srcPath, 'src-content');
    await fs.writeFile(pluginPath, 'compiled-content');

    await pluginCache.updatePlugin(srcPath, pluginPath);

    await pluginCache.deletePlugin(srcPath);

    const isUpdated = await pluginCache.isPluginUpdated(srcPath, pluginPath);

    expect(isUpdated).toBe(false);
  });

  it('should load cache file', async () => {
    const pluginCache = new PluginsCache();

    const cacheFilePath = path.join(TEST_TMP_DIR, 'cache.json');
    const srcPath = path.join(TEST_TMP_DIR, 'test.sma');
    const pluginPath = path.join(TEST_TMP_DIR, 'test.amxx');

    const nodeCache = new NodeCache();
    nodeCache.set(pluginCache['getFileCacheKey'](srcPath, 'src'), 'src-hash');
    nodeCache.set(pluginCache['getFileCacheKey'](pluginPath, 'compiled'), 'plugin-hash');
    await fs.writeFile(cacheFilePath, JSON.stringify(nodeCache.data));

    pluginCache.load(cacheFilePath);
    expect(pluginCache['cache'].data).toMatchObject(nodeCache.data);
  });

  it('should save cache file', async () => {
    const pluginCache = new PluginsCache();

    const cacheFilePath = path.join(TEST_TMP_DIR, 'cache.json');
    const srcPath = path.join(TEST_TMP_DIR, 'test.sma');
    const pluginPath = path.join(TEST_TMP_DIR, 'test.amxx');

    const nodeCache = new NodeCache();
    nodeCache.set(pluginCache['getFileCacheKey'](srcPath, 'src'), 'src-hash');
    nodeCache.set(pluginCache['getFileCacheKey'](pluginPath, 'compiled'), 'plugin-hash');
    await fs.writeFile(cacheFilePath, JSON.stringify(nodeCache.data));

    pluginCache['cache'].data = nodeCache.data;
    pluginCache.save(cacheFilePath);

    const cacheFileContent = await fs.readFile(cacheFilePath, 'utf8');
    const cacheData = JSON.parse(cacheFileContent);

    expect(cacheData).toMatchObject(nodeCache.data);
  });
});
