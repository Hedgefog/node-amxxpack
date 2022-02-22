import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';

import AmxxBuilder from '../builder';
import downloadCompiler from '../downloaders/compiler';
import projectConfig from '../project-config';

class Controller {
  public async createBuilder(configPath: string): Promise<AmxxBuilder> {
    const config = await projectConfig.resolve(configPath);
    const builder = new AmxxBuilder(config);

    return builder;
  }

  public async init(projectDir: string): Promise<void> {
    const config = projectConfig.defaults;
    const configPath = path.join(projectDir, '.amxxpack.json');

    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));

    await mkdirp(path.join(projectDir, config.input.assets));
    await mkdirp(path.join(projectDir, config.input.include));
    await mkdirp(path.join(projectDir, config.input.scripts));
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

  public async install({ configPath }: { configPath: string }) {
    const config = await projectConfig.resolve(configPath);

    await downloadCompiler({
      path: config.compiler.dir,
      dists: config.compiler.addons,
      version: config.compiler.version,
      dev: config.compiler.dev
    });
  }
}

export default new Controller();
