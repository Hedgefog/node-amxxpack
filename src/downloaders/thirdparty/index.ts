import path from 'path';
import { mkdirp } from 'mkdirp';
import decompress from 'decompress';
import globule from 'globule';
import { URL } from 'url';

import download from '../../utils/download';
import config from '../../config';
import copyFile from '../../utils/copy-file';
import logger from '../../logger/logger';
import { IDependency, IResolvedProjectConfig } from '../../types';

const SUPPORTED_ARCHIVES = ['zip', 'tar', 'tar.gz', 'tar.bz2'];

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
    await mkdirp(outDir);

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
