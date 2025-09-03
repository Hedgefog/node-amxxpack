import { ICompilerConfig } from '../project-config/types';

export interface IOutputOptions {
  dest?: string;
  flat?: boolean;
  prefix?: string;
};

export interface IOutput extends IOutputOptions {
  dir: string;
};

export interface IInput {
  dir: string;
  filter?: string | string[];
  output?: IOutputOptions | null;
};

export interface IDependency {
  name: string;
  url: string;
  strip?: number;
  filter?: string | string[];
  type?: 'file' | 'archive';
}

export interface IProjectConfig {
  type?: string;
  input: {
    scripts: null | string | IInput | (string | IInput)[];
    include: null | string | IInput | (string | IInput)[];
    assets: null | string | IInput | (string | IInput)[];
  };
  output: {
    base?: null | string;
    scripts: null | string | IOutput;
    plugins: null | string | IOutput;
    include: null | string | IOutput;
    assets: null | string | IOutput;
  };
  compiler: {
    dir: null | string;
    version: string;
    addons: string[];
    dev: boolean;
    executable: string;
  };
  thirdparty: {
    dir: string | null;
    dependencies: IDependency[];
  };
  include: null | string[];
  rules: {
    flatCompilation?: boolean;
    rebuildDependents?: boolean;
  };
  cli: {
    templates: {
      context: { [key: string]: string },
      files?: {
        includeDirective?: string;
        include?: string;
        libraryInclude?: string;
        libraryScript?: string;
        script?: string;
      }
    };
  };
}

export type IResolvedOutput = Required<IOutput> | null;

export interface IResolvedInput extends IInput {
  filter: string[];
  output: IResolvedOutput;
};

export interface IResolvedProjectConfig extends Required<IProjectConfig> {
  path: string;
  type: string;
  defaults: IProjectConfig;
  input: {
    scripts: IResolvedInput[];
    include: IResolvedInput[];
    assets: IResolvedInput[];
  };
  output: {
    scripts: IResolvedOutput;
    plugins: IResolvedOutput;
    include: IResolvedOutput;
    assets: IResolvedOutput;
  };
  include: string[];
  compiler: IProjectConfig['compiler'] & {
    dir: string;
    config: ICompilerConfig;
  };
  thirdparty: IProjectConfig['thirdparty'] & {
    dir: string;
    dependencies: (IDependency & {
      strip: number;
    })[]
  };
  rules: {
    flatCompilation: boolean;
    rebuildDependents: boolean;
  };
}
