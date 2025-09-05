import path from 'path';

import { first, uniq } from 'lodash';
import { IResolvedProjectConfig } from '@common';
import { FileTemplate } from '@common';
import { loadProjectConfig } from '@project-config';
import { Downloader } from '@downloader';

import { TemplateService, ITemplateContext } from '@template';

export interface ICreateFileOptions {
  include: string[];
  overwrite: boolean;
}

export interface ICreateScriptOptions extends ICreateFileOptions {
  title?: string;
  version?: string;
  author?: string;
}

export interface ICreateLibraryOptions extends ICreateScriptOptions {
  name?: string;
}

export default class ProjectController {
  public projectConfig: IResolvedProjectConfig;

  constructor(configPath: string) {
    this.projectConfig = loadProjectConfig(configPath);
  }

  public async install(options: { compiler: boolean; thirdparty: boolean }) {
    const downloader = new Downloader(this.projectConfig);

    if (options.compiler) {
      await downloader.downloadCompiler();
    }

    if (options.thirdparty) {
      await downloader.downloadThirdparty();
    }
  }

  public async createScript(fileName: string, options: ICreateScriptOptions): Promise<void> {
    const { config: { fileExtensions, cli: { defaultIncludes } } } = this.projectConfig.compiler;
    const scriptsTarget = first(this.projectConfig.targets.scripts);
    const { name, dir } = path.parse(fileName);

    const templateService = this.createTemplateService(fileName, {
      FILE_NAME: fileName,
      PLUGIN_NAME: options.title,
      PLUGIN_VERSION: options.version,
      PLUGIN_AUTHOR: options.author,
      INCLUDES: uniq([...defaultIncludes, ...options.include])
    });

    await templateService.createFile(
      path.join(scriptsTarget.src, dir, `${name}.${fileExtensions.script}`),
      FileTemplate.Script,
      options.overwrite
    );
  }

  public async createInclude(fileName: string, options: ICreateFileOptions): Promise<void> {
    const { config: { fileExtensions, cli: { defaultIncludes } } } = this.projectConfig.compiler;
    const includeTarget = first(this.projectConfig.targets.include);
    const { name, dir } = path.parse(fileName);

    const templateService = this.createTemplateService(fileName, {
      FILE_NAME: fileName,
      INCLUDES: uniq([...defaultIncludes, ...options.include])
    });

    await templateService.createFile(
      path.join(includeTarget.src, dir, `${name}.${fileExtensions.include}`),
      FileTemplate.Include,
      options.overwrite
    );
  }

  public async createLibrary(fileName: string, options: ICreateLibraryOptions): Promise<void> {
    const { config: { fileExtensions, cli: { defaultIncludes } } } = this.projectConfig.compiler;
    const scriptsTarget = first(this.projectConfig.targets.scripts);
    const includeTarget = first(this.projectConfig.targets.include);
    const { name, dir } = path.parse(fileName);

    const templateService = this.createTemplateService(fileName, {
      FILE_NAME: fileName,
      PLUGIN_NAME: options.title,
      PLUGIN_VERSION: options.version,
      PLUGIN_AUTHOR: options.author,
      LIBRARY_NAME: options.name || name.replace(/-/g, '_'),
      INCLUDES: uniq([...defaultIncludes, ...options.include]),
      INCLUDE_NAME: name
    });

    await templateService.createFile(
      path.join(scriptsTarget.src, dir, `${name}.${fileExtensions.script}`),
      FileTemplate.LibraryScript,
      options.overwrite
    );

    await templateService.createFile(
      path.join(includeTarget.src, dir, `${name}.${fileExtensions.include}`),
      FileTemplate.LibraryInclude,
      options.overwrite
    );
  }

  private createTemplateService(fileName: string, context: ITemplateContext): TemplateService {
    const { name } = path.parse(fileName);

    return new TemplateService(this.projectConfig, context, { PLUGIN_NAME: name });
  }
}
