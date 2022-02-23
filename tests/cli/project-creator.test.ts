import path from 'path';
import os from 'os';
import fs from 'fs';
import { map } from 'lodash';
import mkdirp from 'mkdirp';

import ProjectCreator from '../../src/cli/services/project-creator';
import { IProjectOptions } from '../../src/cli/types';
import config from '../../src/config';

const TEST_TMP_DIR = path.join(os.tmpdir(), 'amxxpack-tests');
const PROJECT_NAME = 'test-project';
const PROJECT_PATH = path.join(TEST_TMP_DIR, PROJECT_NAME);

const defaultProjectOptions: IProjectOptions = {
  author: '',
  description: '',
  version: '0.0.1',
  name: PROJECT_NAME,
  git: false,
  nonpm: false,
  cwd: TEST_TMP_DIR
};

async function initProjectDir(files: any) {
  await mkdirp(PROJECT_PATH);

  await Promise.all(
    map(files, async (content, file) => {
      const filePath = path.join(PROJECT_PATH, file);
      await fs.promises.writeFile(filePath, content);
    })
  );
}

describe('', () => {
  beforeAll(() => {
    jest.spyOn(ProjectCreator.prototype, 'createConfig');
    jest.spyOn(ProjectCreator.prototype, 'createDirectories');
    jest.spyOn(ProjectCreator.prototype, 'createPackage');
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

  beforeEach(async () => {
    if (fs.existsSync(PROJECT_PATH)) {
      await fs.promises.rm(PROJECT_PATH, { recursive: true, force: true });
    }

    jest.clearAllMocks();
  });

  it('should initialize project', async () => {
    const projectCreator = new ProjectCreator({ ...defaultProjectOptions });

    await projectCreator.createProject();
    expect(projectCreator.createDirectories).toBeCalled();
    expect(projectCreator.createConfig).toBeCalled();

    const { projectConfig } = projectCreator;

    expect(fs.existsSync(path.join(PROJECT_PATH, config.projectConfig))).toBe(true);
    expect(fs.existsSync(path.join(PROJECT_PATH, projectConfig.input.assets))).toBe(true);
    expect(fs.existsSync(path.join(PROJECT_PATH, projectConfig.input.include))).toBe(true);
    expect(fs.existsSync(path.join(PROJECT_PATH, projectConfig.input.scripts))).toBe(true);
    expect(fs.existsSync(path.join(PROJECT_PATH, 'package.json'))).toBe(true);
  });

  it('should initialize git on project create', async () => {
    const projectCreator = new ProjectCreator({ ...defaultProjectOptions, git: true });

    await projectCreator.createProject();
    expect(projectCreator.initGit).toBeCalled();
    expect(fs.existsSync(path.join(PROJECT_PATH, '.git'))).toBe(true);
    expect(fs.existsSync(path.join(PROJECT_PATH, '.gitignore'))).toBe(true);
  });

  it('should update git for initialized for project', async () => {
    const projectCreator = new ProjectCreator({
      ...defaultProjectOptions,
      name: '.',
      git: true,
      cwd: PROJECT_PATH
    });

    await initProjectDir({
      '.git': '',
      'package.json': '{}'
    });

    await projectCreator.createProject();
    expect(projectCreator.initGit).not.toBeCalled();
    expect(projectCreator.updateGitignore).toBeCalled();
    expect(fs.existsSync(path.join(PROJECT_PATH, '.gitignore'))).toBe(true);
  });

  it('should not initialize git on project create', async () => {
    const projectCreator = new ProjectCreator({ ...defaultProjectOptions });

    await projectCreator.createProject();
    expect(projectCreator.initGit).not.toBeCalled();
    expect(projectCreator.updateGitignore).not.toBeCalled();
  });

  it('should not initialize npm package on project create', async () => {
    const projectCreator = new ProjectCreator({ ...defaultProjectOptions, nonpm: true });

    await projectCreator.createProject();
    expect(projectCreator.createPackage).not.toBeCalled();
    expect(projectCreator.installDependencies).not.toBeCalled();
  });

  it('should initialize npm package on project create', async () => {
    const projectCreator = new ProjectCreator({ ...defaultProjectOptions });

    await projectCreator.createProject();
    expect(projectCreator.createPackage).toBeCalled();
    expect(projectCreator.installDependencies).toBeCalled();
  });
});
