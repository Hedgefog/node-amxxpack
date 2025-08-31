import path from 'path';
import mkdirp from 'mkdirp';
import decompress from 'decompress';
import globule from 'globule';
import { URL } from 'url';

import download from '../../utils/download';
import { IDownloadThirdpartyOptions } from './types';
import config from '../../config';
import copyFile from '../../utils/copy-file';
import logger from '../../logger/logger';

const SUPPORTED_ARCHIVES = ['.zip', '.tar', '.tar.gz', '.tar.bz2'];

async function downloadThirdparty(options: IDownloadThirdpartyOptions): Promise<void> {
  const filePath = path.join(config.downloadDir, options.name);
  const remotePath = new URL(options.url).pathname;
  const { base: remoteFileName } = path.parse(remotePath) || {};
  const fileName = remoteFileName || path.parse(filePath).base;

  logger.info(`Downloading "${options.name}" thirdparty...`);

  await download(options.url, filePath);

  const outDir = path.join(options.dir, options.name);
  await mkdirp(outDir);

  if (SUPPORTED_ARCHIVES.includes(path.extname(fileName))) {
    logger.info(`Extracting "${options.name}" thirdparty...`);

    await decompress(filePath, outDir, {
      strip: options.strip,
      filter: options.filter && (
        (file) => globule.isMatch(options.filter, file.path, {
          dot: true,
          nocase: true,
          matchBase: true
        })
      )
    });

    return;
  }

  logger.info(`Copying "${options.name}" thirdparty...`);

  await copyFile(filePath, path.join(outDir, fileName));
}

export default downloadThirdparty;
