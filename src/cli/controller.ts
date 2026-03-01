import path from 'path';
import fs from 'fs';
import { first, isArray } from 'lodash';

import AmxxBuilder from '../builder';
import downloadCompiler from '../downloaders/compiler';
import downloadThirdparty from '../downloaders/thirdparty';
import ProjectCreator from './services/project-creator';
import TemplateBuilder from './services/template-builder';
import ProjectConfig from '../project-config';
import { IProjectOptions } from './types';
import logger from '../logger/logger';
import config from '../config';

class Controller {
  public async createBuilder(configPath: string): Promise<AmxxBuilder> {
    const projectConfig = await ProjectConfig.load(configPath);
    const builder = new AmxxBuilder(projectConfig);

    return builder;
  }

  public async create(options: IProjectOptions): Promise<void> {
    const projectCreator = new ProjectCreator(options);
    await projectCreator.createProject();
  }

  public async config(projectDir: string): Promise<void> {
    const projectCreator = new ProjectCreator();
    projectCreator.projectDir = projectDir;
    await projectCreator.createConfig();
  }

  public async compile(
    scriptPath: string,
    configPath: string,
    options: { noCache: boolean }
  ): Promise<void> {
    const compileOptions = { noCache: options.noCache };
    const builder = await this.createBuilder(configPath);
    const matches = await builder.findPlugins(scriptPath);

    for (const filePath of matches) {
      const { dir: srcDir, base: srcFile } = path.parse(filePath);
      await builder.compilePlugin(srcDir, srcFile, compileOptions);
    }
  }

  public async build(
    configPath: string,
    options: {
      watch: boolean;
      ignoreErrors: boolean;
      noCache: boolean;
    }
  ): Promise<void> {
    const builder = await this.createBuilder(configPath);
    const compileOptions = { ignoreErrors: options.ignoreErrors, noCache: options.noCache };

    if (options.watch) {
      await builder.watch(compileOptions);
    }

    await builder.build(compileOptions);
  }

  public async install(configPath: string): Promise<void> {
    const projectConfig = await ProjectConfig.load(configPath);

    await downloadCompiler({
      path: projectConfig.compiler.dir,
      dists: projectConfig.compiler.addons,
      version: projectConfig.compiler.version,
      dev: projectConfig.compiler.dev
    });

    for (const dependency of projectConfig.thirdparty.dependencies) {
      await downloadThirdparty({
        name: dependency.name,
        url: dependency.url,
        dir: projectConfig.thirdparty.dir,
        strip: dependency.strip,
        filter: dependency.filter
      });
    }
  }

  public async add(configPath: string, type: string, fileName: string, options: {
    name?: string;
    version?: string;
    author?: string;
    library?: string;
    overwrite: boolean;
    include: string[];
  }): Promise<any> {
    const projectConfig = await ProjectConfig.load(configPath);
    const { base: includeName } = path.parse(fileName);

    const templateBuilder = new TemplateBuilder(projectConfig, {
      FILE_NAME: fileName,
      PLUGIN_NAME: options.name,
      PLUGIN_VERSION: options.version,
      PLUGIN_AUTHOR: options.author,
      LIBRARY_NAME: options.library || includeName.replace(/-/g, '_'),
      INCLUDES: options.include,
      INCLUDE_NAME: includeName
    }, { PLUGIN_NAME: fileName });

    const resolveFilePath = (dir: string | string[], name: string, ext: string) => {
      const resolvedDir = isArray(dir) ? first(dir) : dir;
      return path.join(resolvedDir, `${name}.${ext}`);
    };

    switch (type) {
      case 'script': {
        await templateBuilder.createFileFromTemplate(
          resolveFilePath(projectConfig.input.scripts, fileName, 'sma'),
          'script',
          options.overwrite
        );

        break;
      }
      case 'include': {
        await templateBuilder.createFileFromTemplate(
          resolveFilePath(projectConfig.input.include, fileName, 'inc'),
          'include',
          options.overwrite
        );

        break;
      }
      case 'lib': {
        await templateBuilder.createFileFromTemplate(
          resolveFilePath(projectConfig.input.scripts, fileName, 'sma'),
          'library-script',
          options.overwrite
        );

        await templateBuilder.createFileFromTemplate(
          resolveFilePath(projectConfig.input.include, includeName, 'inc'),
          'library-include',
          options.overwrite
        );

        break;
      }
      default: {
        logger.error(`Invalid file type "${type}"!`);
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
