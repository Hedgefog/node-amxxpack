import type { PartialDeep } from 'type-fest';
import { castArray, isNil, isObject, map, merge, mergeWith } from 'lodash';
import path from 'path';

import defaults from './defaults';
import { IProjectConfig, IResolvedProjectConfig } from '../types';

const mergeConfigFn = (val1: any, val2: any) => (isNil(val2) ? val1 : undefined);

function resolve(
  overrides: PartialDeep<IProjectConfig> = {},
  projectDir: string = ''
): IResolvedProjectConfig {
  const resolvePath = (p: string) => (!isNil(p) ? path.resolve(projectDir || '', p) : null);

  const config: IProjectConfig = mergeWith({}, defaults, overrides, mergeConfigFn);

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
      scripts: resolvePath(config.output.scripts),
      plugins: resolvePath(config.output.plugins),
      include: resolvePath(config.output.include),
      assets: resolvePath(config.output.assets)
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
