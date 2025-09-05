import path from 'path';

import { first, uniq } from 'lodash';
import { IResolvedProjectConfig } from '@common';
import { FileTemplate, CLIError } from '@common';
import { loadProjectConfig } from '@project-config';
import { Downloader } from '@downloader';

import { ProjectFileType } from '../constants';
import TemplateBuilderController from './template-builder.controller';

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

  public async createFile(type: ProjectFileType, fileName: string, options: {
    name?: string;
    version?: string;
    author?: string;
    library?: string;
    overwrite: boolean;
    include: string[];
  }): Promise<void> {
    const {
      config: {
        fileExtensions,
        cli: { defaultIncludes }
      }
    } = this.projectConfig.compiler;

    const { name, dir } = path.parse(fileName);

    const templateBuilder = new TemplateBuilderController(this.projectConfig, {
      FILE_NAME: fileName,
      PLUGIN_NAME: options.name,
      PLUGIN_VERSION: options.version,
      PLUGIN_AUTHOR: options.author,
      LIBRARY_NAME: options.library || name.replace(/-/g, '_'),
      INCLUDES: uniq([...defaultIncludes, ...options.include]),
      INCLUDE_NAME: name
    }, { PLUGIN_NAME: name });

    const scriptsTarget = first(this.projectConfig.targets.scripts);
    const includeTarget = first(this.projectConfig.targets.include);

    switch (type) {
      case ProjectFileType.Script: {
        await templateBuilder.createFileFromTemplate(
          path.join(scriptsTarget.src, dir, `${name}.${fileExtensions.script}`),
          FileTemplate.Script,
          options.overwrite
        );

        break;
      }
      case ProjectFileType.Include: {
        await templateBuilder.createFileFromTemplate(
          path.join(includeTarget.src, dir, `${name}.${fileExtensions.include}`),
          FileTemplate.Include,
          options.overwrite
        );

        break;
      }
      case ProjectFileType.Library: {
        await templateBuilder.createFileFromTemplate(
          path.join(scriptsTarget.src, dir, `${name}.${fileExtensions.script}`),
          FileTemplate.LibraryScript,
          options.overwrite
        );

        await templateBuilder.createFileFromTemplate(
          path.join(includeTarget.src, dir, `${name}.${fileExtensions.include}`),
          FileTemplate.LibraryInclude,
          options.overwrite
        );

        break;
      }
      default: {
        throw new CLIError(`Invalid file type "${type}"!`);
      }
    }
  }
}
