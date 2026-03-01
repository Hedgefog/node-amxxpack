export interface IDependencies {
  items: string[];
  hash: string | null;
}

export interface IBuildOptions {
  noCache?: boolean;
  ignoreErrors?: boolean;
}

export type TargetCallback = (filePath: string) => Promise<unknown>;
