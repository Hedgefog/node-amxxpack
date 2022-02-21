import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import mkdirp from 'mkdirp';
import normalizePath from 'normalize-path';
import decompress from 'decompress';

import { resolveFileName, resolvePlatform, resolveSource, resolveUrl } from './resolvers';
import { IDist, IDownloadCompilerOptions, IDistFile } from './types';
import { EXTENSIONS_IGNORE_LIST, SCRIPTING_DIR } from './constants';

async function downloadDist(dist: IDist): Promise<IDistFile> {
  const downloadDir = path.join(os.tmpdir(), '.amxxpack/downloads');
  await mkdirp(downloadDir);

  const fileName = resolveFileName(dist);
  const filePath = path.join(downloadDir, fileName);
  const file = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    const source = resolveSource(dist);
    const url = resolveUrl(source, fileName);
    console.log('Fetching dist from', url, '...');

    const done = () => {
      file.close();
      resolve({ dist, path: filePath });
    };

    const cancel = (err: Error) => {
      fs.unlink(filePath, () => reject(err));
    };

    const request = https.get(url, (response) => {
      if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
        cancel(new Error(`HTTP Error: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
    });

    file.on('finish', done);
    request.on('error', cancel);
    file.on('error', cancel);
  });
}

async function extractDist(archivePath: string, outDir: string) {
  await mkdirp(outDir);

  await decompress(archivePath, outDir, {
    map: (file) => {
      const newFile = { ...file };
      const filePath = normalizePath(newFile.path);
      if (filePath.startsWith(SCRIPTING_DIR)) {
        newFile.path = newFile.path.slice(SCRIPTING_DIR.length);
      }

      return newFile;
    },
    filter: (file) => {
      const filePath = normalizePath(file.path);
      if (!filePath.startsWith(SCRIPTING_DIR)) {
        return false;
      }

      const { ext } = path.parse(file.path);

      return !EXTENSIONS_IGNORE_LIST.includes(ext);
    }
  });
}

export default async function downloadCompiler(options: IDownloadCompilerOptions): Promise<void> {
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
