import os from 'os';
import path from 'path';

export const TEST_TMP_DIR = path.join(os.tmpdir(), 'amxxpack-tests');
export const TEST_PROJECTS_DIR = path.join(TEST_TMP_DIR, 'projects');
