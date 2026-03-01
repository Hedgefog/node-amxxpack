import path from 'path';
import os from 'os';
import fs from 'fs';

const tempDir = path.join(os.tmpdir(), '.amxxpack');
fs.mkdirSync(tempDir, { recursive: true });

const resourcesDir = process.env.RESOURCES_DIR || path.resolve(require.main.path, '..', 'resources');

export default {
  title: 'AMXXPack',
  command: 'amxxpack',
  downloadDir: path.join(tempDir, 'downloads'),
  cacheDir: path.join(tempDir, 'cache'),
  resourcesDir,
  templatesDir: path.join(resourcesDir, 'templates'),
  projectTypesDir: path.resolve(resourcesDir, 'project-types'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  version: require('../../../package.json').version,
  project: {
    defaultVersion: '0.1.0',
    configFile: '.amxxpack.json',
    defaultType: 'amxmodx'
  }
};
