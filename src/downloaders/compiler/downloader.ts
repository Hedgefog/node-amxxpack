import path from 'path';
import mkdirp from 'mkdirp';
import normalizePath from 'normalize-path';
import decompress from 'decompress';

import download from '../../utils/download';
import { resolveFileName, resolvePlatform, resolveSource, resolveUrl } from './resolvers';
import config from '../../config';
import { IDist, IDownloadCompilerOptions, IDistFile } from './types';

async function downloadDist(dist: IDist): Promise<IDistFile> {
  const fileName = resolveFileName(dist);
  const filePath = path.join(config.downloadDir, fileName);
  const source = resolveSource(dist);
  const url = resolveUrl(source, fileName);

  const result = await download(url, filePath);

  return { dist, path: result.path };
}

async function extractDist(archivePath: string, outDir: string) {
  await mkdirp(outDir);

  await decompress(archivePath, outDir, {
    map: (file) => {
      const newFile = { ...file };
      const filePath = normalizePath(newFile.path);
      if (filePath.startsWith(config.scriptingDir)) {
        newFile.path = newFile.path.slice(config.scriptingDir.length);
      }

      return newFile;
    },
    filter: (file) => {
      const filePath = normalizePath(file.path);
      if (!filePath.startsWith(config.scriptingDir)) {
        return false;
      }

      const { ext } = path.parse(file.path);

      return !config.extensionsIgnoreList.includes(ext);
    }
  });
}

async function downloadCompiler(options: IDownloadCompilerOptions): Promise<void> {
  const { version, dev, dists, path: compilerPath } = options;

  const platform = resolvePlatform();

  const newDists = [...dists];
  if (!newDists.includes('base')) {
    newDists.unshift('base');
  }

  for (const dist of newDists) {
    const distArchive = await downloadDist({ name: dist, version, platform, dev });
    await extractDist(distArchive.path, compilerPath);
  }
}

export default downloadCompiler;
