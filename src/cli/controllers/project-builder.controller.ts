import { CLIError } from '@common';
import { createBuilder } from '@builder';
import { BuilderService, IBuildOptions } from '@builder';
import { IResolvedProjectConfig } from '@common';
import { loadProjectConfig } from '@project-config';


export default class ProjectBuilderController {
  private projectConfig: IResolvedProjectConfig;
  private builder: BuilderService;

  constructor(configPath: string, options: IBuildOptions) {
    this.projectConfig = loadProjectConfig(configPath);
    this.builder = createBuilder(this.projectConfig, options);
  }

  public async compile(pattern: string): Promise<void> {
    await this.builder.buildScripts({ pattern });
  }

  public async build(
    options: {
      watch: boolean;
      ignoreErrors: boolean;
      noCache: boolean;
      assets: boolean;
      scripts: boolean;
      plugins: boolean;
      includes: boolean;
    }
  ): Promise<boolean> {

    if (options.watch) {
      if (options.assets) {
        await this.builder.watchAssets();
      }

      if (options.includes) {
        await this.builder.watchInclude();
      }

      if (options.scripts) {
        await this.builder.watchScripts();
      }
    }

    try {
      let success = true;

      if (options.assets) {
        await this.builder.buildAssets();
      }

      if (options.includes) {
        await this.builder.buildInclude();
      }

      if (options.plugins || options.scripts) {
        success = await this.builder.buildScripts({ skipCompilation: !options.plugins });
      }

      return success;
    } catch (err: unknown) {
      throw new CLIError(`Build failed! Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}
