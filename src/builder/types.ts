export interface IAmxxBuilderConfig {
  compiler: {
    executable: string;
    include: string[];
  };
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
  rules?: {
    flatCompilation?: boolean;
  };
}
