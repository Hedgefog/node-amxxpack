import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import glob from 'glob-promise';
import chokidar from 'chokidar';
import normalizePath from 'normalize-path';
import { get } from 'lodash';

import amxxpc, { AMXPCMessageType } from './amxxpc';
import Logger from '../services/logger';
import { IAmxxBuilderConfig } from './types';
import { ASSETS_PATH_PATTERN, INCLUDE_PATH_PATTERN, SCRIPTS_PATH_PATTERN } from './constants';

export default class AmxxBuilder {
  private logger: Logger;
  private config: Required<IAmxxBuilderConfig>;

  constructor(config: IAmxxBuilderConfig) {
    const { compiler, input, output, rules } = config;

    this.logger = new Logger();

    this.config = {
      compiler: {
        executable: path.resolve(compiler.executable),
        include: compiler.include.map((include) => path.resolve(include))
      },
      input: {
        scripts: path.resolve(input.scripts),
        include: path.resolve(input.include),
        assets: path.resolve(input.assets),
      },
      output: {
        scripts: path.resolve(output.scripts),
        plugins: path.resolve(output.plugins),
        include: path.resolve(output.include),
        assets: path.resolve(output.assets)
      },
      rules: {
        flatCompilation: get(rules, 'flatCompilation', true)
      }
    };
  }

  async build(): Promise<void> {
    this.logger.info('Building...');
    await this.buildAssets();
    await this.buildInclude();
    await this.buildSrc();
    this.logger.success('Build finished!');
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
    this.logger.info('Script updated:', normalizePath(destPath));
  }

  async updateAsset(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);
    const relativePath = path.relative(this.config.input.assets, filePath);
    const destPath = path.join(this.config.output.assets, relativePath);

    await mkdirp(path.parse(destPath).dir);
    await fs.promises.copyFile(srcPath, destPath);
    this.logger.info('Asset updated', normalizePath(destPath));
  }

  async updateInclude(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);
    const destPath = path.join(this.config.output.include, path.parse(filePath).base);

    await mkdirp(this.config.output.include);
    await fs.promises.copyFile(srcPath, destPath);
    this.logger.info('Include updated:', normalizePath(destPath));
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

    await mkdirp(destDir);

    const result = await amxxpc({
      path: srcPath,
      dest: destDir,
      compiler: this.config.compiler.executable,
      includeDir: [
        ...this.config.compiler.include,
        this.config.input.include,
      ]
    });

    result.output.messages.forEach((message) => {
      const { startLine, type, code, text } = message;

      if (type === AMXPCMessageType.Error || type === AMXPCMessageType.FatalError) {
        this.logger.error(`${normalizePath(relateiveSrcPath)}(${startLine})`, type, code, ':', text);
      } else if (type === AMXPCMessageType.Warning) {
        this.logger.warn(`${normalizePath(relateiveSrcPath)}(${startLine})`, type, code, ':', text);
      } else if (type === AMXPCMessageType.Echo) {
        this.logger.debug(text);
      }
    });

    if (result.success) {
      const destPath = path.join(destDir, result.plugin);
      const relativeFilePath = path.relative(process.cwd(), filePath);
      this.logger.success('Compilation success:', normalizePath(relativeFilePath));
      this.logger.info('Plugin updated:', normalizePath(destPath));
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
      (err: Error) => this.logger.error(err.message)
    );

    watcher.on('add', updateFn);
    watcher.on('change', updateFn);
  }
}
