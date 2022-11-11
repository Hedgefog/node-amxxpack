import path from 'path';
import mkdirp from 'mkdirp';
import globule from 'globule';
import chokidar from 'chokidar';
import normalizePath from 'normalize-path';
import { castArray, map } from 'lodash';

import amxxpc, { AMXPCMessageType } from './amxxpc';
import { IProjectConfig } from '../types';
import { ASSETS_PATH_PATTERN, INCLUDE_PATH_PATTERN, SCRIPTS_PATH_PATTERN } from './constants';
import logger from '../logger/logger';
import findRelativePath from '../utils/find-relative-path';
import PluginsCache from './plugins-cache';
import config from '../config';

export interface CompileOptions {
  ignoreErrors?: boolean;
  noCache?: boolean;
}

export default class AmxxBuilder {
  private pluginCache: PluginsCache;

  constructor(private projectConfig: IProjectConfig) {
    this.initPluginCache();
  }

  async build(compileOptions: CompileOptions): Promise<void> {
    logger.info('Building...');

    await this.buildAssets();
    await this.buildInclude();

    const success = await this.buildSrc(compileOptions);

    if (success) {
      logger.success('Build finished!');
    } else {
      logger.error('Build finished with errors!');
    }
  }

  async watch(compileOptions: CompileOptions): Promise<void> {
    await this.watchAssets();
    await this.watchInclude();
    await this.watchSrc(compileOptions);
  }

  async buildSrc(compileOptions: CompileOptions): Promise<boolean> {
    let success = true;

    try {
      await this.buildDir(
        this.projectConfig.input.scripts,
        SCRIPTS_PATH_PATTERN,
        async (filePath: string) => {
          success = await this.updatePlugin(filePath, compileOptions) && success;
        }
      );
    } finally {
      if (!compileOptions.noCache) {
        this.pluginCache.save(config.cacheFile);
      }
    }

    return success;
  }

  async buildInclude(): Promise<void> {
    await this.buildDir(
      this.projectConfig.input.include,
      INCLUDE_PATH_PATTERN,
      (filePath: string) => this.updateInclude(filePath)
    );
  }

  async buildAssets(): Promise<void> {
    if (!this.projectConfig.input.assets) {
      return;
    }

    await this.buildDir(
      this.projectConfig.input.assets,
      ASSETS_PATH_PATTERN,
      (filePath: string) => this.updateAsset(filePath)
    );
  }

  async watchSrc(compileOptions: CompileOptions): Promise<void> {
    await this.watchDir(
      this.projectConfig.input.scripts,
      SCRIPTS_PATH_PATTERN,
      (filePath: string) => this.updatePlugin(filePath, compileOptions)
    );
  }

  async watchInclude(): Promise<void> {
    await this.watchDir(
      this.projectConfig.input.include,
      INCLUDE_PATH_PATTERN,
      (filePath: string) => this.updateInclude(filePath)
    );
  }

  async watchAssets(): Promise<void> {
    if (!this.projectConfig.input.assets) {
      return;
    }

    await this.watchDir(
      this.projectConfig.input.assets,
      ASSETS_PATH_PATTERN,
      (filePath: string) => this.updateAsset(filePath)
    );
  }

  async updatePlugin(filePath: string, compileOptions: CompileOptions): Promise<boolean> {
    await this.updateScript(filePath);

    try {
      await this.compilePlugin(filePath, compileOptions);
    } catch (err) {
      if (!compileOptions.ignoreErrors) {
        throw err;
      }

      return false;
    }

    return true;
  }

  async updateScript(filePath: string): Promise<void> {
    if (!this.projectConfig.output.scripts) {
      return;
    }

    const srcPath = path.resolve(filePath);
    const destPath = path.join(this.projectConfig.output.scripts, path.parse(filePath).base);

    await mkdirp(this.projectConfig.output.scripts);
    await fs.promises.copyFile(srcPath, destPath);
    logger.info('Script updated:', normalizePath(destPath));
  }

  async updateAsset(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);

    const relativePath = findRelativePath(castArray(this.projectConfig.input.assets), filePath);
    if (!relativePath) {
      throw new Error(`Cannot find relative path for asset "${filePath}"`);
    }

    const destPath = path.join(this.projectConfig.output.assets, relativePath);

