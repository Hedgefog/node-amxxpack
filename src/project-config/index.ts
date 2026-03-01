import type { PartialDeep } from 'type-fest';
import { castArray, defaults, defaultsDeep, isNil, isNull, isObject, map, pick } from 'lodash';
import path from 'path';
import fs from 'fs';

import {
  config,
  CLIError,
  IInput,
  IOutput,
  IProjectConfig,
  IResolvedProjectConfig,
  IResolvedTarget,
  IDependency
} from '@common';

import { IProjectTypeConfig } from './types';

const resolveDefaults = (type: string, compilerConfig: IProjectTypeConfig) => ({
  type,
  input: {
    scripts: './src/scripts',
    include: './src/include',
    assets: './assets'
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
    addons: [] as string[],
    executable: compilerConfig.executable
  },
  thirdparty: {
    dir: './.thirdparty',
    dependencies: [] as IDependency[]
  },
  include: [] as string[],
  rules: {
    flatCompilation: true,
    rebuildDependents: true
  },
  cli: {
    templates: {
      context: {
        PLUGIN_VERSION: '1.0.0',
        PLUGIN_AUTHOR: config.title
      }
    }
  }
} as const);

function getProjectTypeConfig(type: string): IProjectTypeConfig {
  const configPath = path.resolve(config.projectTypesDir, `${type}.json`);
  if (!fs.existsSync(configPath)) {
    throw new CLIError(`Unsupported project type: ${type}`);
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export function createProjectConfig(type: string, overrides: PartialDeep<IProjectConfig>, projectDir?: string): IResolvedProjectConfig {
  projectDir = projectDir ? path.resolve(projectDir) : process.cwd();

  const projectTypeConfig = getProjectTypeConfig(type);
  const defaultConfig = resolveDefaults(type, projectTypeConfig);
  const projectConfig: IProjectConfig = defaultsDeep({}, overrides, defaultConfig);
  const flatCompilation = overrides.rules?.flatCompilation ?? true;

  const resolveProjectPath = (p: string) => path.resolve(projectDir, p);

  const resolveTarget = (input: Partial<IInput> | string, output: Partial<IOutput> | string, targetDefaults: Partial<IResolvedTarget>): IResolvedTarget => {
    const inputObject = isObject(input) ? input : { dir: input };
    const outputObject = isObject(output) ? output : { dir: output };

    return defaults({
      src: resolveProjectPath(inputObject.dir),
      dest: path.resolve(
        projectDir,
        projectConfig.output.base,
        outputObject.dir,
        inputObject.output?.dir || '.'
      ),
      prefix: [outputObject.prefix, inputObject.output?.prefix].join(''),
      filter: inputObject.filter ? castArray(inputObject.filter) : [],
      flat: (
        isNil(inputObject.output?.flat) && isNil(outputObject.flat)
          ? undefined
          : Boolean(inputObject.output?.flat || outputObject.flat)
      )
    }, targetDefaults);
  };

  const resolveTargetByType = (type: keyof IProjectConfig['output'], inputKey: keyof IProjectConfig['input'], targetDefaults: Partial<IResolvedTarget>) => {
    if (isNull(overrides.output?.[type])) return [];

    return map(
      castArray(projectConfig.input[inputKey]),
      input => resolveTarget(input, projectConfig.output[type], targetDefaults)
    );
  };

  return {
    type,
    path: projectDir,
    defaults: {
      ...pick(defaultConfig, ['type', 'input', 'output', 'thirdparty', 'include', 'cli']),
      compiler: pick(defaultConfig.compiler, ['dir', 'version', 'addons', 'executable'])
    },
    cli: projectConfig.cli,
    targets: {
      assets: resolveTargetByType('assets', 'assets', { flat: false }),
      include: resolveTargetByType('include', 'include', { flat: true }),
      scripts: resolveTargetByType('scripts', 'scripts', { flat: true }),
      plugins: resolveTargetByType('plugins', 'scripts', { flat: flatCompilation })
    },
    include: map(projectConfig.include, resolveProjectPath),
    compiler: {
      ...projectConfig.compiler,
      dir: resolveProjectPath(projectConfig.compiler.dir),
      config: projectTypeConfig
    },
    thirdparty: {
      dir: resolveProjectPath(projectConfig.thirdparty.dir),
      dependencies: map(
        projectConfig.thirdparty.dependencies,
        dependency => ({
          ...dependency,
          strip: dependency.strip || 0,
          filter: dependency.filter || [],
          type: dependency.type || null
        })
      )
    },
    rules: {
      flatCompilation: projectConfig.rules.flatCompilation,
      rebuildDependents: projectConfig.rules.rebuildDependents
    }
  };
}

export function loadProjectConfig(configPath: string, projectDir?: string): IResolvedProjectConfig {
  if (!fs.existsSync(configPath)) {
    throw new CLIError(`Cannot find config file: ${configPath}`);
  }

  try {
    const data = fs.readFileSync(configPath, 'utf8');
    const projectConfig = JSON.parse(data) as PartialDeep<IProjectConfig>;

    return createProjectConfig(projectConfig.type || config.project.defaultType, projectConfig, projectDir);
  } catch (err) {
    throw new CLIError(`Failed to read config file: ${configPath}! ${err instanceof Error ? err.message : err}`);
  }
}
