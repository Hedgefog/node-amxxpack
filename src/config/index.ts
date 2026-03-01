import path from 'path';
import os from 'os';
import mkdirp from 'mkdirp';

const tempDir = path.join(os.tmpdir(), '.amxxpack');
mkdirp.sync(tempDir);

export default {
  downloadHost: 'https://www.amxmodx.org',
  scriptingDir: 'addons/amxmodx/scripting/',
  extensionsIgnoreList: ['.sma'],
  downloadDir: path.join(tempDir, 'downloads'),
  cacheFile: path.join(tempDir, '.cache.json'),
  projectConfig: '.amxxpack.json'
};
