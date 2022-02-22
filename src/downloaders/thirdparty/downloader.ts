import path from 'path';
import mkdirp from 'mkdirp';
import decompress from 'decompress';

import download from '../../utils/download';
import { IDownloadThirdpartyOptions } from './types';
import config from '../../config';

async function downloadThirdparty(options: IDownloadThirdpartyOptions): Promise<void> {
  const filePath = path.resolve(config.downloadDir, options.name);
  await download(options.url, filePath);

  const outDir = path.resolve(options.dir);
  await mkdirp(outDir);

  await decompress(filePath, outDir);
}

export default downloadThirdparty;
