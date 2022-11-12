import fs from 'fs';
import crypto from 'crypto';
import NodeCache from 'node-cache';

enum CacheValueType {
  Source = 'src',
  Compiled = 'compiled',
}

export default class PluginsCache {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache();
  }

  public save(cacheFile: string) {
    fs.writeFileSync(cacheFile, JSON.stringify(this.cache.data));
  }

  public load(cacheFile: string) {
    if (!fs.existsSync(cacheFile)) {
      return;
    }

    const fileData = fs.readFileSync(cacheFile, 'utf8');
    this.cache.data = JSON.parse(fileData);
  }

  public async isPluginUpdated(srcPath: string, pluginPath: string): Promise<boolean> {
    const srcCachedHash = this.cache.get(this.getFileCacheKey(srcPath, CacheValueType.Source));
    if (!srcCachedHash) {
      return false;
    }

    const srcHash = await this.createFileHash(srcPath);
    if (srcHash !== srcCachedHash) {
      return false;
    }

    const pluginHash = await this.createFileHash(pluginPath);
    if (!pluginHash) {
      return false;
    }

    const pluginCachedHash = this.cache.get(this.getFileCacheKey(srcPath, CacheValueType.Compiled));
    if (pluginHash !== pluginCachedHash) {
      return false;
    }

    return true;
  }

  public async updatePlugin(srcPath: string, pluginPath: string): Promise<void> {
    const srcHash = await this.createFileHash(srcPath);
    this.cache.set(this.getFileCacheKey(srcPath, CacheValueType.Source), srcHash);

    const pluginHash = await this.createFileHash(pluginPath);
    this.cache.set(this.getFileCacheKey(srcPath, CacheValueType.Compiled), pluginHash);
  }

  public async deletePlugin(srcPath: string): Promise<void> {
    this.cache.del(this.getFileCacheKey(srcPath, CacheValueType.Source));
    this.cache.del(this.getFileCacheKey(srcPath, CacheValueType.Compiled));
  }

  private getFileCacheKey(filePath: string, type: CacheValueType) {
    return `${filePath}?${type}`;
  }

  private createHash(data: string | Buffer): string {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(data);

    return hashSum.digest('hex');
  }

  private async createFileHash(filePath: string): Promise<string | null> {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const buffer = await fs.promises.readFile(filePath);
    const hash = this.createHash(buffer);

    return hash;
  }
}
