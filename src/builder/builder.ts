import path from 'path';
import { mkdirp } from 'mkdirp';
import globule from 'globule';
import normalizePath from 'normalize-path';
import { castArray, isArray, map } from 'lodash';
import fs from 'fs';

import compiler, { AMXPCMessageType } from './compiler';
import { IResolvedInput, IResolvedProjectConfig } from '../types';
import logger from '../logger/logger';
import Cache from './cache';
import copyFile from '../utils/copy-file';
import config from '../config';
import setupWatch from '../utils/setup-watch';
import CLIError from '../common/cli-error';

export interface IBuildOptions {
  noCache?: boolean;
  ignoreErrors?: boolean;
}

export default class AmxxBuilder {
  private cache: Cache = null;
  private scriptsPathPattern: string;
  private includePathPattern: string;
  private assetsPathPattern: string;

  constructor(private projectConfig: IResolvedProjectConfig, private options: IBuildOptions = {}) {
    if (!this.options.noCache) {
      this.initCache();
    }

    this.scriptsPathPattern = `**/*.${projectConfig.compiler.config.fileExtensions.script}`;
    this.includePathPattern = `**/*.${projectConfig.compiler.config.fileExtensions.include}`;
    this.assetsPathPattern = '**/*.*';
  }

  async build(): Promise<void> {
    logger.info('⚒️ Building...');

    try {
      await this.buildAssets();
      await this.buildInclude();

      const success = await this.buildScripts();

      if (success) {
        logger.success('Build completed successfully!');
      } else {
        logger.error('Build completed with errors!');
      }

      if (this.cache) {
        this.cache.save(config.cacheFile);
      }
    } catch (err: unknown) {
      throw new CLIError(`Build failed! Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async watch(): Promise<void> {
    await this.watchAssets();
    await this.watchInclude();
    await this.watchScripts();
  }

  async buildScripts(options: { pattern?: string } = {}): Promise<boolean> {
    const { fileExtensions } = this.projectConfig.compiler.config;

    let success = true;

    for (const input of this.projectConfig.input.scripts) {
      await this.buildDir(
        input.dir,
        options.pattern ? path.join('**', options.pattern) : this.scriptsPathPattern,
        async (filePath: string) => {
          if (fileExtensions.script !== path.extname(filePath).slice(1)) return;
          const isUpdated = await this.updatePlugin(filePath, this.getScriptOptions(filePath));
          success = success && isUpdated;
        }
      );
    }

    return success;
  }

  async buildInclude(): Promise<void> {
    for (const input of this.projectConfig.input.include) {
      await this.buildDir(
        input.dir,
        this.includePathPattern,
        async (filePath: string) => {
          await this.updateInclude(filePath, input);
        }
      );
    }
  }

  async rebuildDependents(filePath: string) {
    if (!this.cache) return;
    if (!this.projectConfig.rules.rebuildDependents) return;
    
    const { fileExtensions } = this.projectConfig.compiler.config;

    const dependents = this.cache.getDependents(filePath);
    for (const srcPath of dependents) {
      if (fileExtensions.script !== path.extname(srcPath).slice(1)) continue;

      await this.updatePlugin(srcPath, this.getScriptOptions(srcPath));
    }

    if (this.cache) {
      this.cache.save(config.cacheFile);
    }
  }

  async buildAssets(): Promise<void> {
    if (!this.projectConfig.input.assets) {
      return;
    }

    for (const assetInput of this.projectConfig.input.assets) {
      await this.buildDir(
        assetInput.dir,
        this.assetsPathPattern,
        async (filePath: string) => {
          await this.updateAsset(filePath, assetInput);
        }
      );
    }
  }

  async watchScripts(): Promise<void> {
    for (const input of this.projectConfig.input.scripts) {
      await this.watchDir(
        input.dir,
        this.scriptsPathPattern,
        async (filePath: string) => {
          await this.updatePlugin(filePath, input);

          if (this.cache) {
            this.cache.save(config.cacheFile);
          }
        }
      );
    }
  }

  async watchInclude(): Promise<void> {
    for (const input of this.projectConfig.input.include) {
      await this.watchDir(
        input.dir,
        this.includePathPattern,
        async (filePath: string) => {
          const isChanged = await this.updateInclude(filePath, input);

          if (isChanged) {
            await this.rebuildDependents(filePath);
          }

          if (this.cache) {
            this.cache.save(config.cacheFile);
          }
        }
      );
    }
  }

  async watchAssets(): Promise<void> {
    if (!this.projectConfig.input.assets) {
      return;
    }

    for (const assetInput of this.projectConfig.input.assets) {
      await this.watchDir(
        assetInput.dir,
        this.assetsPathPattern,
        async (filePath: string) => {
          await this.updateAsset(filePath, assetInput);

          if (this.cache) {
            this.cache.save(config.cacheFile);
          }
        }
      );
    }
  }

  async updateScript(srcPath: string, options: IResolvedInput): Promise<boolean> {
    let isChanged = true;
    if (this.cache) {
      isChanged = await this.cache.updateSrc(srcPath);
    }

    if (options.output) {
      const destPath = this.resolveDestPath(
        path.dirname(srcPath),
        path.basename(srcPath),
        options
      );

      if (this.cache && !isChanged) {
        if (await this.cache.isRelevantFile(destPath)) return false;
      }

      await mkdirp(path.dirname(destPath));
      await copyFile(srcPath, destPath);

      if (this.cache) {
        await this.cache.updateFile(destPath);
      }

      logger.info('📄 Script updated:', normalizePath(destPath));
    }

    return true;
  }

  async updateAsset(filePath: string, options: IResolvedInput): Promise<boolean> {
    if (options.filter) {
      const srcFile = path.relative(options.dir, filePath);
      if (!this.execPathFilter(srcFile, options.filter)) return false;
    }

    let isChanged = true;
    if (this.cache) {
      isChanged = await this.cache.updateFile(filePath);
    }

    if (options.output) {
      const destPath = this.resolveDestPath(
        path.dirname(filePath),
        path.basename(filePath),
        options
      );

      if (this.cache && !isChanged) {
        if (await this.cache.isRelevantFile(destPath)) return false;
      }

      await mkdirp(path.dirname(destPath));
      await copyFile(filePath, destPath);

      if (this.cache) {
        await this.cache.updateFile(destPath);
      }

      logger.info('🧸 Asset updated:', normalizePath(destPath));
    }
  }

  async updateInclude(filePath: string, input: IResolvedInput): Promise<boolean> {
    if (this.cache) {
      const isChanged = await this.cache.updateSrc(filePath);
      if (!isChanged) return false;
    }

    if (input.output) {
      const destPath = this.resolveDestPath(
        path.dirname(filePath),
        path.basename(filePath),
        input
      );

      await mkdirp(path.dirname(destPath));
      await copyFile(filePath, destPath);

      logger.info('📄 Include updated:', normalizePath(destPath));
    }

    return true;
  }

  async updatePlugin(srcPath: string, options: IResolvedInput): Promise<boolean> {
    try {
      const success = await this.compileScript(srcPath, options);

      if (!success) return false;

      await this.updateScript(srcPath, options);
    } catch (err) {
      if (!this.options.ignoreErrors) {
        throw err;
      }

      return false;
    }

    return true;
  }

  async compileScript(srcPath: string, options: IResolvedInput): Promise<boolean> {
    if (!this.projectConfig.output.plugins) return true;

    const { name: scriptName } = path.parse(srcPath);
    const relateiveSrcPath = path.relative(process.cwd(), srcPath);
    const { fileExtensions } = this.projectConfig.compiler.config;

    const pluginDestPath = this.resolveDestPath(
      path.dirname(srcPath),
      `${scriptName}.${fileExtensions.plugin}`,
      options,
      this.projectConfig.output.plugins?.dir
    );

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

    await mkdirp(path.dirname(pluginDestPath));

    const result = await compiler({
      path: srcPath,
      dest: pluginDestPath,
      compiler: executablePath,
      includeDir: [
        path.join(this.projectConfig.compiler.dir, 'include'),
        ...this.projectConfig.include,
        ...map(
          await globule.find(
            map(this.projectConfig.input.include, input => path.join(input.dir, '**/')),
          ),
          dir => path.resolve(dir)
        ),
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

  private async buildDir(
    baseDir: string | string[],
    pattern: string,
    cb: (filePath: string) => Promise<void>
  ): Promise<void> {
    const pathPattern = map(castArray(baseDir), dir => path.join(dir, pattern));
    const matches = await globule.find(pathPattern, { nodir: true });
    await matches.reduce(
      (acc, match) => acc.then(() => cb(path.normalize(match))),
      Promise.resolve()
    );
  }

  private async watchDir(
    baseDir: string | string[],
    pattern: string,
    cb: (filePath: string) => Promise<void>
  ): Promise<void> {
    const watcher = setupWatch(baseDir);

    const updateFn = async (filePath: string) => {
      if (!this.execPathFilter(filePath, pattern)) return;

      logger.info('🔹 File change detected. Starting incremental compilation...');

      await cb(path.normalize(filePath)).catch(
        (err: Error) => logger.error(err.message)
      );

      logger.info('🔹 Compilation complete. Watching for file changes.');
    };

    watcher.on('add', updateFn);
    watcher.on('change', updateFn);
    watcher.on('unlink', (filePath: string) => {
      if (this.cache) {
        this.cache.deleteFile(filePath);
      }
    });
  }

  private initCache() {
    const ignoredIncludes = this.getNativeIncludes();

    this.cache = new Cache(
      this.projectConfig.path,
      map(this.projectConfig.input.include, 'dir'),
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

  private execPathFilter(filePath: string, filter: string | string[]) {
    if (!filter) return true;
    if (isArray(filter) && !filter.length) return true;

    return globule.isMatch(filter, filePath, {
      dot: true,
      nocase: true,
      matchBase: true
    });
  }

  private getScriptOptions(srcPath: string): IResolvedInput {
    for (const input of this.projectConfig.input.scripts) {
      if (this.execPathFilter(srcPath, path.join(input.dir, '**'))) {
        return input;
      }
    }

    return null;
  }

  private resolveDestPath(dir: string, fileName: string, inputOptions: IResolvedInput, outputDir?: string): string {
    return path.join(
      outputDir || inputOptions.output.dir,
      inputOptions.output.dest,
      inputOptions.output.flat
        ? '.'
        : path.relative(inputOptions.dir || '', dir),
      `${inputOptions.output.prefix}${fileName}`
    );
  }
}
