import path from 'path';;
import fs from 'fs';
import normalizePath from 'normalize-path';
import decompress from 'decompress';
import { map } from 'lodash';
import os from 'os';

import download, { IDownloadResult } from '../../utils/download';
import { IDist, IDistFile, IDownloadOpts } from './types';
import config from '../../common/config';
import logger from '../../logger';
import { IResolvedProjectConfig } from '../../common/types';
import { CompilerPlatform } from './constants';
import CLIError from '../../common/cli-error';

export default class CompilerDownloader {
  constructor(private readonly projectConfig: IResolvedProjectConfig) {}

  async download(): Promise<void> {
    const { compiler: compilerOpts } = this.projectConfig;
    const compilerPath = compilerOpts.dir;

    const distNames = [...compilerOpts.addons];

    const baseDist = this.projectConfig.compiler.config.downloader.baseDist;

    if (!distNames.includes(baseDist)) {
      distNames.unshift(baseDist);
    }

    const dists = map(distNames, distName => this.resolveDist({
      type: this.projectConfig.type,
      name: distName,
      version: compilerOpts.version,
      dev: compilerOpts.dev
    }));

    logger.info('🔽 Downloading compiler...');

    const distArchives = await Promise.all(
      map(dists, dist => this.downloadDist(dist))
    );

    logger.info('📤 Extracting compiler files...');

    for (const distArchive of distArchives) {
      await this.extractDist(distArchive.path, compilerPath);
    }
  }

  private async downloadDist(dist: IDist): Promise<IDistFile> {
    const fileName = await this.getDistFileName(dist);
    if (!fileName) {
      throw new CLIError('Failed to fetch dist file meta!');
    }

    const downloadOpts = this.resolveDownloadDistOpts(fileName, dist);
    const result = await this.downloadFile(downloadOpts);

    return { dist, path: result.path };
  }

  private async extractDist(archivePath: string, outDir: string) {
    const { fileExtensions } = this.projectConfig.compiler.config;

    logger.info(`📤 Extracting "${path.parse(archivePath).base}"...`);

    await fs.promises.mkdir(outDir, { recursive: true });

    await decompress(archivePath, outDir, {
      map: file => {
        const newFile = { ...file };
        const filePath = normalizePath(newFile.path);
        if (filePath.startsWith(this.projectConfig.compiler.config.downloader.compilerDir)) {
          newFile.path = path.relative(this.projectConfig.compiler.config.downloader.compilerDir, newFile.path);
        }

        return newFile;
      },
      filter: file => {
        const filePath = normalizePath(file.path);
        if (!filePath.startsWith(this.projectConfig.compiler.config.downloader.compilerDir)) {
          return false;
        }

        return fileExtensions.script !== path.extname(file.path).slice(1);
      }
    });
  }

  private async getDistFileName(dist: IDist) {
    if (dist.dev) {
      return this.resolveFileName(dist);
    }

    if (!this.projectConfig.compiler.config.downloader.useMetaFile) {
      return this.resolveFileName({ ...dist, version: this.projectConfig.compiler.version });
    }

    const metaFileName = this.resolveMetaFileName(dist);
    const downloadOpts = this.resolveDownloadDistOpts(metaFileName, dist);
    const result = await this.downloadFile(downloadOpts);

    const fileName = await fs.promises.readFile(result.path, 'utf8');

    return fileName.trim();
  }

  private resolveDist(options: Partial<IDist> & { type: string }) {
    const baseDist = this.projectConfig.compiler.config.downloader.baseDist;

    const { type, name = baseDist, dev = false } = options;

    const version = dev
      ? options.version
      : this.resolveReleaseVersion(options.version || this.projectConfig.compiler.config.defaultVersion);

    if (options.version !== version && name === baseDist) {
      logger.warn(`The "${options.version}" version format is redundant. Change the compiler version to "${version}" in the project configuration to remove this warning.`);
    }

    const platform = this.resolvePlatform();

    return { type, name, version, platform, dev };
  }

  private resolveSource(dist: IDist) {
    const urlPath: string[] = [this.projectConfig.compiler.config.downloader.distSource];

    const releaseVersion = this.resolveReleaseVersion(dist.version);
    urlPath.push(releaseVersion);

    return urlPath.join('/');
  }

  private resolveDownloadDistOpts(fileName: string, dist: IDist): IDownloadOpts {
    const filePath = path.join(config.downloadDir, fileName);
    const source = this.resolveSource(dist);
    const url = this.resolveUrl(source, fileName);

    return { url, path: filePath };
  }

  private resolveUrl(source: string, file: string) {
    return `${this.projectConfig.compiler.config.downloader.downloadHost}/${source}/${file}`;
  }

  private resolveReleaseVersion(version: string) {
    return version.split('.').slice(0, 2).join('.');
  }

  private resolveFileName({ type: library, name: dist, version, platform }: IDist) {
    const ext = platform === 'linux' ? '.tar.gz' : '.zip';

    return [library, version, dist, `${platform}${ext}`].filter(Boolean).join('-');
  }

  private resolveMetaFileName({ type: library, name: dist, platform }: IDist) {
    return [library, 'latest', dist, `${platform}`].filter(Boolean).join('-');
  }

  private resolvePlatform() {
    const platform = os.platform();

    switch (platform) {
      case 'win32': return CompilerPlatform.Windows;
      case 'linux': return CompilerPlatform.Linux;
      case 'darwin': return CompilerPlatform.Mac;
    }

    throw new CLIError(`Unable to resolve platform for ${platform}`);
  }

  private async downloadFile(downloadOpts: IDownloadOpts): Promise<IDownloadResult> {
    logger.debug(`Downloading file from "${downloadOpts.url}" to "${downloadOpts.path}"`);
    const result = await download(downloadOpts.url, downloadOpts.path);

    return result;
  }
}
