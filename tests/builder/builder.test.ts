import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import { map, some } from 'lodash';

import ProjectConfig from '../../src/project-config';
import AmxxBuilder from '../../src/builder/builder';
import createProject from '../helpers/create-project';
import { IResolvedProjectConfig, ScriptInput } from '../../src/types';
import { TEST_TMP_DIR } from '../constants';

const TEST_DIR = path.join(TEST_TMP_DIR, 'builder');

let amxxpc: jest.Mock;

jest.mock('../../src/builder/amxxpc', () => {
  const originalModule = jest.requireActual('../../src/builder/amxxpc');
  amxxpc = jest.requireActual('../mocks/amxxpc').default;

  return {
    __esModule: true,
    ...originalModule,
    default: amxxpc
  };
});

function createCompileParams(fileName: string, projectConfig: IResolvedProjectConfig, inputConfig?: ScriptInput) {
  const { name, dir } = path.parse(fileName);

  return {
    path: path.resolve(fileName),
    dest: path.resolve(
      projectConfig.output.plugins,
      inputConfig?.dest || '',
      inputConfig?.flat ?? projectConfig.rules.flatCompilation ? '.' : path.relative(inputConfig?.dir || '.', dir),
      `${inputConfig?.prefix || ''}${name}.amxx`
    ),
    compiler: path.resolve(projectConfig.compiler.dir, projectConfig.compiler.executable),
    includeDir: [
      path.resolve(projectConfig.compiler.dir, 'include'),
      ...projectConfig.include,
      ...projectConfig.input.include
    ]
  };
}

