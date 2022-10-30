import fs from 'fs';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import config from '../config';

export default class PluginCache {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache();
    this.load();
  }

  public save() {
    fs.writeFileSync(config.cacheFile, JSON.stringify(this.cache.data));
  }

  public load() {
    if (!fs.existsSync(config.cacheFile)) {
      return;
    }

    const fileData = fs.readFileSync(config.cacheFile, 'utf8');
    this.cache.data = JSON.parse(fileData);
  }

  public async isPluginUpdated(srcPath: string, pluginPath: string): Promise<boolean> {
    const srcCachedHash = this.cache.get(this.getFileKey(srcPath, 'src'));
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

    const pluginCachedHash = this.cache.get(this.getFileKey(srcPath, 'compiled'));
    if (pluginHash !== pluginCachedHash) {
      return false;
    }

    return true;
  }

  public async updatePlugin(srcPath: string, pluginPath: string): Promise<void> {
    const srcHash = await this.createFileHash(srcPath);
    this.cache.set(this.getFileKey(srcPath, 'src'), srcHash);

    const pluginHash = await this.createFileHash(pluginPath);
    this.cache.set(this.getFileKey(srcPath, 'compiled'), pluginHash);
  }

  public async deletePlugin(srcPath: string): Promise<void> {
    this.cache.del(this.getFileKey(srcPath, 'src'));
    this.cache.del(this.getFileKey(srcPath, 'compiled'));
  }

  private getFileKey(filePath: string, type: 'src' | 'compiled') {
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
