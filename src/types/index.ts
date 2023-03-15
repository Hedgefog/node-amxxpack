export interface IAssetInput {
  dir: string;
  dest?: string;
  filter?: string | string[];
}

export interface IProjectConfig {
  input: {
    scripts: null | string | string[];
    include: null | string | string[];
    assets: null | string | IAssetInput | (string | IAssetInput)[];
  };
  output: {
    scripts: null | string;
    plugins: null | string;
    include: null | string;
    assets: null | string;
  };
  compiler: {
    dir: null | string;
    version: string;
    addons: [];
    dev: boolean;
    executable: string;
  };
  thirdparty: {
    dir: string | null;
    dependencies: {
      name: string;
      url: string;
    }[];
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
  input: {
    scripts: string[];
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
  };
  thirdparty: IProjectConfig['thirdparty'] & {
    dir: string;
  };
}
