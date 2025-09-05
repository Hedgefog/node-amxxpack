import path from 'path';

import { TEST_TMP_DIR } from './constants';

beforeAll(() => {
  process.chdir(TEST_TMP_DIR);
});

beforeEach(() => {
  jest.clearAllMocks();
  process.chdir(TEST_TMP_DIR);
});

jest.mock('../src/common/config', () => {
  const { default: config } = jest.requireActual('../src/common/config');
  const { TEST_TMP_DIR } = jest.requireActual('./constants');
  const testDir = path.join(TEST_TMP_DIR, '__cache__');

  return {
    __esModule: true,
    ...config,
    default: {
      ...config,
      cacheFile: path.join(testDir, 'cache.json'),
      downloadDir: path.join(testDir, 'download')
    }
  };
});

jest.mock('../src/compiler', () => {
  const originalModule = jest.requireActual('../src/compiler');
  const { default: mock } = jest.requireActual('./mocks/compiler');

  return {
    __esModule: true,
    ...originalModule,
    default: mock
  };
});
