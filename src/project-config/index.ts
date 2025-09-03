import type { PartialDeep } from 'type-fest';
import { castArray, isNull, isObject, map, merge } from 'lodash';
import path from 'path';
import fs from 'fs';

import { IAssetInput, IInput, IProjectConfig, IResolvedProjectConfig, IScriptInput } from '../types';
import { ICompilerConfig } from './types';
import CLIError from '../common/cli-error';
import config from '../config';

function getCompilerConfig(type: string): ICompilerConfig {
  const configPath = path.resolve(__dirname, '..', '..', 'project-types', `${type}.json`);
  if (!fs.existsSync(configPath)) {
    throw new CLIError(`Unsupported project type: ${type}`);
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function resolveDefaults(type: string, compilerConfig: ICompilerConfig): IProjectConfig {
  return {
    type,
    input: {
      scripts: './src/scripts',
      include: './src/include',
      assets: './assets',
    },
    output: {
      base: './dist',
      scripts: `./addons/${compilerConfig.addonName}/scripting`,
      plugins: `./addons/${compilerConfig.addonName}/plugins`,
      include: `./addons/${compilerConfig.addonName}/scripting/include`,
      assets: './'
    },
    compiler: {
      dir: './.compiler',
      version: compilerConfig.defaultVersion,
      dev: false,
      addons: [],
      executable: compilerConfig.executable
    },
    thirdparty: {
      dir: './.thirdparty',
      dependencies: []
    },
    include: [],
    rules: {
      flatCompilation: true,
      rebuildDependents: true
    },
    cli: {
      templates: {
        context: {
          PLUGIN_VERSION: '1.0.0',
          PLUGIN_AUTHOR: 'AMXXPack'
        }
      }
    }
  };
}



function resolve(type: string, overrides: PartialDeep<IProjectConfig>, projectDir?: string): IResolvedProjectConfig {
  // Make sure projectDir is defined and is an absolute path
  projectDir = projectDir ? path.resolve(projectDir) : process.cwd();

  const compilerConfig = getCompilerConfig(type);
  const defaults = resolveDefaults(type, compilerConfig);
  const projectConfig: IProjectConfig = merge({}, defaults, overrides);
  const flatCompilation = projectConfig.rules.flatCompilation ?? true;

  const resolvePath = (p: string) => path.resolve(projectDir, p);

  const resolveOutputPath = (p: string) => (
    isNull(p) ? null : path.resolve(projectDir, projectConfig.output.base || '', p)
  );

  const resolveInput = (input: string | IInput): Required<IInput> => {
    return isObject(input) 
    ? {
      ...input,
      dir: path.resolve(projectDir, input.dir || ''),
      flat: input.flat ?? flatCompilation,
      dest: input.dest ?? '.',
    }
    : {
      dir: path.resolve(projectDir, input),
      flat: flatCompilation,
      dest: '.',
    };
  };

  const resolveScriptInput = (input: string | IScriptInput): Required<IScriptInput> => ({
    ...resolveInput(input),
    prefix: isObject(input) ? input.prefix ?? '' : '',
  });

  const resolveAssetInput = (input: string | IAssetInput): Required<IAssetInput> => ({
    ...resolveInput(input),
    flat: false,
    filter: isObject(input) ? input.filter ?? [] : [],
  });

  return merge(projectConfig, {
    type,
    path: projectDir,
    defaults,
    input: {
      scripts: map(castArray(projectConfig.input.scripts), resolveScriptInput),
      include: map(castArray(projectConfig.input.include), resolvePath),
      assets: map(castArray(projectConfig.input.assets), resolveAssetInput)
    },
    output: {
      scripts: resolveOutputPath(projectConfig.output.scripts),
      plugins: resolveOutputPath(projectConfig.output.plugins),
      include: resolveOutputPath(projectConfig.output.include),
      assets: resolveOutputPath(projectConfig.output.assets)
    },
    include: map(projectConfig.include, resolvePath),
    compiler: {
      dir: resolvePath(projectConfig.compiler.dir),
      config: compilerConfig
    },
    thirdparty: {
      dir: resolvePath(projectConfig.thirdparty.dir),
      dependencies: map(
        projectConfig.thirdparty.dependencies,
        (dependency) => ({
          ...dependency,
          strip: dependency.strip || 0
        })
      )
    },
    rules: {
      flatCompilation,
      rebuildDependents: projectConfig.rules.rebuildDependents ?? true
    }
  });
}

export default {
  resolve,
  loadFromFile(configPath: string, projectDir?: string): IResolvedProjectConfig {
    if (!fs.existsSync(configPath)) {
      throw new CLIError(`Cannot find config file: ${configPath}`);
    }
  
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      const projectConfig = JSON.parse(data) as PartialDeep<IProjectConfig>;
  
      return resolve(projectConfig.type || config.defaultProjectType, projectConfig, projectDir);
    } catch (err) {
      throw new CLIError(`Failed to read config file: ${configPath}! ${err instanceof Error ? err.message : err}`);
    }
  }
};
