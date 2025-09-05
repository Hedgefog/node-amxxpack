import fs from 'fs';

import { TEST_TMP_DIR } from './constants';

module.exports = async () => {
  fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
};
