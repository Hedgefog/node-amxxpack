import path from 'path';
import mkdirp from 'mkdirp';
import globule from 'globule';
import normalizePath from 'normalize-path';
import { castArray, map } from 'lodash';

import amxxpc, { AMXPCMessageType } from './amxxpc';
import { IProjectConfig } from '../types';
import { ASSETS_PATH_PATTERN, INCLUDE_PATH_PATTERN, SCRIPTS_PATH_PATTERN } from './constants';
import logger from '../logger/logger';
import PluginsCache from './plugins-cache';
import copyFile from '../utils/copy-file';
import config from '../config';
import setupWatch from '../utils/setup-watch';

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

    try {
      await this.buildAssets();
      await this.buildInclude();

      const success = await this.buildScripts(compileOptions);

      if (success) {
        logger.success('Build completed successfully!');
      } else {
        logger.error('Build completed with errors!');
      }
    } catch (err: any) {
      logger.error('Build failed! Error:', err.message);
      process.exit(1);
    }
  }

  async watch(compileOptions: CompileOptions): Promise<void> {
    await this.watchAssets();
    await this.watchInclude();
    await this.watchScripts(compileOptions);
  }

  async buildScripts(compileOptions: CompileOptions): Promise<boolean> {
    const scriptsDirs = castArray(this.projectConfig.input.scripts);

    let success = true;

    try {
      for (const scriptsDir of scriptsDirs) {
        await this.buildDir(
          scriptsDir,
          SCRIPTS_PATH_PATTERN,
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          async (filePath: string) => {
            const srcFile = path.relative(scriptsDir, filePath);
            const isUpdated = await this.updatePlugin(scriptsDir, srcFile, compileOptions);
            success = success && isUpdated;
          }
        );
      }
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

    const assetsDirs = castArray(this.projectConfig.input.assets);

    for (const assetsDir of assetsDirs) {
      await this.buildDir(
        assetsDir,
        ASSETS_PATH_PATTERN,
        async (filePath: string) => {
          const assetFile = path.relative(assetsDir, filePath);
          await this.updateAsset(assetsDir, assetFile);
        }
      );
    }
  }

  async watchScripts(compileOptions: CompileOptions): Promise<void> {
    const scriptsDirs = castArray(this.projectConfig.input.scripts);

    for (const scriptsDir of scriptsDirs) {
      await this.watchDir(
        scriptsDir,
        SCRIPTS_PATH_PATTERN,
        async (filePath: string) => {
          const srcFile = path.relative(scriptsDir, filePath);
          await this.updatePlugin(scriptsDir, srcFile, compileOptions);
        }
      );
    }
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

    const assetsDirs = castArray(this.projectConfig.input.assets);

    for (const assetsDir of assetsDirs) {
      await this.watchDir(
        assetsDir,
        ASSETS_PATH_PATTERN,
        async (filePath: string) => {
          const assetFile = path.relative(assetsDir, filePath);
          await this.updateAsset(assetsDir, assetFile);
        }
      );
    }
  }

  async updatePlugin(
    srcDir: string,
    srcFile: string,
    compileOptions: CompileOptions
  ): Promise<boolean> {
    try {
      await this.compilePlugin(srcDir, srcFile, compileOptions);
    } catch (err) {
      if (!compileOptions.ignoreErrors) {
        throw err;
      }

      return false;
    }

    await this.updateScript(srcDir, srcFile);

    return true;
  }

  async updateScript(srcDir: string, srcFile: string): Promise<void> {
    if (!this.projectConfig.output.scripts) {
      return;
    }

    const srcPath = path.resolve(srcDir, srcFile);
    const destPath = path.join(this.projectConfig.output.scripts, path.parse(srcFile).base);

    await mkdirp(this.projectConfig.output.scripts);
    await copyFile(srcPath, destPath);
    logger.info('Script updated:', normalizePath(destPath));
  }

  async updateAsset(srcDir: string, srcFile: string): Promise<void> {
    const srcPath = path.resolve(srcDir, srcFile);
    const destPath = path.join(this.projectConfig.output.assets, srcFile);

    await mkdirp(path.parse(destPath).dir);
    await copyFile(srcPath, destPath);
    logger.info('Asset updated', normalizePath(destPath));
  }

  async updateInclude(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);
    const destPath = path.join(this.projectConfig.output.include, path.parse(filePath).base);

    await mkdirp(this.projectConfig.output.include);
    await copyFile(srcPath, destPath);
    logger.info('Include updated:', normalizePath(destPath));
  }

  async findPlugins(pattern: string): Promise<string[]> {
    const pathPattern = map(castArray(this.projectConfig.input.scripts), (dir) => path.join(dir, '**', pattern));
    const matches = await globule.find(pathPattern);

    return matches.filter((filePath) => path.extname(filePath) === '.sma');
  }

  async compilePlugin(
    srcDir: string,
    srcFile: string,
    compileOptions: CompileOptions = {}
  ): Promise<void> {
    const srcPath = path.resolve(srcDir, srcFile);
    const { name: scriptName, dir: srcNestedDir } = path.parse(srcFile);

    const destDir = path.resolve(
      this.projectConfig.output.plugins,
      this.projectConfig.rules.flatCompilation ? '.' : srcNestedDir
    );

    const pluginDest = path.join(destDir, `${scriptName}.amxx`);
    const isUpdated = compileOptions.noCache
      ? false
      : await this.pluginCache.isPluginUpdated(srcPath, pluginDest);

    const relateiveSrcPath = path.relative(process.cwd(), srcPath);

    if (isUpdated) {
      logger.info('Script is already up to date:', normalizePath(relateiveSrcPath), 'Skipped!');
      return;
    }

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
      const relativeFilePath = path.relative(process.cwd(), srcPath);
      logger.success('Script compiled successfully:', normalizePath(relativeFilePath));
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
    const watcher = setupWatch(pathPattern);

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
