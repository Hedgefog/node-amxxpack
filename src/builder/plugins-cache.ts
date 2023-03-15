import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import NodeCache from 'node-cache';

export enum CacheValueType {
  Source = 'src',
  Compiled = 'compiled',
  Includes = 'Includes'
}

export default class PluginsCache {
  private cache: NodeCache;

  constructor(
    public projectDir: string
  ) {
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

    const projectIncludeHash = this.cache.get(
      this.getFileCacheKey('.', CacheValueType.Includes)
    );

    const includesHash = this.cache.get(
      this.getFileCacheKey(srcPath, CacheValueType.Includes)
    );

    if (projectIncludeHash !== includesHash) {
      return false;
    }

    return true;
  }

  public async updatePlugin(srcPath: string, pluginPath: string): Promise<void> {
    const srcHash = await this.createFileHash(srcPath);
    this.cache.set(this.getFileCacheKey(srcPath, CacheValueType.Source), srcHash);

    const pluginHash = await this.createFileHash(pluginPath);
    this.cache.set(this.getFileCacheKey(srcPath, CacheValueType.Compiled), pluginHash);

    const includeHash = this.cache.get(
      this.getFileCacheKey('.', CacheValueType.Includes)
    );

    this.cache.set(this.getFileCacheKey(srcPath, CacheValueType.Includes), includeHash);
  }

  public async updateProjectIncludes(includeDirs: string[]) {
    const includeHash = await this.createProjectIncludesHash(includeDirs);
    this.cache.set(this.getFileCacheKey('.', CacheValueType.Includes), includeHash);
  }

  public async deletePlugin(srcPath: string): Promise<void> {
    this.cache.del(this.getFileCacheKey(srcPath, CacheValueType.Source));
    this.cache.del(this.getFileCacheKey(srcPath, CacheValueType.Compiled));
    this.cache.del(this.getFileCacheKey(srcPath, CacheValueType.Includes));
  }

  public getFileCacheKey(filePath: string, type: CacheValueType) {
    return this.createHash(`${this.projectDir}:${filePath}?${type}`);
  }

  private async createProjectIncludesHash(includeDirs: string[]) {
    const includeHash = await this.createDirHash(
      includeDirs,
      (p) => !p.info.isFile() || path.parse(p.info.name).ext === '.inc'
    );

    return includeHash;
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

  private async createDirHash(
    dirs: string[],
    filterFn: (p: {
      dir: string,
      info: fs.Dirent
    }) => boolean = null,
    initialHash: crypto.Hash = null
  ) {
    const hashSum = initialHash || crypto.createHash('sha256');

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        continue;
      }

      const items = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (filterFn && !filterFn({ dir, info: item })) {
          continue;
        }

        if (item.isFile()) {
          const fileStat = await fs.promises.stat(fullPath);
          const data = `${fullPath}:${fileStat.size}:${fileStat.mtimeMs}`;
          hashSum.update(data);
        } else if (item.isDirectory()) {
          this.createDirHash([fullPath], filterFn, hashSum);
        }
      }
    }

    return hashSum.digest('hex');
  }
}
