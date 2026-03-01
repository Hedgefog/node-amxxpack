import type { PartialDeep } from 'type-fest';
import path from 'path';
import fs from 'fs';

import logger from '../logger/logger';
import { IProjectConfig, IResolvedProjectConfig } from '../types';
import resolve from './resolve';

async function load(_configPath?: string | null, projectDir: string = ''): Promise<IResolvedProjectConfig> {
  const resolvePath = (p: string) => path.resolve(projectDir, p);
  const configPath = resolvePath(_configPath);

  let userConfig: PartialDeep<IProjectConfig> = null;

  if (fs.existsSync(configPath)) {
    userConfig = await import(configPath);
  } else {
    logger.error('Cannot read config file!');
  }

  return resolve(userConfig, projectDir);
}

export default load;
