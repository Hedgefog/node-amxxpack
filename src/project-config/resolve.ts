import type { PartialDeep } from 'type-fest';
import { castArray, isNull, isObject, map, merge } from 'lodash';
import path from 'path';

import defaults from './defaults';
import { IProjectConfig, IResolvedProjectConfig } from '../types';

function resolve(
  overrides: PartialDeep<IProjectConfig> = {},
  projectDir: string = ''
): IResolvedProjectConfig {
  const config: IProjectConfig = merge({}, defaults, overrides);

  const resolvePath = (p: string) => path.resolve(projectDir, p);

  const resolveOutputPath = (p: string) => (
    isNull(p) ? null : path.resolve(projectDir, config.output.base || '', p)
  );

  // resolve paths
  const resolvedConfig = merge(config, {
    input: {
      scripts: map(castArray(config.input.scripts), resolvePath),
      include: map(castArray(config.input.include), resolvePath),
      assets: map(castArray(config.input.assets), (input) => (
        isObject(input)
          ? { ...input, dir: resolvePath(input.dir) }
          : { dir: resolvePath(input) }
      ))
    },
    output: {
      scripts: resolveOutputPath(config.output.scripts),
      plugins: resolveOutputPath(config.output.plugins),
      include: resolveOutputPath(config.output.include),
      assets: resolveOutputPath(config.output.assets)
    },
    include: map(config.include, resolvePath),
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
