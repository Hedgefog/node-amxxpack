export interface IProjectOptions {
  name?: string;
  author?: string;
  description?: string;
  version?: string;
  npm?: boolean;
  install?: boolean;
  git?: boolean;
  type: string
  cwd?: string;
}