    await mkdirp(path.parse(destPath).dir);
    await fs.promises.copyFile(srcPath, destPath);
    logger.info('Asset updated', normalizePath(destPath));
  }

  async updateInclude(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);
    const destPath = path.join(this.projectConfig.output.include, path.parse(filePath).base);

    await mkdirp(this.projectConfig.output.include);
    await fs.promises.copyFile(srcPath, destPath);
    logger.info('Include updated:', normalizePath(destPath));
  }

  async findPlugins(pattern: string): Promise<string[]> {
    const pathPattern = map(castArray(this.projectConfig.input.scripts), (dir) => path.join(dir, '**', pattern));
    const matches = await globule.find(pathPattern);

    return matches.filter((filePath) => path.extname(filePath) === '.sma');
  }

  async compilePlugin(filePath: string, compileOptions: CompileOptions = {}): Promise<void> {
    const srcPath = path.resolve(filePath);
    const parsedSrcPath = path.parse(srcPath);

    let destDir = path.resolve(this.projectConfig.output.plugins);
    if (!this.projectConfig.rules.flatCompilation) {
      const srcDir = parsedSrcPath.dir;

      const relativePath = findRelativePath(castArray(this.projectConfig.input.scripts), srcDir);
      if (!relativePath) {
        throw new Error(`Cannot find relative path for plugin "${filePath}"`);
      }

      destDir = path.join(destDir, relativePath);
    }

    const pluginDest = path.join(destDir, `${parsedSrcPath.name}.amxx`);
    const isUpdated = compileOptions.noCache
      ? false
      : await this.pluginCache.isPluginUpdated(srcPath, pluginDest);

    if (isUpdated) {
      logger.info('Plugin is already up to date. Skipped!');
      return;
    }

    const relateiveSrcPath = path.relative(process.cwd(), srcPath);

    const executablePath = path.join(
      this.projectConfig.compiler.dir,
      this.projectConfig.compiler.executable
    );

    await mkdirp(destDir);

    const result = await amxxpc({
      path: srcPath,
      dest: pluginDest,
      compiler: executablePath,
      includeDir: [
        path.join(this.projectConfig.compiler.dir, 'include'),
        ...this.projectConfig.include,
        ...castArray(this.projectConfig.input.include),
      ]
    });

    if (!compileOptions.noCache) {
      if (!result.error) {
        await this.pluginCache.updatePlugin(srcPath, pluginDest);
      } else {
        await this.pluginCache.deletePlugin(srcPath);
      }
    }

    result.output.messages.forEach((message) => {
      const { startLine, type, code, text, filename } = message;
      const relativeFilePath = filename ? path.relative(process.cwd(), filename) : relateiveSrcPath;

      if (type === AMXPCMessageType.Error || type === AMXPCMessageType.FatalError) {
        logger.error(`${normalizePath(relativeFilePath)}(${startLine})`, type, code, ':', text);
      } else if (type === AMXPCMessageType.Warning) {
        logger.warn(`${normalizePath(relativeFilePath)}(${startLine})`, type, code, ':', text);
      } else if (type === AMXPCMessageType.Echo) {
        logger.debug(text);
      }
    });

    if (result.success) {
      const destPath = path.join(destDir, result.plugin);
      const relativeFilePath = path.relative(process.cwd(), filePath);
      logger.success('Compilation success:', normalizePath(relativeFilePath));
      logger.info('Plugin updated:', normalizePath(destPath));
    } else {
      throw new Error(`Failed to compile ${normalizePath(relateiveSrcPath)} : "${result.error}"`);
    }
  }

  private async buildDir(
    baseDir: string | string[],
    pattern: string,
    cb: (filePath: string) => any
  ): Promise<void> {
    const pathPattern = map(castArray(baseDir), (dir) => path.join(dir, pattern));
    const matches = await globule.find(pathPattern, { nodir: true });
    await matches.reduce(
      (acc, match) => acc.then(() => cb(match)),
      Promise.resolve()
    );
  }

  private async watchDir(
    baseDir: string | string[],
    pattern: string,
    cb: (filePath: string) => any
  ): Promise<void> {
    const pathPattern = map(castArray(baseDir), (dir) => path.join(dir, pattern));
    const watcher = chokidar.watch(pathPattern, { ignoreInitial: true, interval: 300 });

    const updateFn = (filePath: string) => cb(filePath).catch(
      (err: Error) => logger.error(err.message)
    );

    watcher.on('add', updateFn);
    watcher.on('change', updateFn);
  }

  private initPluginCache() {
    this.pluginCache = new PluginsCache();
    this.pluginCache.load(config.cacheFile);
  }
}
