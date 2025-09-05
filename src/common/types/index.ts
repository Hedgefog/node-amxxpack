import type { PartialDeep } from 'type-fest';
import { IProjectTypeConfig } from '../../project-config/types';

export interface IOutput {
  dir?: string;
  flat?: boolean;
  prefix?: string;
};

export interface IInput {
  dir: string;
  filter?: string | string[];
  output?: IOutput | null;
};

export interface IDependency {
  name: string;
  url: string;
  strip?: number;
  filter?: string | string[];
  type?: 'file' | 'archive' | null;
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

export interface IResolvedTarget {
  src: string;
  dest: string;
  flat: boolean;
  prefix: string;
  filter: string[];
};

export interface IResolvedProjectConfig {
  path: string;
  type: string;
  defaults: PartialDeep<IProjectConfig>
  include: string[];
  cli: IProjectConfig['cli'];
  compiler: IProjectConfig['compiler'] & {
    dir: string;
    config: IProjectTypeConfig;
  };
  thirdparty: IProjectConfig['thirdparty'] & {
    dir: string;
    dependencies: Required<IDependency>[]
  };
  rules: {
    flatCompilation: boolean;
    rebuildDependents: boolean;
  };
  targets: {
    assets: IResolvedTarget[];
    include: IResolvedTarget[];
    scripts: IResolvedTarget[];
    plugins: IResolvedTarget[];
  };
}
