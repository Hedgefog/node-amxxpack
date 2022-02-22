import path from 'path';
import os from 'os';

export default {
  downloadHost: 'https://www.amxmodx.org',
  scriptingDir: 'addons/amxmodx/scripting/',
  extensionsIgnoreList: ['.sma'],
  downloadDir: path.join(os.tmpdir(), '.amxxpack/downloads')
};
