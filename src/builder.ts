import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import glob from 'glob-promise';
import chokidar from 'chokidar';
import normalizePath from 'normalize-path';

import amxxpc, { AMXPCMessageType } from './amxxpc';
import Logger from './logger';

export interface IAmxxBuilderConfig {
  compiler: {
    executable: string;
    include: string[];
  };
  input: {
    scripts: string;
    include: string;
    assets: string;
  };
  output: {
    scripts: string;
    plugins: string;
    include: string;
    assets: string;
  };
}

export default class AmxxBuilder {
  private logger: Logger;
  private config: IAmxxBuilderConfig;

  constructor(config: IAmxxBuilderConfig) {
    const { compiler, input, output } = config;

    this.logger = new Logger();

    this.config = {
      compiler: {
        include: compiler.include.map((include) => path.resolve(include)),
        executable: path.resolve(compiler.executable)
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
      }
    };
  }

  async build(): Promise<void> {
    await this.buildSrc();
    await this.buildAssets();
    await this.buildInclude();
  }

  async watch(): Promise<void> {
    await this.watchSrc();
    await this.watchAssets();
    await this.watchInclude();
  }

  async buildSrc(): Promise<void> {
    const pathPattern = path.join(this.config.input.scripts, '**/*.sma');
    const matches = await glob(pathPattern, { nodir: true });
    matches.map((filePath) => this.updatePlugin(filePath));
  }

  async buildInclude(): Promise<void> {
    const pathPattern = path.join(this.config.input.include, '**/*.inc');
    const matches = await glob(pathPattern, { nodir: true });
    matches.map((filePath) => this.updateInclude(filePath));
  }

  async buildAssets(): Promise<void> {
    const pathPattern = path.join(this.config.input.assets, '**/*.*');
    const matches = await glob(pathPattern, { nodir: true });
    matches.map((filePath) => this.updateAsset(filePath));
  }

  async watchSrc(): Promise<void> {
    const pathPattern = path.join(this.config.input.scripts, '**/*.sma');
    const watcher = chokidar.watch(pathPattern, { ignoreInitial: true });

    const updateFn = (filePath: string) => (
      this.updatePlugin(filePath)
        .catch((err) => this.logger.error(err.message))
    );

    watcher.on('add', updateFn);
    watcher.on('change', updateFn);
  }

  async watchAssets(): Promise<void> {
    const pathPattern = path.join(this.config.input.assets, '**/*.*');
    const watcher = chokidar.watch(pathPattern, { ignoreInitial: true });

    const updateFn = (filePath: string) => (
      this.updateAsset(filePath)
        .catch((err) => this.logger.error(err.message))
    );

    watcher.on('add', updateFn);
    watcher.on('change', updateFn);
  }

  async watchInclude(): Promise<void> {
    const pathPattern = path.join(this.config.input.include, '**/*.inc');
    const watcher = chokidar.watch(pathPattern, { ignoreInitial: true });

    const updateFn = (filePath: string) => (
      this.updateInclude(filePath)
        .catch((err) => this.logger.error(err.message))
    );

    watcher.on('add', updateFn);
    watcher.on('change', updateFn);
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
    this.logger.info(`Script updated: ${normalizePath(destPath)}`);
  }

  async updateAsset(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);
    const relativePath = path.relative(this.config.input.assets, filePath);
    const destPath = path.join(this.config.output.assets, relativePath);

    await mkdirp(path.parse(destPath).dir);

    await fs.promises.copyFile(srcPath, destPath);
    this.logger.info(`Asset updated: ${normalizePath(destPath)}`);
  }

  async updateInclude(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);
    const destPath = path.join(this.config.output.include, path.parse(filePath).base);

    await mkdirp(this.config.output.include);
    await fs.promises.copyFile(srcPath, destPath);
    this.logger.info(`Include updated: ${normalizePath(destPath)}`);
  }

  async findPlugins(pattern: string): Promise<string[]> {
    const pathPattern = path.join(this.config.input.scripts, '**', pattern);
    const matches = await glob(pathPattern);

    return matches;
  }

  async compilePlugin(filePath: string): Promise<void> {
    const srcPath = path.resolve(filePath);
    const destDir = path.resolve(this.config.output.plugins);
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
        this.logger.error(`${normalizePath(relateiveSrcPath)}(${startLine}) : ${type} ${code}: ${text}`);
      } else if (type === AMXPCMessageType.Warning) {
        this.logger.warn(`${normalizePath(relateiveSrcPath)}(${startLine}) : ${type} ${code}: ${text}`);
      } else if (type === AMXPCMessageType.Echo) {
        this.logger.debug(text);
      }
    });

    if (result.success) {
      const destPath = path.join(destDir, result.plugin);
      const relativeFilePath = path.relative(process.cwd(), filePath);
      this.logger.info(`Compilation success: ${normalizePath(relativeFilePath)}`);
      this.logger.info(`Plugin updated: ${normalizePath(destPath)}`);
    } else {
      throw new Error(`Failed to compile ${normalizePath(relateiveSrcPath)} : "${result.error}"`);
    }
  }
}
