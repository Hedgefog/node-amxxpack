export interface IAddTemplateContext {
  [key: string]: any;
}

export interface IProjectOptions {
  name: string;
  author: string;
  description: string;
  version: string;
  nonpm: boolean;
  git: boolean;
  cwd?: string;
}
