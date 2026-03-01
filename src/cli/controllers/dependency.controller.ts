import fs from 'fs';
import { find, findIndex } from 'lodash';

import { config, CLIError, IProjectConfig } from '@common';

export default class DependencyController {
  public async getDependencies() {
    const projectConfig: IProjectConfig = await this.readProjectConfig();

    return projectConfig.thirdparty.dependencies;
  }

  public async addDependency(name: string, url: string, strip: number, filter: string[]) {
    const projectConfig: IProjectConfig = await this.readProjectConfig();

    if (find(projectConfig.thirdparty.dependencies, { name })) {
      throw new CLIError(`Dependency "${name}" already exists!`);
    }

    projectConfig.thirdparty.dependencies.push({ name, url, strip, filter });

    await fs.promises.writeFile(config.project.configFile, JSON.stringify(projectConfig, null, 2));
  }

  public async removeDependency(name: string) {
    const projectConfig: IProjectConfig = await this.readProjectConfig();

    const dependencyIndex = findIndex(projectConfig.thirdparty.dependencies, { name });

    if (dependencyIndex === -1) {
      throw new CLIError(`Dependency "${name}" not found!`);
    }

    projectConfig.thirdparty.dependencies.splice(dependencyIndex, 1);

    await fs.promises.writeFile(config.project.configFile, JSON.stringify(projectConfig, null, 2));
  }

  private async readProjectConfig(): Promise<IProjectConfig> {
    try {
      return JSON.parse(await fs.promises.readFile(config.project.configFile, 'utf8'));
    } catch(_err) {
      throw new CLIError(`Failed to read project config ${config.project.configFile}`);
    }
  }
}
