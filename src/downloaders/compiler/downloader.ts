import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import normalizePath from 'normalize-path';
import decompress from 'decompress';
import { map } from 'lodash';

import download from '../../utils/download';
import {
  resolveDist,
  resolveDownloadDistOpts,
  resolveFileName,
  resolveMetaFileName,
  resolveReleaseVersion,
  resolveVersionNum
} from './resolvers';
import { IDist, IDownloadCompilerOptions, IDistFile } from './types';
import { BASE_DIST, LATEST_RELEASE_VERSION, LATEST_RELEASE_VERSION_NUM } from './constants';
import config from '../../config';
import logger from '../../logger/logger';

async function getDistFileName(dist: IDist) {
  const releaseVersion = resolveReleaseVersion(dist.version);
  const releaseVersionNum = resolveVersionNum(releaseVersion);

  if (dist.dev) {
    return resolveFileName(dist);
  }

  // Starting from latest release (version 1.8.2) all versions are stored in the amxxdrop repository
  if (releaseVersionNum <= LATEST_RELEASE_VERSION_NUM) {
    // the latest release version is the only version we can download from the release repository
    return resolveFileName({ ...dist, version: LATEST_RELEASE_VERSION });
  }

  const metaFileName = resolveMetaFileName(dist);
  const downloadOpts = resolveDownloadDistOpts(metaFileName, dist);
  const result = await download(downloadOpts.url, downloadOpts.path);

  const fileName = await fs.promises.readFile(result.path, 'utf8');

  return fileName.trim();
}

async function downloadDist(dist: IDist): Promise<IDistFile> {
  const fileName = await getDistFileName(dist);
  if (!fileName) {
    throw new Error('Failed to fetch dist file meta!');
  }

  const downloadOpts = resolveDownloadDistOpts(fileName, dist);
  const result = await download(downloadOpts.url, downloadOpts.path);

  return { dist, path: result.path };
}

async function extractDist(archivePath: string, outDir: string) {
  logger.info(`Extracting "${path.parse(archivePath).base}"...`);

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
  const { version, dev, path: compilerPath } = options;

  const distNames = [...options.dists];
  if (!distNames.includes(BASE_DIST)) {
    distNames.unshift(BASE_DIST);
  }

  const dists = map(distNames, (distName) => resolveDist({ name: distName, version, dev }));

  logger.info('Downloading compiler...');

  const distArchives = await Promise.all(
    map(dists, downloadDist)
  );

  logger.info('Extracting compiler files...');

  for (const distArchive of distArchives) {
    await extractDist(distArchive.path, compilerPath);
  }
}

export default downloadCompiler;
