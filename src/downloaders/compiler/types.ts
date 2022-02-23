export interface IDist {
  name: string;
  version: string;
  platform: string;
  dev: boolean;
}

export interface IDistFile {
  dist: IDist;
  path: string;
}

export interface IDownloadCompilerOptions {
  path: string;
  version: string;
  dev: boolean;
  dists: string[];
}
