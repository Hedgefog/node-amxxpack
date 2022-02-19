import path from 'path';
import fs from 'fs';

import AmxxBuilder, { IAmxxBuilderConfig } from '../builder';

function resolveConfigPath(configPath: string): string {
  return path.isAbsolute(configPath) ? configPath : path.join(process.cwd(), configPath);
}

class Controller {
  public async loadConfig(configPath: string): Promise<IAmxxBuilderConfig> {
    const resolvedPath = resolveConfigPath(configPath);

    if (!fs.existsSync(resolvedPath)) {
      // eslint-disable-next-line no-console
      console.log('Project is not initialzied! Use "init" command to initialize the project!');
      process.exit(1);
    }

    // eslint-disable-next-line global-require, import/no-dynamic-require
    const config = require(resolvedPath);

    return config;
  }

  public async createBuilder(configPath: string): Promise<AmxxBuilder> {
    const config = await this.loadConfig(configPath);
    const builder = new AmxxBuilder(config);

    return builder;
  }

  public async initConfig(projectDir: string): Promise<void> {
    await fs.promises.copyFile(
      path.join(__dirname, '../../resources/default-config.json'),
      path.join(projectDir, '.amxxpack.json')
    );
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
}

export default new Controller();
