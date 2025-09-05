import path from 'path';
import globule from 'globule';
import normalizePath from 'normalize-path';
import { find, map } from 'lodash';
import fs from 'fs';

import { config, CLIError, IResolvedTarget, IResolvedProjectConfig } from '@common';
import compiler, { AMXPCMessageType } from '@compiler';
import logger from '@logger';
import { copyFile, setupWatch } from '@utils';

import { IBuildOptions } from '../types';
import CacheService from './cache.service';

export default class BuilderService {
  private cache: CacheService = null;
  private scriptsPathPattern: string;
  private includePathPattern: string;
  private assetsPathPattern: string;
  private fileTargetsMap: Map<string, IResolvedTarget>;

  constructor(private projectConfig: IResolvedProjectConfig, private options: IBuildOptions = {}) {
    if (!this.options.noCache) {
      this.initCache();
    }

    this.fileTargetsMap = new Map();

    this.scriptsPathPattern = `**/*.${projectConfig.compiler.config.fileExtensions.script}`;
    this.includePathPattern = `**/*.${projectConfig.compiler.config.fileExtensions.include}`;
    this.assetsPathPattern = '**/*.*';
  }

  async buildInclude(): Promise<void> {
    for (const target of this.projectConfig.targets.include) {
      await this.buildDir(target, this.includePathPattern, filePath => this.updateInclude(filePath));
    }
  }

  async buildAssets(): Promise<void> {
    for (const target of this.projectConfig.targets.assets) {
      await this.buildDir(target, this.assetsPathPattern, filePath => this.updateAsset(filePath));
    }
  }

  async buildScripts(options: { pattern?: string; skipCompilation?: boolean } = {}): Promise<boolean> {
    const { fileExtensions } = this.projectConfig.compiler.config;

    let success = true;

    for (const target of this.projectConfig.targets.scripts) {
      await this.buildDir(
        target,
        options.pattern ? path.join('**', options.pattern) : this.scriptsPathPattern,
        async (filePath: string) => {
          if (fileExtensions.script !== path.extname(filePath).slice(1)) return;
          if (options.skipCompilation) {
            success &&= await this.updateScript(filePath);
          } else {
            success &&= await this.updateScriptAndPlugin(filePath);
          }
        }
      );
    }

    return success;
  }

  async watchAssets(): Promise<void> {
    for (const target of this.projectConfig.targets.assets) {
      await this.watchDir(target, this.assetsPathPattern, filePath => this.updateAsset(filePath));
    }
  }

  async watchInclude(): Promise<void> {
    for (const target of this.projectConfig.targets.include) {
      await this.watchDir(
        target,
        this.includePathPattern,
        async (filePath: string) => {
          const isChanged = await this.updateInclude(filePath);

          if (isChanged) {
            await this.rebuildDependents(filePath);
          }
        }
      );
    }
  }

  async watchScripts(): Promise<void> {
    for (const target of this.projectConfig.targets.scripts) {
      await this.watchDir(target, this.scriptsPathPattern, filePath => this.updateScriptAndPlugin(filePath));
    }
  }

  async updateScript(srcPath: string): Promise<boolean> {
    let isChanged = true;
    if (this.cache) {
      isChanged = await this.cache.updateSrc(srcPath);
    }

    const target = this.getFileTarget(srcPath);

    if (target.dest) {
      const destPath = this.resolveDestPath(srcPath, target);

      if (this.cache && !isChanged) {
        if (await this.cache.isRelevantFile(destPath)) return false;
      }

      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await copyFile(srcPath, destPath);

      if (this.cache) {
        await this.cache.updateFile(destPath);
      }

      logger.info('📄 Script updated:', normalizePath(destPath));
    }

    return true;
  }

  async updateAsset(filePath: string): Promise<boolean> {
    let isChanged = true;
    if (this.cache) {
      isChanged = await this.cache.updateFile(filePath);
    }

    const target = this.getFileTarget(filePath);

    if (target.dest) {
      const destPath = this.resolveDestPath(filePath, target);

      if (this.cache && !isChanged) {
        if (await this.cache.isRelevantFile(destPath)) return false;
      }

      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await copyFile(filePath, destPath);

      if (this.cache) {
        await this.cache.updateFile(destPath);
      }

      logger.info('🧸 Asset updated:', normalizePath(destPath));
    }
  }

