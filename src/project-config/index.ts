import type { PartialDeep } from 'type-fest';
import { castArray, isNull, isObject, map, merge } from 'lodash';
import path from 'path';
import fs from 'fs';

import { IInput, IOutput, IOutputOptions, IProjectConfig, IResolvedInput, IResolvedOutput, IResolvedProjectConfig } from '../types';
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

  const resolveProjectPath = (p: string) => path.resolve(projectDir, p);

  const resolveOutputOptions = (p?: IOutputOptions, defaults?: IOutputOptions): Required<IOutputOptions> => {
    return merge({
      dest: '.',
      flat: false,
      prefix: '',
    }, defaults, p);
  };

  const resolveOutput = (p: string | IOutput, defaults?: IOutputOptions): IResolvedOutput => {
    if (isNull(p)) return null;

    if (typeof p === 'object') {
      return {
        ...resolveOutputOptions(p, defaults),
        dir: path.resolve(projectDir, projectConfig.output.base || '.', p.dir),
      };
    }

    return {
      ...resolveOutputOptions(null, defaults),
      dir: path.resolve(projectDir, projectConfig.output.base || '.', p),
    };
  };

  const resolveInput = (input: string | IInput, output: IResolvedOutput): IResolvedInput => {
    return isObject(input) 
      ? {
        dir: resolveProjectPath(input.dir),
        filter: input.filter ? castArray(input.filter) : [],
        output: output ? merge({}, output, input.output || {}) : null
      }
      : {
        dir: resolveProjectPath(input),
        filter: [],
        output: output
      };
  };

  const flatCompilation = projectConfig.rules.flatCompilation ?? true;

  const output = {
    base: resolveProjectPath(projectConfig.output.base),
    scripts: resolveOutput(projectConfig.output.scripts, { flat: true }),
    plugins: resolveOutput(projectConfig.output.plugins, { flat: flatCompilation }),
    include: resolveOutput(projectConfig.output.include, { flat: true }),
    assets: resolveOutput(projectConfig.output.assets, { flat: false })
  };

  return merge(projectConfig, {
    type,
    path: projectDir,
    defaults,
    input: {
      scripts: map(castArray(projectConfig.input.scripts), input => resolveInput(input, output?.scripts)),
      include: map(castArray(projectConfig.input.include), input => resolveInput(input, output?.include)),
      assets: map(castArray(projectConfig.input.assets), input => resolveInput(input, output.assets))
    },
    output,
    include: map(projectConfig.include, resolveProjectPath),
    compiler: {
      dir: resolveProjectPath(projectConfig.compiler.dir),
      config: compilerConfig
    },
    thirdparty: {
      dir: resolveProjectPath(projectConfig.thirdparty.dir),
      dependencies: map(
        projectConfig.thirdparty.dependencies,
        dependency => ({
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
