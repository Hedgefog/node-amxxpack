import path from 'path';
import os from 'os';
import mkdirp from 'mkdirp';
import decompress from 'decompress';

import download from '../../utils/download';
import { IDownloadThirdpartyOptions } from './types';

async function downloadThirdparty(options: IDownloadThirdpartyOptions): Promise<void> {
  const downloadDir = path.join(os.tmpdir(), '.amxxpack/downloads');
  await mkdirp(downloadDir);
  const filePath = path.resolve(downloadDir, options.name);
  await download(options.url, filePath);

  const outDir = path.resolve(options.dir);
  await mkdirp(outDir);

  await decompress(filePath, outDir);
}

export default downloadThirdparty;
