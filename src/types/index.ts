export interface IProjectConfig {
  input: {
    scripts: string;
    include: string;
    assets: string;
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
  include: string[];
  rules: {
    flatCompilation: boolean;
  };
}
