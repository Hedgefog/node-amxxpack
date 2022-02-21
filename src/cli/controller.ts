import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';

import AmxxBuilder, { IAmxxBuilderConfig } from '../builder';
import downloadCompiler from '../compiler-downloader';

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

  public async init(projectDir: string): Promise<void> {
    const configPath = path.join(projectDir, '.amxxpack.json');

    await fs.promises.copyFile(
      path.join(__dirname, '../../resources/default-config.json'),
      configPath
    );

    const config = JSON.parse(
      await fs.promises.readFile(configPath, 'utf8')
    ) as IAmxxBuilderConfig;

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

  public async fetchCompiler({ configPath, version, dev, addons }: {
    configPath: string;
    version: string;
    dev: boolean;
    addons: string[];
  }): Promise<void> {
    const config = await this.loadConfig(configPath);
    const compilerPath = path.parse(config.compiler.executable).dir;
    await downloadCompiler({ path: path.resolve(compilerPath), dists: addons, version, dev });
  }
}

export default new Controller();
