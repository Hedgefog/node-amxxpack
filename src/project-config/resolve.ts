import type { PartialDeep } from 'type-fest';
import { castArray, map, merge } from 'lodash';
import path from 'path';

import defaults from './defaults';
import { IProjectConfig, IResolvedProjectConfig } from '../types';

function resolve(
  overrides: PartialDeep<IProjectConfig> = {},
  projectDir: string = ''
): IResolvedProjectConfig {
  const resolvePath = (p: string) => path.resolve(projectDir, p);

  const config: IProjectConfig = merge({}, defaults, overrides);

  // resolve paths
  const resolvedConfig = merge(config, {
    input: {
      scripts: map(castArray(config.input.scripts), (dir) => resolvePath(dir)),
      include: map(castArray(config.input.include), (dir) => resolvePath(dir)),
      assets: map(castArray(config.input.assets), (input) => (
        typeof input === 'object'
          ? { ...input, dir: resolvePath(input.dir) }
          : { dir: resolvePath(input) }
      ))
    },
    output: {
      scripts: resolvePath(config.output.scripts),
      plugins: resolvePath(config.output.plugins),
      include: resolvePath(config.output.include),
      assets: resolvePath(config.output.assets)
    },
    include: map(config.include, (include) => resolvePath(include)),
    compiler: {
      dir: resolvePath(config.compiler.dir),
    },
    thirdparty: {
      dir: resolvePath(config.thirdparty.dir)
    }
  });

  return resolvedConfig;
}

export default resolve;
