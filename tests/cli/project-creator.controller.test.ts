import path from 'path';
import fs from 'fs';

import ProjectCreatorController from '../../src/cli/controllers/project-creator.controller';
import config from '../../src/common/config';
import createProject from '../helpers/create-project';
import { TEST_TMP_DIR } from '../constants';

const TEST_DIR = path.join(TEST_TMP_DIR, 'project-creator');

describe('Project Creator Controller', () => {
  beforeAll(async () => {
    await fs.promises.mkdir(TEST_DIR, { recursive: true });

    jest.spyOn(ProjectCreatorController.prototype, 'createConfig');
    jest.spyOn(ProjectCreatorController.prototype, 'createDirectories');
    jest.spyOn(ProjectCreatorController.prototype, 'updatePackage');
    jest.spyOn(ProjectCreatorController.prototype, 'installDependencies').mockImplementation(
      async function installDependencies(this: ProjectCreatorController) {
        await fs.promises.mkdir(path.join(this['projectDir'], 'node_modules'), { recursive: true });
      }
    );
    jest.spyOn(ProjectCreatorController.prototype, 'updateGitignore');
    jest.spyOn(ProjectCreatorController.prototype, 'isInitialized');
    jest.spyOn(ProjectCreatorController.prototype, 'isGitInitialized');
    jest.spyOn(ProjectCreatorController.prototype, 'isNpmPackageInitialized');
    jest.spyOn(ProjectCreatorController.prototype, 'initGit').mockImplementation(
      async function initGit(this: ProjectCreatorController) {
        await fs.promises.mkdir(path.join(this['projectDir'], '.git'), { recursive: true });
      }
    );
  });

  afterAll(async () => {
    await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });
    jest.clearAllMocks();
  });

  it('should initialize project', async () => {
    const testProject = createProject(TEST_DIR);

    const projectCreator = new ProjectCreatorController({
      type: config.project.defaultType,
      ...testProject.options
    });

    await projectCreator.createProject();
    expect(projectCreator.createDirectories).toHaveBeenCalled();
    expect(projectCreator.createConfig).toHaveBeenCalled();

    const projectConfig = projectCreator['projectConfig'];

    expect(projectConfig.type).toBe(config.project.defaultType);

    expect(fs.existsSync(path.join(testProject.path, config.project.configFile))).toBe(true);

    for (const assetInput of projectConfig.targets.assets) {
      expect(fs.existsSync(assetInput.src)).toBe(true);
    }

    for (const input of projectConfig.targets.include) {
      expect(fs.existsSync(input.src)).toBe(true);
    }

    for (const input of projectConfig.targets.scripts) {
      expect(fs.existsSync(input.src)).toBe(true);
    }

    expect(fs.existsSync(path.join(testProject.path, 'package.json'))).toBe(true);
  });

  it('should merge package', async () => {
    const testProject = createProject(TEST_DIR);
    const projectCreator = new ProjectCreatorController({ type: config.project.defaultType, ...testProject.options, git: true });

    await projectCreator.createProject();
    expect(projectCreator.initGit).toHaveBeenCalled();
    expect(fs.existsSync(path.join(testProject.path, '.git'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.path, '.gitignore'))).toBe(true);
  });

  it('should initialize git on project create', async () => {
    const testProject = createProject(TEST_DIR);
    const projectCreator = new ProjectCreatorController({ type: config.project.defaultType, ...testProject.options, git: true });

    await projectCreator.createProject();
    expect(projectCreator.initGit).toHaveBeenCalled();
    expect(fs.existsSync(path.join(testProject.path, '.git'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.path, '.gitignore'))).toBe(true);
  });

  it('should update git for initialized for project', async () => {
    const testProject = createProject(TEST_DIR);
    await testProject.initDir([
      { fileName: '.git', content: '' },
      { fileName: 'package.json', content: '{}' }
    ]);

    const projectCreator = new ProjectCreatorController({
      type: config.project.defaultType,
      ...testProject.options,
      name: '.',
      git: true,
      cwd: testProject.path
    });

    await projectCreator.createProject();
    expect(projectCreator.initGit).not.toHaveBeenCalled();
    expect(projectCreator.updateGitignore).toHaveBeenCalled();
    expect(fs.existsSync(path.join(testProject.path, '.gitignore'))).toBe(true);
  });

  it('should not initialize git on project create', async () => {
    const testProject = createProject(TEST_DIR);
    const projectCreator = new ProjectCreatorController({ type: config.project.defaultType, ...testProject.options });

    await projectCreator.createProject();
    expect(projectCreator.initGit).not.toHaveBeenCalled();
    expect(projectCreator.updateGitignore).not.toHaveBeenCalled();
  });

  it('should not initialize npm package on project create', async () => {
    const testProject = createProject(TEST_DIR);
    const projectCreator = new ProjectCreatorController({ type: config.project.defaultType, ...testProject.options, npm: false });

    await projectCreator.createProject();
    expect(projectCreator.updatePackage).not.toHaveBeenCalled();
    expect(projectCreator.installDependencies).not.toHaveBeenCalled();
  });

  it('should initialize npm package on project create', async () => {
    const testProject = createProject(TEST_DIR);
    const projectCreator = new ProjectCreatorController({ type: config.project.defaultType, ...testProject.options });

    await projectCreator.createProject();
    expect(projectCreator.updatePackage).toHaveBeenCalled();
    expect(projectCreator.installDependencies).toHaveBeenCalled();
  });
});
