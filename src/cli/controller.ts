import path from 'path';
import fs from 'fs';
import { first, isArray, map } from 'lodash';

import AmxxBuilder from '../builder';
import Downloader from '../downloaders';
import ProjectCreator from './services/project-creator';
import TemplateBuilder from './services/template-builder';
import ProjectConfig from '../project-config';
import { IProjectOptions } from './types';
import logger from '../logger/logger';
import config from '../config';
import { IBuildOptions } from '../builder/builder';
import { FileType } from './constants';
import CLIError from '../common/cli-error';

class Controller {
  public async createBuilder(configPath: string, options: IBuildOptions): Promise<AmxxBuilder> {
    const projectConfig = ProjectConfig.loadFromFile(configPath);
    const builder = new AmxxBuilder(projectConfig, options);

    return builder;
  }

  public async create(options: IProjectOptions): Promise<void> {
    if (!options.name) {
      throw new CLIError('Project name cannot be empty!');
    }

    const projectCreator = new ProjectCreator(options);
    await projectCreator.createProject();
  }

  public async config(projectDir: string, type: string): Promise<void> {
    const projectCreator = new ProjectCreator({ type });
    projectCreator.projectDir = projectDir;
    await projectCreator.createConfig();
  }

  public async compile(
    pattern: string,
    configPath: string,
    options: { noCache: boolean }
  ): Promise<void> {
    const builder = await this.createBuilder(configPath, { noCache: options.noCache });
    
    await builder.buildScripts({ pattern });
  }

  public async build(
    configPath: string,
    options: {
      watch: boolean;
      ignoreErrors: boolean;
      noCache: boolean;
    }
  ): Promise<void> {
    const builder = await this.createBuilder(configPath, {
      noCache: options.noCache,
      ignoreErrors: options.ignoreErrors
    });

    if (options.watch) {
      await builder.watch();
    }

    await builder.build();
  }

  public async install(configPath: string, options: { compiler: boolean; thirdparty: boolean }): Promise<void> {
    const projectConfig = ProjectConfig.loadFromFile(configPath);
    const downloader = new Downloader(projectConfig);

    if (options.compiler) {
      await downloader.downloadCompiler();
    }

    if (options.thirdparty) {
      await downloader.downloadThirdparty();
    }
  }

  public async add(configPath: string, type: FileType, fileName: string, options: {
    name?: string;
    version?: string;
    author?: string;
    library?: string;
    overwrite: boolean;
    include: string[];
  }): Promise<void> {
    const projectConfig = ProjectConfig.loadFromFile(configPath);

    const {
      config: {
        fileExtensions,
        cli: { defaultIncludes }
      }
    } = projectConfig.compiler;

    const { base: includeName } = path.parse(fileName);


    const includes = Array.from(new Set([...defaultIncludes, ...options.include]));

    const templateBuilder = new TemplateBuilder(projectConfig, {
      FILE_NAME: fileName,
      PLUGIN_NAME: options.name,
      PLUGIN_VERSION: options.version,
      PLUGIN_AUTHOR: options.author,
      LIBRARY_NAME: options.library || includeName.replace(/-/g, '_'),
      INCLUDES: includes,
      INCLUDE_NAME: includeName
    }, { PLUGIN_NAME: fileName });

    const resolveFilePath = (dir: string | string[], name: string, ext: string) => {
      const resolvedDir = isArray(dir) ? first(dir) : dir;
      return path.join(resolvedDir, `${name}.${ext}`);
    };

    switch (type) {
      case FileType.Script: {
        await templateBuilder.createFileFromTemplate(
          resolveFilePath(map(projectConfig.input.scripts, 'dir'), fileName, fileExtensions.script),
          'script',
          options.overwrite
        );

        break;
      }
      case FileType.Include: {
        await templateBuilder.createFileFromTemplate(
          resolveFilePath(projectConfig.input.include, fileName, fileExtensions.include),
          'include',
          options.overwrite
        );

        break;
      }
      case FileType.Library: {
        await templateBuilder.createFileFromTemplate(
          resolveFilePath(map(projectConfig.input.scripts, 'dir'), fileName, fileExtensions.script),
          'library-script',
          options.overwrite
        );

        await templateBuilder.createFileFromTemplate(
          resolveFilePath(projectConfig.input.include, includeName, fileExtensions.include),
          'library-include',
          options.overwrite
        );

        break;
      }
      default: {
        throw new CLIError(`Invalid file type "${type}"!`);
      }
    }
  }

  public async cleanCache() {
    if (fs.existsSync(config.cacheFile)) {
      fs.promises.rm(config.cacheFile);
    }

    fs.promises.rm(config.downloadDir, { recursive: true, force: true });

    logger.info("🧹 Cache cleaned!");
  }
}

export default new Controller();
