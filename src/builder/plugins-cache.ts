import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import NodeCache from 'node-cache';

import { IncludeType, parseIncludes } from '../utils/parse-includes';
import logger from '../logger/logger';
import globule from 'globule';
import normalizePath from 'normalize-path';

export interface IDependencies {
  items: string[];
  hash: string | null;
}

export enum CacheValueType {
  FileHash = 'hash',
  Dependencies = 'dependencies',
  DependenciesHash = 'dependencies-hash',
  Dependents = 'dependents'
}

export default class PluginsCache {
  private cache: NodeCache;
  private ignoredIncludesSet: Set<string>;

  constructor(
    private projectDir: string,
    private includeDirs: string[],
    private fileExtensions: { script: string, include: string },
    ignoredIncludes: string[] = []
  ) {
    this.cache = new NodeCache();
    this.ignoredIncludesSet = new Set(ignoredIncludes);
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

  public async isRelevantSrc(srcPath: string): Promise<boolean> {
    const srcCachedHash = this.cache.get(this.getFileCacheKey(srcPath, CacheValueType.FileHash));
    if (!srcCachedHash) return false;

    const srcHash = await this.createFileHash(srcPath);
    if (srcHash !== srcCachedHash) return false;

    const dependencies = await this.getDependencies(srcPath);
    const dependenciesHash = await this.getFilesHash(dependencies.items);
    if (dependenciesHash !== dependencies.hash) return false;

    return true;
  }

  public async isRelevantPlugin(pluginPath: string): Promise<boolean> {
    const pluginHash = await this.createFileHash(pluginPath);
    if (!pluginHash) return false;

    const pluginCachedHash = this.cache.get(this.getFileCacheKey(pluginPath, CacheValueType.FileHash));
    if (pluginHash !== pluginCachedHash) return false;

    return true;
  }

  public async updateSrc(srcPath: string): Promise<boolean> {
    const oldHash = this.cache.get(this.getFileCacheKey(srcPath, CacheValueType.FileHash));
    const hash = await this.updateFileHash(srcPath);
    if (oldHash == hash) return false;

    await this.updateDependencies(srcPath);

    return true;
  }
  
  public async updateFile(filePath: string): Promise<boolean> {
    const oldHash = this.cache.get(this.getFileCacheKey(filePath, CacheValueType.FileHash));
    const hash = await this.updateFileHash(filePath);

    return oldHash !== hash;
  }

  public async deleteFile(filePath: string): Promise<void> {
    const dependencies = await this.getDependencies(filePath);

    for (const dependencyPath of dependencies.items) {
      await this.removeDependent(dependencyPath, filePath);
    }

    for (const cacheValueType of Object.values(CacheValueType)) {
      this.cache.del(this.getFileCacheKey(filePath, cacheValueType));
    }
  }

  public getFileCacheKey(srcPath: string, type: CacheValueType) {
    return this.createHash(`${this.projectDir}:${normalizePath(srcPath)}?${type}`);
  }

  private isDependenciesInitialized(srcPath: string): boolean {
    return this.cache.has(this.getFileCacheKey(srcPath, CacheValueType.Dependencies));
  }

  private getDependencies(srcPath: string): IDependencies {
    const dependencies = this.cache.get<string[]>(this.getFileCacheKey(srcPath, CacheValueType.Dependencies));
    const dependenciesHash = this.cache.get<string>(this.getFileCacheKey(srcPath, CacheValueType.DependenciesHash));
    if (!dependenciesHash) return { items: [], hash: null };

    return { items: dependencies || [], hash: dependenciesHash };
  }

  private async updateDependencies(srcPath: string): Promise<boolean> {
    const cacheKey = this.getFileCacheKey(srcPath, CacheValueType.Dependencies);
    const hashCacheKey = this.getFileCacheKey(srcPath, CacheValueType.DependenciesHash);

    const oldDependencies = this.cache.has(cacheKey) ? this.cache.get<string[]>(cacheKey) : [];
    const oldDependenciesHash = this.cache.has(hashCacheKey) ? this.cache.get<string>(hashCacheKey) : null;

    const dependenciesSet = new Set<string>(
      await this.parseDependencies(srcPath)
    );

    for (const dependencyPath of dependenciesSet.values()) {
      if (!this.isDependenciesInitialized(dependencyPath)) {
        await this.updateDependencies(dependencyPath);
      }

      for (const nestedDependencyPath of this.getDependencies(dependencyPath).items) {
        dependenciesSet.add(nestedDependencyPath);
      }
    }

    const dependencies = Array.from(dependenciesSet)
    this.cache.set(cacheKey, dependencies);

    const dependenciesHash = await this.getFilesHash(dependencies);
    this.cache.set(hashCacheKey, dependenciesHash);

    if (oldDependenciesHash === dependenciesHash) return false;

    for (const dependencyPath of oldDependencies) {
      if (dependenciesSet.has(dependencyPath)) continue;
      this.removeDependent(dependencyPath, srcPath);
    }

    const dependents = this.getDependents(srcPath);

    for (const dependencyPath of dependencies) {
      this.addDependent(dependencyPath, srcPath);

      for (const dependentFilePath of dependents) {
        this.addDependent(dependencyPath, dependentFilePath);
      }
    }

    return true;
  }

  public getDependents(filePath: string): string[] {
    const cacheKey = this.getFileCacheKey(filePath, CacheValueType.Dependents);
    if (!this.cache.has(cacheKey)) return [];
    
    return this.cache.get<string[]>(cacheKey);
  }

  private async addDependent(filePath: string, dependentPath: string): Promise<void> {
    const cacheKey = this.getFileCacheKey(filePath, CacheValueType.Dependents);

    const dependents = this.cache.has(cacheKey) ? this.cache.get<string[]>(cacheKey) : [];

    const dependentFilesSet = new Set<string>(dependents);
    if (dependentFilesSet.has(dependentPath)) return;

    dependentFilesSet.add(dependentPath);

    this.cache.set(cacheKey, Array.from(dependentFilesSet));

    logger.debug(`Added dependent: ${filePath} <- ${dependentPath}`);
  }

  private async removeDependent(filePath: string, dependentPath: string): Promise<void> {
    const cacheKey = this.getFileCacheKey(filePath, CacheValueType.Dependents);
    if (!this.cache.has(cacheKey)) return;

    const dependents = this.cache.get<string[]>(cacheKey);

    const dependentFilesSet = new Set<string>(dependents);
    dependentFilesSet.delete(dependentPath);

    this.cache.set(this.getFileCacheKey(filePath, CacheValueType.Dependents), Array.from(dependentFilesSet));

    logger.debug(`Remove dependent: ${filePath} <- ${dependentPath}`);
  }

  private async parseDependencies(srcPath: string): Promise<string[]> {
    const dependencies = new Set<string>();

    const includes = await parseIncludes(srcPath);

    for (const include of includes) {
      if (include.type == IncludeType.Native) {
        if (this.ignoredIncludesSet.has(include.name)) continue;
  
        for (const projectInclude of this.includeDirs) {
          const fileName = `${include.name}.${this.fileExtensions.include}`;
          const [includePath] = await globule.find(path.join(projectInclude, '**', `${fileName}`), { nodir: true });
  
          if (includePath) {
            dependencies.add(includePath);
            break;
          }
        }
      } else {
        const ext = path.extname(include.name).slice(1);
        const fileName = ext ? include.name : `${include.name}.${this.fileExtensions.include}`;

        dependencies.add(path.resolve(path.dirname(srcPath), fileName));
      }
    }

    return Array.from(dependencies);
  }

  private async getFilesHash(paths: string[]): Promise<string> {
    const hashSum = crypto.createHash('sha256');

    for (const filePath of paths) {
      const cacheKey = this.getFileCacheKey(filePath, CacheValueType.FileHash);

      const hash: string = (
        this.cache.has(cacheKey)
          ? this.cache.get(cacheKey)
          : await this.updateFileHash(filePath)
      );

      hashSum.update(hash);
    }    

    return hashSum.digest('hex');
  }

  private async updateFileHash(filePath: string): Promise<string> {
    const hash = await this.createFileHash(filePath);

    this.cache.set(this.getFileCacheKey(filePath, CacheValueType.FileHash), hash);

    return hash;
  }

  private async createFileHash(filePath: string): Promise<string | null> {
    if (!fs.existsSync(filePath)) return null;

    const buffer = await fs.promises.readFile(filePath);

    return this.createHash(buffer);
  }

  private createHash(data: string | Buffer): string {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(data);

    return hashSum.digest('hex');
  }
}
