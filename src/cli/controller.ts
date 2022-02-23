import path from 'path';

import AmxxBuilder from '../builder';
import downloadCompiler from '../downloaders/compiler';
import downloadThirdparty from '../downloaders/thirdparty';
import ProjectCreator from './services/project-creator';
import TemplateBuilder from './services/template-builder';
import ProjectConfig from '../project-config';
import { IProjectOptions } from './types';
import logger from '../logger/logger';

class Controller {
  public async createBuilder(configPath: string): Promise<AmxxBuilder> {
    const projectConfig = await ProjectConfig.resolve(configPath);
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
    await projectCreator.createProject();
  }

  public async compile(scriptPath: string, configPath: string): Promise<void> {
    const builder = await this.createBuilder(configPath);

    const matches = await builder.findPlugins(scriptPath);
    matches.map(async (filePath: string) => {
      const srcPath = path.resolve(filePath);
      await builder.compilePlugin(srcPath);
    });
  }

  public async build(configPath: string, watch: boolean): Promise<void> {
    const builder = await this.createBuilder(configPath);

    await builder.build();

    if (watch) {
      await builder.watch();
    }
  }

  public async install(configPath: string): Promise<void> {
    const projectConfig = await ProjectConfig.resolve(configPath);

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
        dir: projectConfig.thirdparty.dir
      });
    }
  }

  public async add(configPath: string, type: string, fileName: string, options: {
    name?: string;
    version?: string;
    author?: string;
    library?: string;
    include: string[];
  }): Promise<any> {
    const projectConfig = await ProjectConfig.resolve(configPath);
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

    switch (type) {
      case 'script': {
        await templateBuilder.createFileFromTemplate(
          path.join(projectConfig.input.scripts, `${fileName}.sma`),
          'script'
        );

        break;
      }
      case 'include': {
        await templateBuilder.createFileFromTemplate(
          path.join(projectConfig.input.include, `${fileName}.inc`),
          'include',
        );

        break;
      }
      case 'lib': {
        await templateBuilder.createFileFromTemplate(
          path.join(projectConfig.input.scripts, `${fileName}.sma`),
          'library-script'
        );

        await templateBuilder.createFileFromTemplate(
          path.join(projectConfig.input.include, `${includeName}.inc`),
          'library-include'
        );

        break;
      }
      default: {
        logger.error(`Invalid file type "${type}"!`);
      }
    }
  }
}

export default new Controller();
