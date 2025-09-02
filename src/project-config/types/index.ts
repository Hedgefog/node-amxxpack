export interface ICompilerConfig {
  defaultVersion: string;
  executable: string;
  scriptExtension: string;
  includeExtension: string;
  pluginExtension: string;
  addonName: string;
  fileExtensions: {
    script: string;
    include: string;
    plugin: string;
  };
  cli: {
    defaultIncludes: string[];
    templateDir: string;
  };
  downloader: {
    downloadHost: string;
    useMetaFile: boolean;
    baseDist: string;
    distSource: string;
    compilerDir: string;
  };
}
