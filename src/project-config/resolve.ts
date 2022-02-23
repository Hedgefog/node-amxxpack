import { map, merge } from 'lodash';
import path from 'path';
import fs from 'fs';

import logger from '../logger/logger';
import defaults from './defaults';
import { IProjectConfig } from '../types';

async function resolve(_configPath: string): Promise<IProjectConfig> {
  const configPath = path.resolve(_configPath);

  let userConfig: Partial<IProjectConfig> = null;
  if (fs.existsSync(configPath)) {
    userConfig = await import(configPath);
  } else {
    logger.error('Cannot read config file!');
  }

  const config: IProjectConfig = merge({}, defaults, userConfig);

  // resolve paths
  merge(config, {
    input: {
      scripts: path.resolve(config.input.scripts),
      include: path.resolve(config.input.include),
      assets: path.resolve(config.input.assets),
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
