export interface IDependencies {
  items: string[];
  hash: string | null;
}

export interface IBuildOptions {
  noCache?: boolean;
  ignoreErrors?: boolean;
}
