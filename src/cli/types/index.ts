export interface IAddTemplateContext {
  [key: string]: unknown;
}

export interface IProjectOptions {
  name?: string;
  author?: string;
  description?: string;
  version?: string;
  nonpm?: boolean;
  git?: boolean;
  type: string
  cwd?: string;
}
