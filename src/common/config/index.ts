import path from 'path';
import os from 'os';
import fs from 'fs';

const tempDir = path.join(os.tmpdir(), '.amxxpack');
fs.mkdirSync(tempDir, { recursive: true });

export default {
  title: 'AMXXPack',
  command: 'amxxpack',
  downloadDir: path.join(tempDir, 'downloads'),
  cacheFile: path.join(tempDir, '.cache.json'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  version: require('../../../package.json').version,
  project: {
    defaultVersion: '0.1.0',
    configFile: '.amxxpack.json',
    defaultType: 'amxmodx'
  }
};
