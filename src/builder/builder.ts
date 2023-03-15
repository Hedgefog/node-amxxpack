import path from 'path';
import mkdirp from 'mkdirp';
import globule from 'globule';
import normalizePath from 'normalize-path';
import { castArray, map } from 'lodash';

import amxxpc, { AMXPCMessageType } from './amxxpc';
import { IAssetInput, IResolvedProjectConfig } from '../types';
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

  constructor(private projectConfig: IResolvedProjectConfig) {
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
    let success = true;

    try {
      for (const scriptsDir of this.projectConfig.input.scripts) {
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

    for (const assetInput of this.projectConfig.input.assets) {
      await this.buildDir(
        assetInput.dir,
        ASSETS_PATH_PATTERN,
        (filePath: string) => this.updateAsset(filePath, assetInput)
      );
    }
  }

  async watchScripts(compileOptions: CompileOptions): Promise<void> {
    for (const scriptsDir of this.projectConfig.input.scripts) {
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

    for (const assetInput of this.projectConfig.input.assets) {
      await this.watchDir(
        assetInput.dir,
        ASSETS_PATH_PATTERN,
        (filePath: string) => this.updateAsset(filePath, assetInput)
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

    const srcPath = path.join(srcDir, srcFile);
    const destPath = path.join(this.projectConfig.output.scripts, path.parse(srcFile).base);

    await mkdirp(this.projectConfig.output.scripts);
    await copyFile(srcPath, destPath);
    logger.info('Script updated:', normalizePath(destPath));
  }

  async updateAsset(filePath: string, assetInput: IAssetInput): Promise<void> {
    const srcFile = path.relative(assetInput.dir, filePath);

    if (assetInput.filter && !this.execPathFilter(srcFile, assetInput.filter)) {
      return;
    }

    const destPath = path.join(this.projectConfig.output.assets, assetInput.dest || '', srcFile);
    await mkdirp(path.parse(destPath).dir);
    await copyFile(filePath, destPath);
    logger.info('Asset updated:', normalizePath(destPath));
  }

  async updateInclude(filePath: string): Promise<void> {
    if (!this.projectConfig.output.include) {
      return;
    }

    const destPath = path.join(this.projectConfig.output.include, path.parse(filePath).base);

    await mkdirp(this.projectConfig.output.include);
    await copyFile(filePath, destPath);
    logger.info('Include updated:', normalizePath(destPath));
  }

  async findPlugins(pattern: string): Promise<string[]> {
    const pathPattern = map(this.projectConfig.input.scripts, (dir) => path.join(dir, '**', pattern));
    const matches = await globule.find(pathPattern);

    return matches.filter((filePath) => path.extname(filePath) === '.sma');
  }

  async compilePlugin(
    srcDir: string,
    srcFile: string,
    compileOptions: CompileOptions = {}
  ): Promise<void> {
    const srcPath = path.join(srcDir, srcFile);
    const { name: scriptName, dir: srcNestedDir } = path.parse(srcFile);

    const destDir = path.join(
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
        ...this.projectConfig.input.include,
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
      (acc, match) => acc.then(() => cb(path.normalize(match))),
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

    const updateFn = (filePath: string) => cb(path.normalize(filePath)).catch(
      (err: Error) => logger.error(err.message)
    );

    watcher.on('add', updateFn);
    watcher.on('change', updateFn);
  }

  private initPluginCache() {
    this.pluginCache = new PluginsCache();
    this.pluginCache.load(config.cacheFile);
  }

  private execPathFilter(filePath: string, filter: string | string[]) {
    return globule.isMatch(filter, filePath, {
      dot: true,
      nocase: true,
      matchBase: true
    });
  }
}
