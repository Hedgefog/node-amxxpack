import path from 'path';
import _download from 'download';
import mkdirp from 'mkdirp';

interface IDownloadResult {
  url: string;
  path: string;
}

async function download(url: string, filePath: string): Promise<IDownloadResult> {
  const { dir, base: filename } = path.parse(filePath);
  await mkdirp(dir);
  await _download(url, dir, { filename });

  return { url, path: filePath };
}

export default download;
