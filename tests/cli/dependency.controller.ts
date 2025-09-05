import path from 'path';
import fs from 'fs';
import Chance from 'chance';

import DependencyController from '../../src/cli/controllers/dependency.controller';
import { TEST_TMP_DIR } from '../constants';
import { createProjectConfig } from '../../src/project-config';
import config from '../../src/common/config';
import { IDependency } from '../../src/common/types';

const TEST_DIR = path.join(TEST_TMP_DIR, 'dependency');

const chance = new Chance();

describe('Dependency Controller', () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = path.join(TEST_DIR, chance.word({ length: 8 }));
    await fs.promises.mkdir(projectPath, { recursive: true });

    const projectConfig = createProjectConfig(config.project.defaultType, {}, projectPath);

    const configData = {
      ...projectConfig.defaults,
      thirdparty: {
        dependencies: [
          { name: chance.word({ length: 8 }), url: chance.url(), strip: 0, filter: [] },
          { name: chance.word({ length: 8 }), url: chance.url(), strip: 0, filter: [] },
          { name: chance.word({ length: 8 }), url: chance.url(), strip: 0, filter: [] }
        ]
      }
    };

    await fs.promises.writeFile(
      path.join(projectPath, config.project.configFile),
      JSON.stringify(configData)
    );

    process.chdir(projectPath);
  });

  it('should get dependencies', async () => {
    const dependencyController = new DependencyController();
    const dependencies = await dependencyController.getDependencies();

    const configData = JSON.parse(fs.readFileSync(path.join(projectPath, config.project.configFile), 'utf8'));

    expect(dependencies).toEqual(configData.thirdparty.dependencies);
  });

  it('should add dependency', async () => {
    const dependencyController = new DependencyController();
    const dependency = { name: chance.word({ length: 8 }), url: chance.url(), strip: 0, filter: [] };

    await dependencyController.addDependency(dependency.name, dependency.url, dependency.strip, dependency.filter);

    const configData = JSON.parse(fs.readFileSync(path.join(projectPath, config.project.configFile), 'utf8'));

    expect(configData.thirdparty.dependencies).toContain(dependency);
  });

  it('should remove dependency', async () => {
    const configData = JSON.parse(fs.readFileSync(path.join(projectPath, config.project.configFile), 'utf8'));

    const dependencyController = new DependencyController();
    const dependency = chance.pickone(configData.thirdparty.dependencies) as IDependency;

    await dependencyController.removeDependency(dependency.name);

    const newConfigData = JSON.parse(fs.readFileSync(path.join(projectPath, config.project.configFile), 'utf8'));
    expect(newConfigData.thirdparty.dependencies).not.toContain(dependency);
  });
});
