import { castArray, map, merge } from 'lodash';
import path from 'path';
import fs from 'fs';

import logger from '../logger/logger';
import defaults from './defaults';
import { IProjectConfig } from '../types';

async function resolve(_configPath?: string): Promise<IProjectConfig> {
  let userConfig: Partial<IProjectConfig> = null;

  if (_configPath) {
    const configPath = path.resolve(_configPath);

    if (fs.existsSync(configPath)) {
      userConfig = await import(configPath);
    } else {
      logger.error('Cannot read config file!');
    }
  }

  const config: IProjectConfig = merge({}, defaults, userConfig);

  // resolve paths
  merge(config, {
    input: {
      scripts: map(castArray(config.input.scripts), (dir) => path.resolve(dir)),
      include: map(castArray(config.input.include), (dir) => path.resolve(dir)),
      assets: map(castArray(config.input.assets), (dir) => path.resolve(dir)),
    },
    output: {
      scripts: path.resolve(config.output.scripts),
      plugins: path.resolve(config.output.plugins),
      include: path.resolve(config.output.include),
      assets: path.resolve(config.output.assets)
    },
    include: map(config.include, (include) => path.resolve(include)),
    compiler: {
      dir: path.resolve(config.compiler.dir),
    },
    thirdparty: {
      dir: path.resolve(config.thirdparty.dir)
    }
  });

  return config;
}

export default resolve;
