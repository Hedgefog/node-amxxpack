import path from 'path';
import decompress from 'decompress';
import globule from 'globule';
import fs from 'fs';
import { URL } from 'url';

import { config, IDependency, IResolvedProjectConfig } from '@common';
import { download, copyFile } from '@utils';
import logger from '@logger';

import { SUPPORTED_ARCHIVES } from './constants';

export default class ThirdpartyDownloader {
  constructor(private readonly projectConfig: IResolvedProjectConfig) {}

  async download(): Promise<void> {
    for (const dependency of this.projectConfig.thirdparty.dependencies) {
      logger.info(`🔽 Downloading "${dependency.name}" thirdparty...`);
      await this.downloadDependency(dependency);
    }
  }

  async downloadDependency(dependency: IDependency): Promise<void> {
    const filePath = path.join(config.downloadDir, dependency.name);
    const remotePath = new URL(dependency.url).pathname;
    const { base: remoteFileName } = path.parse(remotePath) || {};
    const fileName = remoteFileName || path.parse(filePath).base;

    await download(dependency.url, filePath);

    const outDir = path.join(this.projectConfig.path, this.projectConfig.thirdparty.dir, dependency.name);
    await fs.promises.mkdir(outDir, { recursive: true });

    if (
      dependency.type === 'archive' ||
      SUPPORTED_ARCHIVES.includes(path.extname(fileName).slice(1))
    ) {
      logger.info(`📤 Extracting "${dependency.name}" thirdparty...`);

      await decompress(filePath, outDir, {
        strip: dependency.strip,
        filter: dependency.filter && (
          file => globule.isMatch(dependency.filter, file.path, {
            dot: true,
            nocase: true,
            matchBase: true
          })
        )
      });

      return;
    }

    logger.info(`➡️ Copying "${dependency.name}" thirdparty...`);

    await copyFile(filePath, path.join(outDir, fileName));
  }
}
