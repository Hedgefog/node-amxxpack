import os from 'os';
import path from 'path';

import { BASE_DIST, CompilerPlatform, DistSource, LATEST_RELEASE_VERSION, LATEST_RELEASE_VERSION_NUM } from './constants';
import config from '../../config';
import { IDist } from './types';
import logger from '../../logger/logger';

export function resolveVersionNum(version: string) {
  const versionSegments = version.split('.').slice(0, 3);

  for (let i = 0; i < 3 - versionSegments.length; ++i) {
    versionSegments.push('0');
  }

  return parseInt(versionSegments.join(''), 10);
}

export function resolveReleaseVersion(version: string) {
  return version.split('.').slice(0, 2).join('.');
}

export function resolveFileName({ name: dist, version, platform }: IDist) {
  const ext = platform === 'linux' ? '.tar.gz' : '.zip';
  return `amxmodx-${version}-${dist}-${platform}${ext}`;
}

export function resolveMetaFileName({ name: dist, platform }: IDist) {
  return `amxmodx-latest-${dist}-${platform}`;
}

export function resolvePlatform() {
  const platform = os.platform();

  switch (platform) {
    case 'win32': return CompilerPlatform.Windows;
    case 'linux': return CompilerPlatform.Linux;
    case 'darwin': return CompilerPlatform.Mac;
  }

  throw new Error(`Unable to resolve platform for ${platform}`);
}

export function resolveUrl(source: string, file: string) {
  return `${config.downloadHost}/${source}/${file}`;
}

export function resolveSource({ dev, version }: IDist) {
  const releaseVersion = resolveReleaseVersion(version);
  const releaseVersionNum = resolveVersionNum(releaseVersion);
  const isNewVersion = releaseVersionNum > LATEST_RELEASE_VERSION_NUM;
  const distSource = dev || isNewVersion ? DistSource.AmxxDrop : DistSource.Release;

  const urlPath: string[] = [distSource];

  if (distSource === DistSource.AmxxDrop) {
    urlPath.push(releaseVersion);
  }

  return urlPath.join('/');
}

export function resolveDownloadDistOpts(fileName: string, dist: IDist) {
  const filePath = path.join(config.downloadDir, fileName);
  const source = resolveSource(dist);
  const url = resolveUrl(source, fileName);

  return { url, path: filePath };
}

export function resolveDist(options: Partial<IDist>) {
  const { name = BASE_DIST, dev = false } = options;

  const version = dev
    ? options.version
    : resolveReleaseVersion(options.version || LATEST_RELEASE_VERSION);

  if (options.version !== version && name === BASE_DIST) {
    logger.warn(`The "${options.version}" version format is redundant. Change the compiler version to "${version}" in the project configuration to remove this warning.`);
  }

  const platform = resolvePlatform();

  return { name, version, platform, dev };
}
