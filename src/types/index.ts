export interface IAssetInput {
  dir: string;
  dest?: string;
  filter?: string | string[];
}

export interface IProjectConfig {
  input: {
    scripts: string | string[];
    include: string | string[];
    assets: string | string[] | IAssetInput | IAssetInput[];
  };
  output: {
    scripts: string;
    plugins: string;
    include: string;
    assets: string;
  };
  compiler: {
    dir: string;
    version: string;
    addons: [];
    dev: boolean;
    executable: string;
  };
  thirdparty: {
    dir: string,
    dependencies: {
      name: string;
      url: string;
    }[];
  };
  include: string[];
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
}
