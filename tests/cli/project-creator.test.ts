import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';

import ProjectCreator from '../../src/cli/services/project-creator';
import config from '../../src/config';
import createProject from '../helpers/create-project';
import { TEST_TMP_DIR } from '../constants';

const TEST_DIR = path.join(TEST_TMP_DIR, 'project-creator');

describe('Project Creator', () => {
  beforeAll(async () => {
    await mkdirp(TEST_DIR);

    jest.spyOn(ProjectCreator.prototype, 'createConfig');
    jest.spyOn(ProjectCreator.prototype, 'createDirectories');
    jest.spyOn(ProjectCreator.prototype, 'updatePackage');
    jest.spyOn(ProjectCreator.prototype, 'installDependencies').mockImplementation(
      async function installDependencies(this: ProjectCreator) {
        await mkdirp(path.join((this as any).projectDir, 'node_modules'));
      }
    );
    jest.spyOn(ProjectCreator.prototype, 'updateGitignore');
    jest.spyOn(ProjectCreator.prototype, 'isInitialized');
    jest.spyOn(ProjectCreator.prototype, 'isGitInitialized');
    jest.spyOn(ProjectCreator.prototype, 'isNpmPackageInitialized');
    jest.spyOn(ProjectCreator.prototype, 'initGit').mockImplementation(
      async function initGit(this: ProjectCreator) {
        await mkdirp(path.join((this as any).projectDir, '.git'));
      }
    );
  });

  afterAll(() => {
    rimraf.sync(`${TEST_DIR}/*`);
  });

  beforeEach(() => {
    rimraf.sync(`${TEST_DIR}/*`);
    jest.clearAllMocks();
  });

  it('should initialize project', async () => {
    const testProject = createProject(TEST_DIR);

    const projectCreator = new ProjectCreator({ ...testProject.projectOptions });

    await projectCreator.createProject();
    expect(projectCreator.createDirectories).toBeCalled();
    expect(projectCreator.createConfig).toBeCalled();

    const { projectConfig } = projectCreator;

    expect(fs.existsSync(path.join(testProject.projectPath, config.projectConfig))).toBe(true);

    for (const assetInput of projectConfig.input.assets) {
      expect(fs.existsSync(assetInput.dir)).toBe(true);
    }

    for (const dir of projectConfig.input.include) {
      expect(fs.existsSync(dir)).toBe(true);
    }

    for (const dir of projectConfig.input.scripts) {
      expect(fs.existsSync(dir)).toBe(true);
    }

    expect(fs.existsSync(path.join(testProject.projectPath, 'package.json'))).toBe(true);
  });

  it('should merge package', async () => {
    const testProject = createProject(TEST_DIR);
    const projectCreator = new ProjectCreator({ ...testProject.projectOptions, git: true });

    await projectCreator.createProject();
    expect(projectCreator.initGit).toBeCalled();
    expect(fs.existsSync(path.join(testProject.projectPath, '.git'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectPath, '.gitignore'))).toBe(true);
  });

  it('should initialize git on project create', async () => {
    const testProject = createProject(TEST_DIR);
    const projectCreator = new ProjectCreator({ ...testProject.projectOptions, git: true });

    await projectCreator.createProject();
    expect(projectCreator.initGit).toBeCalled();
    expect(fs.existsSync(path.join(testProject.projectPath, '.git'))).toBe(true);
    expect(fs.existsSync(path.join(testProject.projectPath, '.gitignore'))).toBe(true);
  });

  it('should update git for initialized for project', async () => {
    const testProject = createProject(TEST_DIR);
    await testProject.initDir([
      { fileName: '.git', content: '' },
      { fileName: 'package.json', content: '{}' },
    ]);

    const projectCreator = new ProjectCreator({
      ...testProject.projectOptions,
      name: '.',
      git: true,
      cwd: testProject.projectPath
    });

    await projectCreator.createProject();
    expect(projectCreator.initGit).not.toBeCalled();
    expect(projectCreator.updateGitignore).toBeCalled();
    expect(fs.existsSync(path.join(testProject.projectPath, '.gitignore'))).toBe(true);
  });

  it('should not initialize git on project create', async () => {
    const testProject = createProject(TEST_DIR);
    const projectCreator = new ProjectCreator({ ...testProject.projectOptions });

    await projectCreator.createProject();
    expect(projectCreator.initGit).not.toBeCalled();
    expect(projectCreator.updateGitignore).not.toBeCalled();
  });

  it('should not initialize npm package on project create', async () => {
    const testProject = createProject(TEST_DIR);
    const projectCreator = new ProjectCreator({ ...testProject.projectOptions, nonpm: true });

    await projectCreator.createProject();
    expect(projectCreator.updatePackage).not.toBeCalled();
    expect(projectCreator.installDependencies).not.toBeCalled();
  });

  it('should initialize npm package on project create', async () => {
    const testProject = createProject(TEST_DIR);
    const projectCreator = new ProjectCreator({ ...testProject.projectOptions });

    await projectCreator.createProject();
    expect(projectCreator.updatePackage).toBeCalled();
    expect(projectCreator.installDependencies).toBeCalled();
  });
});
