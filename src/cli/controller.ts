import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import { map } from 'lodash';

import AmxxBuilder from '../builder';
import downloadCompiler from '../downloaders/compiler';
import downloadThirdparty from '../downloaders/thirdparty';
import ProjectConfig from '../project-config';
import { buildTemplate, createFileFromTemplate, resolveContext } from './template';
import config from '../config';
import { IAddTemplateContext } from './types';

class Controller {
  public async createBuilder(configPath: string): Promise<AmxxBuilder> {
    const projectConfig = await ProjectConfig.resolve(configPath);
    const builder = new AmxxBuilder(projectConfig);

    return builder;
  }

  public async init(projectDir: string): Promise<void> {
    const projectConfig = ProjectConfig.defaults;
    const configPath = path.join(projectDir, config.projectConfig);

    await fs.promises.writeFile(configPath, JSON.stringify(projectConfig, null, 2));

    await mkdirp(path.join(projectDir, projectConfig.input.assets));
    await mkdirp(path.join(projectDir, projectConfig.input.include));
    await mkdirp(path.join(projectDir, projectConfig.input.scripts));
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
    configPath: string;
    name: string;
    version: string;
    author: string;
    library: string;
    include: string[];
  }): Promise<any> {
    const projectConfig = await ProjectConfig.resolve(configPath);

    const context = await resolveContext(projectConfig, {
      FILE_NAME: fileName,
      PLUGIN_NAME: options.name || fileName,
      PLUGIN_VERSION: options.version,
      PLUGIN_AUTHOR: options.author,
      LIBRARY_NAME: options.library || fileName.replace(/-/g, '_'),
      INCLUDES: (
        await Promise.all(
          map(
            options.include,
            (includeName: string) => buildTemplate(
              projectConfig,
              'include-directive',
              { FILE: includeName }
            )
          )
        )
      ).join('\n')
    }, {
      PLUGIN_NAME: fileName,
      LIBRARY_NAME: fileName.replace(/-/g, '_')
    });

    switch (type) {
      case 'script': {
        await this.addScript(configPath, fileName, context);
        break;
      }
      case 'include': {
        await this.addInclude(configPath, fileName, context);
        break;
      }
      case 'library': {
        await this.addLibrary(configPath, fileName, context);
        break;
      }
    }
  }

  public async addScript(
    configPath: string,
    name: string,
    context: IAddTemplateContext
  ): Promise<void> {
    const projectConfig = await ProjectConfig.resolve(configPath);

    await createFileFromTemplate(
      projectConfig,
      path.join(projectConfig.input.scripts, `${name}.sma`),
      'script',
      context
    );
  }

  public async addInclude(
    configPath: string,
    name: string,
    context: IAddTemplateContext
  ): Promise<void> {
    const projectConfig = await ProjectConfig.resolve(configPath);

    await createFileFromTemplate(
      projectConfig,
      path.join(projectConfig.input.include, `${name}.inc`),
      'include',
      context
    );
  }

  public async addLibrary(
    configPath: string,
    name: string,
    context: IAddTemplateContext
  ): Promise<void> {
    const { base: includeName } = path.parse(name);
    const projectConfig = await ProjectConfig.resolve(configPath);

    const newContext = { ...context, FILE_NAME: includeName, LIBRARY_NAME: includeName };

    await createFileFromTemplate(
      projectConfig,
      path.join(projectConfig.input.scripts, `${name}.sma`),
      'library-script',
      newContext
    );

    await createFileFromTemplate(
      projectConfig,
      path.join(projectConfig.input.include, `${includeName}.inc`),
      'library-include',
      newContext
    );
  }
}

export default new Controller();