  async updateInclude(filePath: string): Promise<boolean> {
    if (this.cache) {
      const isChanged = await this.cache.updateSrc(filePath);
      if (!isChanged) return false;
    }

    const target = this.getFileTarget(filePath);

    if (target.dest) {
      const destPath = this.resolveDestPath(filePath, target);

      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await copyFile(filePath, destPath);

      logger.info('📄 Include updated:', normalizePath(destPath));
    }

    return true;
  }

  async updatePlugin(srcPath: string): Promise<boolean> {
    try {
      const success = await this.compileScript(srcPath);
      if (!success) return false;
    } catch (err) {
      if (!this.options.ignoreErrors) {
        throw err;
      }

      return false;
    }

    return true;
  }

  async updateScriptAndPlugin(srcPath: string): Promise<boolean> {
    const success = await this.updatePlugin(srcPath);
    if (!success) return false;

    await this.updateScript(srcPath);

    return true;
  }

  async compileScript(srcPath: string): Promise<boolean> {
    const target = this.getPluginTarget(srcPath);
    if (!target) return true;

    const relateiveSrcPath = path.relative(process.cwd(), srcPath);
    const pluginDestPath = this.resolvePluginDestPath(srcPath, target);

    if (this.cache) {
      const isRelevantScript = await this.cache.isRelevantSrc(srcPath);
      const isRelevantPlugin = await this.cache.isRelevantFile(pluginDestPath);

      if (isRelevantScript && isRelevantPlugin) {
        logger.info('📄 Script is already up to date:', normalizePath(relateiveSrcPath), 'Skipped!');
        return true;
      }
    }

    const executablePath = path.join(
      this.projectConfig.compiler.dir,
      this.projectConfig.compiler.executable
    );

    await fs.promises.mkdir(path.dirname(pluginDestPath), { recursive: true });

    const result = await compiler({
      path: srcPath,
      dest: pluginDestPath,
      compiler: executablePath,
      includeDir: [
        path.join(this.projectConfig.compiler.dir, 'include'),
        ...this.projectConfig.include,
        ...map(
          globule.find(
            map(this.projectConfig.targets.include, target => path.join(target.src, '**/'))
          ),
          dir => path.resolve(dir)
        )
      ]
    });

    if (this.cache) {
      if (!result.error) {
        await this.cache.updateFile(pluginDestPath);
      } else {
        await this.cache.deleteFile(pluginDestPath);
      }
    }

    result.output.messages.forEach(message => {
      const { startLine, type, code, text, filename } = message;
      const relativeFilePath = filename ? path.relative(process.cwd(), filename) : relateiveSrcPath;

      if (type === AMXPCMessageType.Error || type === AMXPCMessageType.FatalError) {
        logger.error(`${normalizePath(relativeFilePath)}:${startLine}`, '-', type, code, ':', text);
      } else if (type === AMXPCMessageType.Warning) {
        logger.warn(`${normalizePath(relativeFilePath)}:${startLine}`, '-', type, code, ':', text);
      } else if (type === AMXPCMessageType.Echo) {
        logger.debug(text);
      }
    });

    if (result.success) {
      logger.success('Script compiled successfully:', normalizePath(relateiveSrcPath));
      logger.info('🧩 Plugin updated:', normalizePath(pluginDestPath));
    } else {
      throw new CLIError(`Failed to compile ${normalizePath(relateiveSrcPath)} : "${result.error}"`);
    }

    return result.success;
  }

  private async rebuildDependents(filePath: string) {
    if (!this.cache) return;
    if (!this.projectConfig.rules.rebuildDependents) return;

    const { fileExtensions } = this.projectConfig.compiler.config;

    const dependents = this.cache.getDependents(filePath);
    for (const srcPath of dependents) {
      if (fileExtensions.script !== path.extname(srcPath).slice(1)) continue;

      await this.updateScriptAndPlugin(srcPath);
    }
  }

