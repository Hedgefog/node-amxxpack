import path from 'path';
import fs from 'fs';
import { assign, castArray, reduce } from 'lodash';

import ProjectConfig from '../../src/project-config';
import AmxxBuilder from '../../src/builder/builder';
import createProject from '../helpers/create-project';
import { IProjectConfig } from '../../src/types';
import { TEST_PROJECTS_DIR } from '../constants';

let amxxpc: jest.Mock;

function createCompileParams(fileName: string, projectConfig: IProjectConfig) {
  return {
    path: path.resolve(fileName),
    dest: path.resolve(projectConfig.output.plugins, `${path.parse(fileName).name}.amxx`),
    compiler: path.resolve(projectConfig.compiler.dir, projectConfig.compiler.executable),
    includeDir: [
      path.resolve(projectConfig.compiler.dir, 'include'),
      ...projectConfig.include,
      ...castArray(projectConfig.input.include)
    ]
  };
}

function createProjectFilesObj(projectFiles: string[]) {
  return reduce(
    projectFiles,
    (acc, fileName) => assign(acc, { [fileName]: fileName }),
    {}
  );
}

jest.mock('../../src/builder/amxxpc', () => {
  const originalModule = jest.requireActual('../../src/builder/amxxpc');
  amxxpc = jest.requireActual('../mocks/amxxpc').default;

  return {
    __esModule: true,
    ...originalModule,
    default: amxxpc
  };
});

describe('Builder', () => {
  beforeAll(async () => {
    if (fs.existsSync(TEST_PROJECTS_DIR)) {
      await fs.promises.rm(TEST_PROJECTS_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('should build test project scripts', async () => {
    const scriptsDir = './src/scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'test2.sma'),
      path.join(scriptsDir, 'test3.sma'),
      path.join(scriptsDir, 'nested/test4.sma'),
      path.join(scriptsDir, 'nested/nested/test5.sma'),
    ];

    const project = createProject();
    await project.initDir(createProjectFilesObj(projectFiles));

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve();
    projectConfig.input.scripts = scriptsDir;

    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});

    for (const fileName of projectFiles) {
      const compilerParams = createCompileParams(fileName, projectConfig);
      expect(amxxpc).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project scripts with multiple dirs', async () => {
    const scriptsDir = './src/scripts';
    const extraScriptsDir = './src/extra-scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'test2.sma'),
      path.join(scriptsDir, 'test3.sma'),
      path.join(scriptsDir, 'nested/test4.sma'),
      path.join(scriptsDir, 'nested/nested/test5.sma'),
      path.join(extraScriptsDir, 'extra1.sma'),
      path.join(extraScriptsDir, 'nexted/extra2.sma'),
    ];

    const project = createProject();
    await project.initDir(createProjectFilesObj(projectFiles));

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve();
    projectConfig.input.scripts = [scriptsDir, extraScriptsDir];

    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});

    for (const fileName of projectFiles) {
      const compilerParams = createCompileParams(fileName, projectConfig);
      expect(amxxpc).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project assets', async () => {
    const assetsDir = './src/assets';

    const projectFiles = [
      path.join(assetsDir, 'models/test.mdl'),
      path.join(assetsDir, 'sprites/test.spr'),
      path.join(assetsDir, 'sound/test.wav'),
      path.join(assetsDir, 'maps/test.bsp')
    ];

    const project = createProject();
    await project.initDir(createProjectFilesObj(projectFiles));

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve();
    projectConfig.input.assets = assetsDir;

    const builder = new AmxxBuilder(projectConfig);
    jest.spyOn(builder, 'updateAsset');

    await builder.buildAssets();

    for (const fileName of projectFiles) {
      expect(builder.updateAsset).toHaveBeenCalledWith(
        assetsDir,
        path.relative(assetsDir, fileName)
      );
    }
  });

  it('should build test project assets with multiple dirs', async () => {
    const assetsDir = './src/assets';
    const extraAssetsDir = './src/extra-assets';

    const projectFiles = [
      path.join(assetsDir, 'models/test.mdl'),
      path.join(assetsDir, 'sprites/test.spr'),
      path.join(assetsDir, 'sound/test.wav'),
      path.join(assetsDir, 'maps/test.bsp')
    ];

    const extraProjectFiles = [
      path.join(extraAssetsDir, 'models/extra.mdl'),
      path.join(extraAssetsDir, 'sprites/extra.spr'),
      path.join(extraAssetsDir, 'sound/extra.wav'),
      path.join(extraAssetsDir, 'maps/extra.bsp')
    ];

    const project = createProject();
    await project.initDir(createProjectFilesObj([...projectFiles, ...extraProjectFiles]));

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve();
    projectConfig.input.assets = [assetsDir, extraAssetsDir];

    const builder = new AmxxBuilder(projectConfig);
    jest.spyOn(builder, 'updateAsset');

    await builder.buildAssets();

    for (const fileName of projectFiles) {
      expect(builder.updateAsset).toHaveBeenCalledWith(
        assetsDir,
        path.relative(assetsDir, fileName)
      );
    }

    for (const fileName of extraProjectFiles) {
      expect(builder.updateAsset).toHaveBeenCalledWith(
        extraAssetsDir,
        path.relative(extraAssetsDir, fileName)
      );
    }
  });
});
