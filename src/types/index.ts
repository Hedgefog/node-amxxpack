import { ICompilerConfig } from "../project-config/types";

export interface IAssetInput {
  dir: string;
  dest?: string;
  filter?: string | string[];
}

export interface IScriptInput {
  dir: string;
  dest?: string;
  prefix?: string;
  flat?: boolean;
}

export interface IDependency {
  name: string;
  url: string;
  strip?: number;
  filter?: string | string[];
}

export interface IProjectConfig {
  type?: string;
  input: {
    scripts: null | string | IAssetInput | (string | IScriptInput)[];
    include: null | string | string[];
    assets: null | string | IAssetInput | (string | IAssetInput)[];
  };
  output: {
    base?: null | string;
    scripts: null | string;
    plugins: null | string;
    include: null | string;
    assets: null | string;
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
    flatCompilation: boolean;
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

export interface IResolvedProjectConfig extends IProjectConfig {
  path: string;
  type: string;
  defaults: IProjectConfig;
  input: {
    scripts: IScriptInput[];
    include: string[];
    assets: IAssetInput[];
  };
  output: {
    scripts: string;
    plugins: string;
    include: string;
    assets: string;
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
}