describe('Builder', () => {
  beforeAll(async () => {
    await mkdirp(TEST_DIR);
  });

  afterAll(() => {
    rimraf.sync(`${TEST_DIR}/*`);
  });

  beforeEach(() => {
    rimraf.sync(`${TEST_DIR}/*`);
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

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve(
      { input: { scripts: [scriptsDir], include: [] } }
    );

    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});

    for (const fileName of projectFiles) {
      const compilerParams = createCompileParams(fileName, projectConfig);
      expect(amxxpc).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project scripts with nested include dirs', async () => {
    const includeDir = './src/include';
    const scriptsDir = './src/scripts';
    const scriptPath = path.join(scriptsDir, 'test.sma');
    const projectNestedIncludeDirs = map(
      ['nested', 'nested/nested', 'nested/nested/nested', 'nested2'],
      (dir) => path.join(includeDir, dir)
    );

    const projectFiles = [
      scriptPath,
      path.join(includeDir, 'test.inc'),
      ...map(projectNestedIncludeDirs, (dir) => path.join(dir, 'test.inc'))
    ];

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve(
      { input: { scripts: [scriptsDir], include: [includeDir] } }
    );

    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});

    const compilerParams = createCompileParams(scriptPath, {
      ...projectConfig,
      input: {
        ...projectConfig.input,
        include: map(
          [includeDir, ...projectNestedIncludeDirs],
          (dir) => path.resolve(project.projectPath, dir)
        )
      }
    });

    expect(amxxpc).toHaveBeenCalledWith(compilerParams);
  });

  it('should build test project without adding a non-existing include input dirs', async () => {
    const includeDirs = ['./src/include', './src/include1', './src/include2'];
    const scriptsDir = './src/scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test.sma')
    ];

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve(
      { input: { scripts: [scriptsDir], include: includeDirs } }
    );

    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});

    for (const fileName of projectFiles) {
      const compilerParams = createCompileParams(fileName, {
        ...projectConfig,
        input: { ...projectConfig.input, include: [] }
      });

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
      path.join(extraScriptsDir, 'nested/extra2.sma'),
    ];

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve(
      { input: { scripts: [scriptsDir, extraScriptsDir], include: [] } }
    );

    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});

    for (const fileName of projectFiles) {
      const compilerParams = createCompileParams(fileName, projectConfig);
      expect(amxxpc).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project scripts with neseted object script input', async () => {
    const scriptsDir = './src/scripts';
    const extraScriptsDir = './src/extra-scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'test2.sma'),
      path.join(extraScriptsDir, 'extra1.sma'),
      path.join(extraScriptsDir, 'nested/extra2.sma'),
    ];

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve({
      input: { scripts: [{ dir: scriptsDir }, { dir: extraScriptsDir }], include: [] }
    });

    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});

    for (const fileName of projectFiles) {
      const compilerParams = createCompileParams(fileName, projectConfig);
      expect(amxxpc).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project scripts with enabled flat compilation in input', async () => {
    const scriptsDir = './src/scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'test2.sma'),
      path.join(scriptsDir, 'nested/test3.sma'),
      path.join(scriptsDir, 'nested/test4.sma'),
      path.join(scriptsDir, 'nested/sub/test5.sma'),
    ];

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const inputConfig = { dir: scriptsDir, flat: true };

    const projectConfig = await ProjectConfig.resolve({
      input: { scripts: [inputConfig], include: [] },
      rules: { flatCompilation: false }
    });

    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});

    for (const fileName of projectFiles) {
      const compilerParams = createCompileParams(fileName, projectConfig, inputConfig);
      expect(amxxpc).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project scripts with disabled flat compilation in input', async () => {
    const scriptsDir = './src/scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'test2.sma'),
      path.join(scriptsDir, 'nested/test3.sma'),
      path.join(scriptsDir, 'nested/test4.sma'),
      path.join(scriptsDir, 'nested/sub/test5.sma'),
    ];

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const inputConfig = { dir: scriptsDir, flat: false };

    const projectConfig = await ProjectConfig.resolve({
      input: { scripts: [inputConfig], include: [] },
      rules: { flatCompilation: true }
    });

    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});

    for (const fileName of projectFiles) {
      const compilerParams = createCompileParams(fileName, projectConfig, inputConfig);

      expect(amxxpc).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project scripts with plugin prefix input', async () => {
    const scriptsDir = './src/scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'nested/test2.sma'),
    ];

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const inputConfig = { dir: scriptsDir, prefix: 'test_' };

    const projectConfig = await ProjectConfig.resolve({
      input: { scripts: [inputConfig], include: [] },
    });
    
    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});
    for (const fileName of projectFiles) {
      const compilerParams = createCompileParams(fileName, projectConfig, inputConfig);
      expect(amxxpc).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should correctly build test project scripts with mixed inputs', async () => {
    const scriptsDir = './src/scripts';
    const prefixedDir = './src/prefixed';
    const flatDir = './src/flat';
    const prefixedFlatDir = './src/prefixed-flat';
    const destDir = './src/dest';
    const destPrefixedFlatDir = './src/dest-prefixed-flat';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'nested/test2.sma'),
      path.join(prefixedDir, 'test3.sma'),
      path.join(prefixedDir, 'foo/bar/baz/test4.sma'),
      path.join(flatDir, 'test5.sma'),
      path.join(flatDir, 'foo/bar/baz/test6.sma'),
      path.join(prefixedFlatDir, 'test7.sma'),
      path.join(prefixedFlatDir, 'foo/bar/baz/test8.sma'),
      path.join(destDir, 'test9.sma'),
      path.join(destDir, 'foo/bar/baz/test10.sma'),
      path.join(destPrefixedFlatDir, 'test11.sma'),
      path.join(destPrefixedFlatDir, 'foo/bar/baz/test12.sma')
    ];

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const prefix = 'test_';

    const projectConfig = await ProjectConfig.resolve({
      input: {
        scripts: [
          { dir: scriptsDir, flat: false },
          { dir: prefixedDir, prefix, flat: false },
          { dir: flatDir, flat: true },
          { dir: prefixedFlatDir, prefix, flat: true },
          { dir: destDir, dest: 'sub', flat: false },
          { dir: destPrefixedFlatDir, prefix, dest: 'sub', flat: true },
        ],
        include: []
      }
    });
    
    const builder = new AmxxBuilder(projectConfig);

    await builder.buildScripts({});
  
    expect(amxxpc).toHaveBeenCalledTimes(projectFiles.length);

    for (const input of projectConfig.input.scripts) {
      const files = projectFiles.filter((file) => !path.relative(input.dir, file).startsWith('..'));

      for (const file of files) {
        const compilerParams = createCompileParams(file, projectConfig, input);
        expect(amxxpc).toHaveBeenCalledWith(compilerParams);
      }
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

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve(
      { input: { assets: assetsDir } }
    );

    const builder = new AmxxBuilder(projectConfig);
    jest.spyOn(builder, 'updateAsset');

    await builder.buildAssets();

    for (const fileName of projectFiles) {
      expect(builder.updateAsset).toHaveBeenCalledWith(
        path.resolve(fileName),
        { dir: path.resolve(assetsDir) }
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

    const project = createProject(TEST_DIR);
    await project.initDir([...projectFiles, ...extraProjectFiles]);

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve(
      { input: { assets: [assetsDir, extraAssetsDir] } }
    );

    const builder = new AmxxBuilder(projectConfig);
    jest.spyOn(builder, 'updateAsset');

    await builder.buildAssets();

    for (const fileName of projectFiles) {
      expect(builder.updateAsset).toHaveBeenCalledWith(
        path.resolve(fileName),
        { dir: path.resolve(assetsDir) }
      );
    }

    for (const fileName of extraProjectFiles) {
      expect(builder.updateAsset).toHaveBeenCalledWith(
        path.resolve(fileName),
        { dir: path.resolve(extraAssetsDir) }
      );
    }
  });

  it('should filter project assets', async () => {
    const assetsDir = './src/assets';

    const projectFiles = [
      path.join(assetsDir, 'models/test.mdl'),
      path.join(assetsDir, 'sprites/test.spr'),
      path.join(assetsDir, 'sound/test.wav'),
      path.join(assetsDir, 'maps/test.bsp')
    ];

    const excludeExtensions = ['mdl', 'bsp'];
    const assetsFilter = `*.!(${excludeExtensions.join('|')})`;

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve(
      { input: { assets: { dir: assetsDir, filter: assetsFilter } } }
    );

    const builder = new AmxxBuilder(projectConfig);

    await builder.buildAssets();

    for (const fileName of projectFiles) {
      const destFilePath = path.join(
        projectConfig.output.assets,
        path.relative(assetsDir, fileName)
      );

      const shouldExclude = some(
        excludeExtensions,
        (ext) => fileName.endsWith(`.${ext}`)
      );

      expect(fs.existsSync(destFilePath)).not.toEqual(shouldExclude);
    }
  });

  it('should call update functions only with absolute paths', async () => {
    const assetsDir = './src/scripts';
    const scriptsDir = './src/scripts';
    const includeDir = './src/include';

    const projectFiles = [
      path.join(includeDir, 'test1.inc'),
      path.join(scriptsDir, 'test2.sma'),
      path.join(scriptsDir, 'test3.sma'),
      path.join(scriptsDir, 'test4.sma'),
      path.join(scriptsDir, 'nested/test5.sma'),
      path.join(scriptsDir, 'nested/nested/test6.sma'),
      path.join(assetsDir, 'models/test7.mdl'),
      path.join(assetsDir, 'sprites/test8.spr'),
      path.join(assetsDir, 'sound/test9.wav'),
      path.join(assetsDir, 'maps/test10.bsp')
    ];

    const project = createProject(TEST_DIR);
    await project.initDir(projectFiles);

    process.chdir(project.projectPath);

    const projectConfig = await ProjectConfig.resolve(
      { input: { assets: assetsDir, scripts: scriptsDir } }
    );

    const builder = new AmxxBuilder(projectConfig);

    const updateAssetSpy = jest.spyOn(builder, 'updateAsset');
    const updateScriptSpy = jest.spyOn(builder, 'updateScript');
    const updateIncludeSpy = jest.spyOn(builder, 'updateInclude');

    await builder.build({});

    expect(updateAssetSpy).toBeCalled();
    for (const call of updateAssetSpy.mock.calls) {
      const [filePath] = call;
      expect(path.isAbsolute(filePath)).toEqual(true);
    }

    expect(updateScriptSpy).toBeCalled();
    for (const call of updateScriptSpy.mock.calls) {
      const [srcDir] = call;
      expect(path.isAbsolute(srcDir)).toEqual(true);
    }

    expect(updateIncludeSpy).toBeCalled();
    for (const call of updateIncludeSpy.mock.calls) {
      const [filePath] = call;
      expect(path.isAbsolute(filePath)).toEqual(true);
    }
  });
});
