import path from 'path';
import fs from 'fs';
import _download from 'download';

export interface IDownloadResult {
  url: string;
  path: string;
}

async function download(url: string, filePath: string): Promise<IDownloadResult> {
  const { dir, base: filename } = path.parse(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  await _download(url, dir, { filename });

  return { url, path: filePath };
}

export default download;
