import path from 'path';
import fs from 'fs';

import ProjectController from '../../src/cli/controllers/project.controller';
import { TEST_TMP_DIR } from '../constants';
import createProject from '../helpers/create-project';
import { createProjectConfig } from '../../src/project-config';
import config from '../../src/common/config';

const TEST_DIR = path.join(TEST_TMP_DIR, 'project');

describe('Project Controller', () => {
  let projectController: ProjectController;

  beforeEach(async () => {
    const project = createProject(TEST_DIR);
    await fs.promises.mkdir(project.path, { recursive: true });

    const configPath = path.join(project.path, config.project.configFile);

    const projectConfig = createProjectConfig(config.project.defaultType, {}, project.path);
    await fs.promises.writeFile(configPath, JSON.stringify(projectConfig, null, 2));

    process.chdir(project.path);

    projectController = new ProjectController(configPath);
  });

  afterEach(async () => {
    process.chdir(TEST_TMP_DIR);
  });

  it('should create script', async () => {
    const fileName = 'test.sma';

    await projectController.createScript(
      fileName,
      { title: 'Test', version: '1.0.0', author: 'Test' }
    );

    const [target] = projectController['projectConfig'].targets.scripts;

    expect(fs.existsSync(path.join(target.src, fileName))).toBe(true);
  });

  it('should create nested script', async () => {
    const fileName = 'nested/test.sma';

    await projectController.createScript(fileName, { title: 'Test', version: '1.0.0', author: 'Test' });

    const [target] = projectController['projectConfig'].targets.scripts;

    expect(fs.existsSync(path.join(target.src, fileName))).toBe(true);
  });

  it('should create include', async () => {
    const fileName = 'test.inc';

    await projectController.createInclude(fileName);

    const [target] = projectController['projectConfig'].targets.include;

    expect(fs.existsSync(path.join(target.src, fileName))).toBe(true);
  });

  it('should create nested include', async () => {
    const fileName = 'nested/test.inc';

    await projectController.createInclude(fileName);

    const [target] = projectController['projectConfig'].targets.include;

    expect(fs.existsSync(path.join(target.src, fileName))).toBe(true);
  });

  it('should create library', async () => {
    const libraryName = 'test';

    await projectController.createLibrary(libraryName, { title: 'Test', version: '1.0.0', author: 'Test' });

    const projectConfig = projectController['projectConfig'];
    const [scriptTarget] = projectConfig.targets.scripts;
    const [includeTarget] = projectConfig.targets.include;

    expect(fs.existsSync(path.join(scriptTarget.src, `${libraryName}.${projectConfig.compiler.config.fileExtensions.script}`))).toBe(true);
    expect(fs.existsSync(path.join(includeTarget.src, `${libraryName}.${projectConfig.compiler.config.fileExtensions.include}`))).toBe(true);
  });

  it('should create nested library', async () => {
    const libraryName = 'nested/test';

    await projectController.createLibrary(libraryName, { title: 'Test', version: '1.0.0', author: 'Test' });

    const projectConfig = projectController['projectConfig'];
    const [scriptTarget] = projectConfig.targets.scripts;
    const [includeTarget] = projectConfig.targets.include;

    expect(fs.existsSync(path.join(scriptTarget.src, `${libraryName}.${projectConfig.compiler.config.fileExtensions.script}`))).toBe(true);
    expect(fs.existsSync(path.join(includeTarget.src, `${path.parse(libraryName).name}.${projectConfig.compiler.config.fileExtensions.include}`))).toBe(true);
    expect(fs.existsSync(path.join(includeTarget.src, `${libraryName}.${projectConfig.compiler.config.fileExtensions.include}`))).toBe(false);
  });
});
