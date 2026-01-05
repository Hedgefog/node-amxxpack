import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import normalizePath from 'normalize-path';
import globule from 'globule';

import logger from '@logger';
import { IncludeType, parseIncludes } from '@utils';

import { IDependencies } from '../types';
import { CacheValueType } from '../constants';

export default class CacheService {
  private cache: NodeCache;
  private ignoredIncludesSet: Set<string>;
  private filePathHashMap: Map<string, string>;
  private changed: boolean = false;
  private projectHash: string;

  constructor(
    private projectDir: string,
    private includeDirs: string[],
    private fileExtensions: { script: string, include: string },
    ignoredIncludes: string[] = [],
    private ttl: number = 60 * 60 * 24 * 30,
  ) {
    this.cache = new NodeCache();
    this.ignoredIncludesSet = new Set(ignoredIncludes);
    this.filePathHashMap = new Map();
    this.projectHash = this.createHash(normalizePath(this.projectDir));
  }

  public clear() {
    this.cache.data = {};
    this.changed = true;
  }

  public save(cacheFile: string) {
    if (!this.changed) return;

    fs.writeFileSync(cacheFile, JSON.stringify(this.cache.data));
    this.changed = false;
  }

  public load(cacheFile: string) {
    if (!fs.existsSync(cacheFile)) return;

    const fileData = fs.readFileSync(cacheFile, 'utf8');
    this.cache.data = JSON.parse(fileData);
    this.changed = false;
  }

  public async isRelevantSrc(srcPath: string): Promise<boolean> {
    const cachedHash = this.getValue(srcPath, CacheValueType.Hash);
    if (!cachedHash) return false;

    const hash = await this.createFileHash(srcPath);
    if (hash !== cachedHash) return false;

    const dependencies = this.getDependencies(srcPath);
    const dependenciesHash = await this.getFilesHash(dependencies.items);
    if (dependencies.hash !== dependenciesHash) return false;

    return true;
  }

  public async isRelevantFile(filePath: string): Promise<boolean> {
    const hash = await this.createFileHash(filePath);
    if (!hash) return false;

    const cachedHash = this.getValue(filePath, CacheValueType.Hash);
    if (hash !== cachedHash) return false;

    return true;
  }

  public async updateSrc(srcPath: string): Promise<boolean> {
    const oldHash = this.getValue(srcPath, CacheValueType.Hash);
    const hash = await this.updateFileHash(srcPath);
    const isDependenciesChanged = await this.updateDependencies(srcPath);

    return oldHash !== hash || isDependenciesChanged;
  }

  public async updateFile(filePath: string): Promise<boolean> {
    const oldHash = this.getValue(filePath, CacheValueType.Hash);
    const hash = await this.updateFileHash(filePath);

    return oldHash !== hash;
  }

  public async deleteFile(filePath: string): Promise<void> {
    const dependencies = this.getDependencies(filePath);

    for (const dependencyPath of dependencies.items) {
      this.removeDependent(dependencyPath, filePath);
    }

    for (const cacheValueType of Object.values(CacheValueType)) {
      this.deleteValue(filePath, cacheValueType);
    }
  }

  private isDependenciesInitialized(srcPath: string): boolean {
    return this.hasValue(srcPath, CacheValueType.Dependencies);
  }

  private getDependencies(srcPath: string): IDependencies {
    const dependencies = this.getValue<string[]>(srcPath, CacheValueType.Dependencies);
    const dependenciesHash = this.getValue<string>(srcPath, CacheValueType.DependenciesHash);
    if (!dependenciesHash) return { items: [], hash: null };

    return { items: dependencies || [], hash: dependenciesHash };
  }

  private async updateDependencies(srcPath: string): Promise<boolean> {
    const oldDependencies = this.hasValue(srcPath, CacheValueType.Dependencies) ? this.getValue<string[]>(srcPath, CacheValueType.Dependencies) : [];
    const oldDependenciesHash = this.hasValue(srcPath, CacheValueType.DependenciesHash) ? this.getValue<string>(srcPath, CacheValueType.DependenciesHash) : null;

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

    const dependencies = Array.from(dependenciesSet);
    const dependenciesHash = await this.getFilesHash(dependencies);
    if (oldDependenciesHash === dependenciesHash) return false;

    this.setValue(srcPath, CacheValueType.Dependencies, dependencies);
    this.setValue(srcPath, CacheValueType.DependenciesHash, dependenciesHash);

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
    if (!this.hasValue(filePath, CacheValueType.Dependents)) return [];

    return this.getValue<string[]>(filePath, CacheValueType.Dependents);
  }

  private addDependent(filePath: string, dependentPath: string): void {
    const dependents = this.hasValue(filePath, CacheValueType.Dependents) ? this.getValue<string[]>(filePath, CacheValueType.Dependents) : [];

    const dependentFilesSet = new Set<string>(dependents);
    if (dependentFilesSet.has(dependentPath)) return;

    dependentFilesSet.add(dependentPath);

    this.setValue(filePath, CacheValueType.Dependents, Array.from(dependentFilesSet));

    logger.debug(`Added dependent: ${filePath} <- ${dependentPath}`);
  }

  private removeDependent(filePath: string, dependentPath: string): void {
    if (!this.hasValue(filePath, CacheValueType.Dependents)) return;

    const dependents = this.getValue<string[]>(filePath, CacheValueType.Dependents);

    const dependentFilesSet = new Set<string>(dependents);
    dependentFilesSet.delete(dependentPath);

    this.setValue(filePath, CacheValueType.Dependents, Array.from(dependentFilesSet));

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
          const [includePath] = globule.find(path.join(projectInclude, '**', `${fileName}`), { nodir: true });

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
      const hash: string = (
        this.hasValue(filePath, CacheValueType.Hash)
          ? this.getValue<string>(filePath, CacheValueType.Hash)
          : await this.updateFileHash(filePath)
      );

      hashSum.update(hash);
    }

    return hashSum.digest('hex');
  }

  private async updateFileHash(filePath: string): Promise<string> {
    const hash = await this.createFileHash(filePath);

    this.setValue(filePath, CacheValueType.Hash, hash);

    return hash;
  }

  private async createFileHash(filePath: string): Promise<string | null> {
    if (!fs.existsSync(filePath)) return null;

    const buffer = await fs.promises.readFile(filePath);

    return this.createHash(buffer);
  }

  private hasValue(filePath: string, type: CacheValueType): boolean {
    return this.cache.has(this.getFileCacheKey(filePath, type));
  }

  private getValue<T>(filePath: string, type: CacheValueType): T | undefined {
    return this.cache.get<T>(this.getFileCacheKey(filePath, type));
  }

  private setValue<T>(filePath: string, type: CacheValueType, value: T) {
    if (value === this.getValue<T>(filePath, type)) return;

    this.cache.set(this.getFileCacheKey(filePath, type), value, this.ttl);
    this.changed = true;
  }

  private deleteValue(filePath: string, type: CacheValueType): void {
    this.cache.del(this.getFileCacheKey(filePath, type));
    this.changed = true;
  }

  private getFileCacheKey(srcPath: string, type: CacheValueType): string {
    const key = `${this.projectHash}${normalizePath(srcPath)}?${type}`;

    if (!this.filePathHashMap.has(key)) {
      const hash = this.createHash(key);
      this.filePathHashMap.set(key, hash);
    }

    return this.filePathHashMap.get(key);
  }

  private createHash(data: string | Buffer): string {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(data);

    return hashSum.digest('hex');
  }
}