  private async buildDir(
    target: IResolvedTarget,
    pattern: string,
    cb: (filePath: string) => Promise<unknown>
  ): Promise<void> {
    const files = globule.find(path.join(target.src, pattern), { nodir: true });

    await files.reduce(
      (acc, filePath) => acc.then(async () => {
        if (target.filter) {
          const srcFile = path.relative(target.src, filePath);
          if (!this.execPathFilter(srcFile, target.filter)) return;
        }

        this.setFileTarget(filePath, target);
        await cb(path.normalize(filePath));

        if (this.cache) {
          this.cache.save(config.cacheFile);
        }
      }),
      Promise.resolve()
    );
  }

  private async watchDir(
    target: IResolvedTarget,
    pattern: string,
    cb: (filePath: string) => Promise<unknown>
  ): Promise<void> {
    const updateFn = async (filePath: string) => {
      if (!this.execPathFilter(filePath, pattern)) return;

      if (target.filter) {
        const srcFile = path.relative(target.src, filePath);
        if (!this.execPathFilter(srcFile, target.filter)) return;
      }

      logger.info('🔹 File change detected. Starting incremental compilation...');

      this.setFileTarget(filePath, target);
      await cb(path.normalize(filePath)).catch((err: Error) => logger.error(err.message));

      logger.info('🔹 Compilation complete. Watching for file changes.');

      if (this.cache) {
        this.cache.save(config.cacheFile);
      }
    };

    const unlinkFn = async (filePath: string) => {
      if (this.cache) {
        await this.cache.deleteFile(filePath);
      }
    };

    setupWatch(target.src)
      .on('add', updateFn)
      .on('change', updateFn)
      .on('unlink', unlinkFn);
  }

  private initCache() {
    const ignoredIncludes = this.getNativeIncludes();

    this.cache = new CacheService(
      this.projectConfig.path,
      map(this.projectConfig.targets.include, 'src'),
      this.projectConfig.compiler.config.fileExtensions,
      ignoredIncludes
    );

    this.cache.load(config.cacheFile);
  }

  private getNativeIncludes(): string[] {
    const { fileExtensions } = this.projectConfig.compiler.config;

    const ignoredIncludes = [];

    // Ignore includes from project include directories (not the input includes)
    for (const includeDir of this.projectConfig.include) {
      for (const include of fs.readdirSync(includeDir)) {
        const { name, ext } = path.parse(include);
        if (ext.slice(1) != fileExtensions.include) continue;
        ignoredIncludes.push(name);
      }
    }

    return ignoredIncludes;
  }

  private setFileTarget(filePath: string, target: IResolvedTarget) {
    this.fileTargetsMap.set(normalizePath(filePath), target);
  }

  private getFileTarget(filePath: string): IResolvedTarget {
    return this.fileTargetsMap.get(normalizePath(filePath));
  }

  private getPluginTarget(srcPath: string): IResolvedTarget {
    const normalizedSrcPath = normalizePath(srcPath);
    const key = `plugin:${normalizedSrcPath}`;

    if (!this.fileTargetsMap.has(key)) {
      const srcTarget = this.fileTargetsMap.get(normalizedSrcPath);
      if (!srcTarget) {
        throw new CLIError(`Source file ${normalizedSrcPath} not found in any target`);
      }

      this.fileTargetsMap.set(
        `plugin:${normalizedSrcPath}`,
        find(this.projectConfig.targets.plugins, { src: srcTarget.src })
      );
    }

    return this.fileTargetsMap.get(key);
  }

  private execPathFilter(filePath: string, filter: string | string[]) {
    if (!filter) return true;
    if (Array.isArray(filter) && !filter.length) return true;

    return globule.isMatch(filter, filePath, {
      dot: true,
      nocase: true,
      matchBase: true
    });
  }

  private resolveDestPath(filePath: string, target: IResolvedTarget): string {
    const { dir, base } = path.parse(filePath);
    const subDir = target.flat ? '.' : path.relative(target.src, dir);

    return path.join(target.dest, subDir, `${target.prefix}${base}`);
  }

  private resolvePluginDestPath(srcPath: string, target: IResolvedTarget): string {
    const { fileExtensions } = this.projectConfig.compiler.config;

    const scriptTarget = this.getFileTarget(srcPath);
    const subDir = target.flat ? '.' : path.relative(scriptTarget.src, path.dirname(srcPath));

    const { name: scriptName } = path.parse(srcPath);

    return path.join(target.dest, subDir, `${target.prefix}${scriptName}.${fileExtensions.plugin}`);
  }
}
