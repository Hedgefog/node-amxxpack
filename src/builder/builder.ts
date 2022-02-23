import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import glob from 'glob-promise';
import chokidar from 'chokidar';
import normalizePath from 'normalize-path';

import amxxpc, { AMXPCMessageType } from './amxxpc';
import { IProjectConfig } from '../types';
import { ASSETS_PATH_PATTERN, INCLUDE_PATH_PATTERN, SCRIPTS_PATH_PATTERN } from './constants';
import logger from '../logger/logger';

export default class AmxxBuilder {
  constructor(private config: IProjectConfig) {}

  async build(): Promise<void> {
    logger.info('Building...');
    await this.buildAssets();
    await this.buildInclude();
    await this.buildSrc();
    logger.success('Build finished!');
  }

  async watch(): Promise<void> {
    await this.watchAssets();
    await this.watchInclude();
    await this.watchSrc();
  }

  async buildSrc(): Promise<void> {
    await this.buildDir(
      this.config.input.scripts,
      SCRIPTS_PATH_PATTERN,
      (filePath: string) => this.updatePlugin(filePath)
    );
  }

  async buildInclude(): Promise<void> {
    await this.buildDir(
      this.config.input.include,
      INCLUDE_PATH_PATTERN,
      (filePath: string) => this.updateInclude(filePath)
    );
  }

  async buildAssets(): Promise<void> {
    await this.buildDir(
      this.config.input.assets,
      ASSETS_PATH_PATTERN,
      (filePath: string) => this.updateAsset(filePath)
    );
  }

  async watchSrc(): Promise<void> {
    await this.watchDir(
      this.config.input.scripts,
      SCRIPTS_PATH_PATTERN,
      (filePath: string) => this.updatePlugin(filePath)
    );
  }

  async watchInclude(): Promise<void> {
    await this.watchDir(
      this.config.input.include,
      INCLUDE_PATH_PATTERN,
      (filePath: string) => this.updateInclude(filePath)
    );
  }

  async watchAssets(): Promise<void> {
    await this.watchDir(
      this.config.input.assets,
      ASSETS_PATH_PATTERN,
      (filePath: string) => this.updateAsset(filePath)
    );
  }

  async updatePlugin(filePath: string): Promise<void> {
    await this.updateScript(filePath);
    await this.compilePlugin(filePath);
  }

  async updateScript(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);
    const destPath = path.join(this.config.output.scripts, path.parse(filePath).base);

    await mkdirp(this.config.output.scripts);
    await fs.promises.copyFile(srcPath, destPath);
    logger.info('Script updated:', normalizePath(destPath));
  }

  async updateAsset(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);
    const relativePath = path.relative(this.config.input.assets, filePath);
    const destPath = path.join(this.config.output.assets, relativePath);

    await mkdirp(path.parse(destPath).dir);
    await fs.promises.copyFile(srcPath, destPath);
    logger.info('Asset updated', normalizePath(destPath));
  }

  async updateInclude(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);
    const destPath = path.join(this.config.output.include, path.parse(filePath).base);

    await mkdirp(this.config.output.include);
    await fs.promises.copyFile(srcPath, destPath);
    logger.info('Include updated:', normalizePath(destPath));
  }

  async findPlugins(pattern: string): Promise<string[]> {
    const pathPattern = path.join(this.config.input.scripts, '**', pattern);
    const matches = await glob(pathPattern);

    return matches;
  }

  async compilePlugin(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);

    let destDir = path.resolve(this.config.output.plugins);
    if (!this.config.rules.flatCompilation) {
      const srcDir = path.parse(srcPath).dir;
      destDir = path.join(destDir, path.relative(this.config.input.scripts, srcDir));
    }

    const relateiveSrcPath = path.relative(process.cwd(), srcPath);
    const executable = path.join(this.config.compiler.dir, this.config.compiler.executable);

    await mkdirp(destDir);

    const result = await amxxpc({
      path: srcPath,
      dest: destDir,
      compiler: executable,
      includeDir: [
        path.join(this.config.compiler.dir, 'include'),
        ...this.config.include,
        this.config.input.include,
      ]
    });

    result.output.messages.forEach((message) => {
      const { startLine, type, code, text } = message;

      if (type === AMXPCMessageType.Error || type === AMXPCMessageType.FatalError) {
        logger.error(`${normalizePath(relateiveSrcPath)}(${startLine})`, type, code, ':', text);
      } else if (type === AMXPCMessageType.Warning) {
        logger.warn(`${normalizePath(relateiveSrcPath)}(${startLine})`, type, code, ':', text);
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
    baseDir: string,
    pattern: string,
    cb: (filePath: string) => any
  ): Promise<void> {
    const pathPattern = path.join(baseDir, pattern);
    const matches = await glob(pathPattern, { nodir: true });
    await matches.reduce(
      (acc, match) => acc.then(() => cb(match)),
      Promise.resolve()
    );
  }

  private async watchDir(
    baseDir: string,
    pattern: string,
    cb: (filePath: string) => any
  ): Promise<void> {
    const pathPattern = path.join(baseDir, pattern);
    const watcher = chokidar.watch(pathPattern, { ignoreInitial: true });

    const updateFn = (filePath: string) => cb(filePath).catch(
      (err: Error) => logger.error(err.message)
    );

    watcher.on('add', updateFn);
    watcher.on('change', updateFn);
  }
}
