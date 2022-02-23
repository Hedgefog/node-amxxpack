import os from 'os';

import { CompilerPlatform, DistSource } from './constants';
import config from '../../config';
import { IDist } from './types';

export function resolveSource({ dev, version }: IDist) {
  const urlPath: string[] = [
    dev ? DistSource.Dev : DistSource.Release
  ];

  if (dev) {
    urlPath.push(
      version.split('.').slice(0, 2).join('.')
    );
  }

  return urlPath.join('/');
}

export function resolveFileName({ name: dist, version, platform }: IDist) {
  const ext = platform === 'linux' ? '.tar.gz' : '.zip';
  return `amxmodx-${version}-${dist}-${platform}${ext}`;
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
