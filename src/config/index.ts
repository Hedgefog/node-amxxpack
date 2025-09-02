import path from 'path';
import os from 'os';
import { mkdirp } from 'mkdirp';

const tempDir = path.join(os.tmpdir(), '.amxxpack');
mkdirp.sync(tempDir);

export default {
  projectConfig: '.amxxpack.json',
  downloadDir: path.join(tempDir, 'downloads'),
  cacheFile: path.join(tempDir, '.cache.json'),
  defaultProjectType: 'amxmodx',
};
