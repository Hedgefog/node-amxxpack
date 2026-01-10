import path from 'path';
import fs from 'fs';

import { TEST_TMP_DIR } from './constants';

const cwd = process.cwd();

beforeAll(() => {
  fs.mkdirSync(TEST_TMP_DIR, { recursive: true });
  process.chdir(TEST_TMP_DIR);
});

beforeEach(() => {
  jest.clearAllMocks();
  process.chdir(TEST_TMP_DIR);
});

afterAll(() => {
  process.chdir(cwd);
});

jest.mock('../src/common/config', () => {
  process.env.RESOURCES_DIR = path.join(process.cwd(), 'resources');

  const { default: config } = jest.requireActual('../src/common/config');
  const { TEST_TMP_DIR } = jest.requireActual('./constants');
  const cacheDir = path.join(TEST_TMP_DIR, '__cache__');

  fs.mkdirSync(cacheDir, { recursive: true });

  return {
    __esModule: true,
    ...config,
    default: {
      ...config,
      cacheDir: path.join(cacheDir, 'cache'),
      downloadDir: path.join(cacheDir, 'download')
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
