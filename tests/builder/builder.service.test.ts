import fs from 'fs';
import path from 'path';
import { map, some } from 'lodash';

import { createProjectConfig } from '../../src/project-config';
import BuilderService from '../../src/builder/services/builder.service';
import config from '../../src/common/config';
import { IResolvedTarget, IResolvedProjectConfig } from '../../src/common/types';

import createProject from '../helpers/create-project';
import { TEST_TMP_DIR } from '../constants';

const TEST_DIR = path.join(TEST_TMP_DIR, 'builder');

const { default: compilerMock } = jest.requireMock('../../src/compiler');
const copyFile = jest.spyOn(jest.requireActual('../../src/utils/copy-file'), 'default');

function createCompileParams(projectFile: string, options: IResolvedTarget, projectConfig: IResolvedProjectConfig) {
  const { name } = path.parse(projectFile);
  const filePath = path.join(projectConfig.path, projectFile);

  return {
    path: filePath,
    dest: path.resolve(
      options.dest,
      options.flat ? '.' : path.relative(options.src, path.dirname(filePath)),
      `${options.prefix}${name}.amxx`
    ),
    compiler: path.resolve(projectConfig.compiler.dir, projectConfig.compiler.executable),
    includeDir: [
      path.resolve(projectConfig.compiler.dir, 'include'),
      ...projectConfig.include,
      ...map(projectConfig.targets.include, 'src')
    ]
  };
}

describe('Builder', () => {
  let project: ReturnType<typeof createProject>;

  beforeAll(async () => {
    await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
    await fs.promises.mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    project = createProject(TEST_DIR);
    await fs.promises.mkdir(project.path, { recursive: true });
    process.chdir(project.path);

    jest.clearAllMocks();
    // compilerMock.mockClear();
    copyFile.mockClear();
  });

  afterEach(async () => {
    process.chdir(TEST_TMP_DIR);

    await fs.promises.rm(project.path, { recursive: true, force: true });
  });

  it('should build test project scripts', async () => {
    const scriptsDir = './src/scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'test2.sma'),
      path.join(scriptsDir, 'test3.sma'),
      path.join(scriptsDir, 'nested/test4.sma'),
      path.join(scriptsDir, 'nested/nested/test5.sma')
    ];

    await project.initDir(projectFiles);

    const projectConfig = await createProjectConfig(
      config.project.defaultType,
      { input: { scripts: [scriptsDir], include: [] } }
    );

    const builder = new BuilderService(projectConfig);

    await builder.buildScripts();

    for (const fileName of projectFiles) {
      const filePath = path.join(projectConfig.path, fileName);
      const compilerParams = createCompileParams(fileName, builder['getPluginTarget'](filePath), projectConfig);
      expect(compilerMock).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project scripts with nested include dirs', async () => {
    const includeDir = './src/include';
    const scriptsDir = './src/scripts';
    const scriptPath = path.join(scriptsDir, 'test.sma');
    const projectNestedIncludeDirs = map(
      ['nested', 'nested/nested', 'nested/nested/nested', 'nested2'],
      dir => path.join(includeDir, dir)
    );

    const projectFiles = [
      scriptPath,
      path.join(includeDir, 'test.inc'),
      ...map(projectNestedIncludeDirs, dir => path.join(dir, 'test.inc'))
    ];

    await project.initDir(projectFiles);

    const projectConfig = await createProjectConfig(
      config.project.defaultType,
      { input: { scripts: [scriptsDir], include: [includeDir] } }
    );

    const builder = new BuilderService(projectConfig);

    await builder.buildScripts();

    const compilerParams = createCompileParams(
      scriptPath,
      builder['getPluginTarget'](path.join(projectConfig.path, scriptPath)),
      {
      ...projectConfig,
      targets: {
        ...projectConfig.targets,
        include: [
          ...projectConfig.targets.include,
          ...map(
            projectNestedIncludeDirs,
            dir => ({
              src: path.resolve(project.path, dir),
              dest: projectConfig.targets.include[0].dest,
              filter: [],
              prefix: '',
              flat: true
            } as IResolvedTarget)
          )
        ]
      }
    });

    expect(compilerMock).toHaveBeenCalledWith(compilerParams);
  });

  it('should build test project without adding a non-existing include input dirs', async () => {
    const includeDirs = ['./src/include', './src/include1', './src/include2'];
    const scriptsDir = './src/scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test.sma')
    ];

    await project.initDir(projectFiles);

    const projectConfig = await createProjectConfig(
      config.project.defaultType,
      { input: { scripts: [scriptsDir], include: includeDirs } }
    );

    const builder = new BuilderService(projectConfig);

    await builder.buildScripts();

    for (const fileName of projectFiles) {
      const filePath = path.join(projectConfig.path, fileName);
      const compilerParams = createCompileParams(fileName, builder['getPluginTarget'](filePath), {
        ...projectConfig,
        targets: { ...projectConfig.targets, include: [] }
      });

      expect(compilerMock).toHaveBeenCalledWith(compilerParams);
    }
  });

  describe('with multiple dirs', () => {
    async function buildTestProjectAndCheck(flatCompilation: boolean) {
      const scriptsDir = './src/scripts';
      const extraScriptsDir = './src/extra-scripts';

      const scriptFiles = [
        path.join(scriptsDir, 'test1.sma'),
        path.join(scriptsDir, 'test2.sma'),
        path.join(scriptsDir, 'test3.sma'),
        path.join(scriptsDir, 'nested/test4.sma'),
        path.join(scriptsDir, 'nested/nested/test5.sma')
      ];

      const extraScriptFiles = [
        path.join(extraScriptsDir, 'extra1.sma'),
        path.join(extraScriptsDir, 'nested/extra2.sma')
      ];

      await project.initDir([...scriptFiles, ...extraScriptFiles]);

      const projectConfig = await createProjectConfig(
        config.project.defaultType,
        {
          input: { scripts: [scriptsDir, extraScriptsDir], include: [] },
          rules: { flatCompilation }
        }
      );

      const builder = new BuilderService(projectConfig);

      await builder.buildScripts();

      for (const fileName of scriptFiles) {
        const filePath = path.join(projectConfig.path, fileName);
        const compilerParams = createCompileParams(fileName, builder['getPluginTarget'](filePath), projectConfig);
        expect(compilerMock).toHaveBeenCalledWith(compilerParams);
      }

      for (const fileName of extraScriptFiles) {
        const filePath = path.join(projectConfig.path, fileName);
        const compilerParams = createCompileParams(fileName, builder['getPluginTarget'](filePath), projectConfig);
        expect(compilerMock).toHaveBeenCalledWith(compilerParams);
      }
    }

    it('should build test project with flat compilation enabled', async () => {
      await buildTestProjectAndCheck(true);
    });

    it('should build test project with flat compilation disabled', async () => {
      await buildTestProjectAndCheck(false);
    });
  });

  it('should build test project scripts with neseted object script input', async () => {
    const scriptsDir = './src/scripts';
    const extraScriptsDir = './src/extra-scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'test2.sma'),
      path.join(extraScriptsDir, 'extra1.sma'),
      path.join(extraScriptsDir, 'nested/extra2.sma')
    ];

    await project.initDir(projectFiles);

    const projectConfig = await createProjectConfig(
      config.project.defaultType,{
      input: { scripts: [{ dir: scriptsDir }, { dir: extraScriptsDir }], include: [] }
    });

    const builder = new BuilderService(projectConfig);

    await builder.buildScripts();

    for (const fileName of projectFiles) {
      const filePath = path.join(projectConfig.path, fileName);
      const compilerParams = createCompileParams(fileName, builder['getPluginTarget'](filePath), projectConfig);
      expect(compilerMock).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project scripts with enabled flat compilation in input', async () => {
    const scriptsDir = './src/scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'test2.sma'),
      path.join(scriptsDir, 'nested/test3.sma'),
      path.join(scriptsDir, 'nested/test4.sma'),
      path.join(scriptsDir, 'nested/sub/test5.sma')
    ];

    await project.initDir(projectFiles);

    const inputConfig = { dir: scriptsDir, output: { flat: true } };

    const projectConfig = await createProjectConfig(
      config.project.defaultType,{
      input: { scripts: [inputConfig], include: [] },
      rules: { flatCompilation: false }
    });

    const builder = new BuilderService(projectConfig);

    await builder.buildScripts();

    expect(compilerMock).toHaveBeenCalledTimes(projectFiles.length);

    for (const fileName of projectFiles) {
      const filePath = path.join(projectConfig.path, fileName);
      const compilerParams = createCompileParams(fileName, builder['getPluginTarget'](filePath), projectConfig);
      expect(compilerMock).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project scripts with disabled flat compilation in input', async () => {
    const scriptsDir = './src/scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'test2.sma'),
      path.join(scriptsDir, 'nested/test3.sma'),
      path.join(scriptsDir, 'nested/test4.sma'),
      path.join(scriptsDir, 'nested/sub/test5.sma')
    ];

    await project.initDir(projectFiles);

    const inputConfig = { dir: scriptsDir, flat: false };

    const projectConfig = await createProjectConfig(
      config.project.defaultType,{
      input: { scripts: [inputConfig], include: [] },
      rules: { flatCompilation: true }
    });

    const builder = new BuilderService(projectConfig);

    await builder.buildScripts();

    expect(compilerMock).toHaveBeenCalledTimes(projectFiles.length);

    for (const fileName of projectFiles) {
      const filePath = path.join(projectConfig.path, fileName);
      const compilerParams = createCompileParams(fileName, builder['getPluginTarget'](filePath), projectConfig);
      expect(compilerMock).toHaveBeenCalledWith(compilerParams);
    }
  });

  it('should build test project scripts with plugin prefix input', async () => {
    const scriptsDir = './src/scripts';

    const projectFiles = [
      path.join(scriptsDir, 'test1.sma'),
      path.join(scriptsDir, 'nested/test2.sma')
    ];

    await project.initDir(projectFiles);

    const inputConfig = { dir: scriptsDir, prefix: 'test_' };

    const projectConfig = await createProjectConfig(
      config.project.defaultType,{
      input: { scripts: [inputConfig], include: [] }
    });

    const builder = new BuilderService(projectConfig);

    await builder.buildScripts();

    expect(compilerMock).toHaveBeenCalledTimes(projectFiles.length);

    for (const fileName of projectFiles) {
      const filePath = path.join(projectConfig.path, fileName);
      const compilerParams = createCompileParams(fileName, builder['getPluginTarget'](filePath), projectConfig);
      expect(compilerMock).toHaveBeenCalledWith(compilerParams);
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

    await project.initDir(projectFiles);

    const prefix = 'prefix_';

    const projectConfig = await createProjectConfig(
      config.project.defaultType,
      {
        input: {
          scripts: [
            { dir: scriptsDir, output: { flat: false } },
            { dir: prefixedDir, output: { prefix, flat: false } },
            { dir: flatDir, output: { flat: true } },
            { dir: prefixedFlatDir, output: { prefix, flat: true } },
            { dir: destDir, output: { dir: './sub', flat: false } },
            { dir: destPrefixedFlatDir, output: { prefix, dir: './sub', flat: true } }
          ],
          include: []
        }
      }
    );

    const builder = new BuilderService(projectConfig);

    await builder.buildScripts();

    const isRelative = (filePath: string, dir: string) => !path.relative(dir, filePath).startsWith('..');

    const expectedCalls = projectConfig.targets.plugins
      .reduce(
        (acc, input) => acc + projectFiles.filter(file => isRelative(file, input.src)).length,
        0
    );

    expect(compilerMock).toHaveBeenCalledTimes(expectedCalls);

    for (const input of projectConfig.targets.plugins) {
      const files = projectFiles.filter(file => isRelative(file, input.src));

      for (const file of files) {
        const compilerParams = createCompileParams(file, input, projectConfig);
        expect(compilerMock).toHaveBeenCalledWith(compilerParams);
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

    await project.initDir(projectFiles);

    const projectConfig = await createProjectConfig(
      config.project.defaultType,
      { input: { assets: assetsDir } }
    );

    const builder = new BuilderService(projectConfig);
    jest.spyOn(builder, 'updateAsset');

    await builder.buildAssets();

    for (const fileName of projectFiles) {
      expect(builder.updateAsset).toHaveBeenCalledWith(path.resolve(fileName));
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

    await project.initDir([...projectFiles, ...extraProjectFiles]);

    const projectConfig = await createProjectConfig(
      config.project.defaultType,
      { input: { assets: [assetsDir, extraAssetsDir] } }
    );

    const builder = new BuilderService(projectConfig);
    jest.spyOn(builder, 'updateAsset');

    await builder.buildAssets();

    for (const fileName of projectFiles) {
      expect(builder.updateAsset).toHaveBeenCalledWith(path.resolve(fileName));
    }

    for (const fileName of extraProjectFiles) {
      expect(builder.updateAsset).toHaveBeenCalledWith(path.resolve(fileName));
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

    await project.initDir(projectFiles);

    const projectConfig = await createProjectConfig(
      config.project.defaultType,
      { input: { assets: { dir: assetsDir, filter: assetsFilter } } }
    );

    const builder = new BuilderService(projectConfig);

    await builder.buildAssets();

    for (const fileName of projectFiles) {
      const destFilePath = path.join(
        projectConfig.targets.assets[0].dest,
        path.relative(assetsDir, fileName)
      );

      const shouldExclude = some(excludeExtensions, ext => fileName.endsWith(`.${ext}`));

      expect(fs.existsSync(destFilePath)).not.toEqual(shouldExclude);
    }
  });

  it('should detect changes of asset files', async () => {
    const assetsDir = './assets';
    const projectFiles = [
      path.join(assetsDir, 'models/test.mdl'),
      path.join(assetsDir, 'sprites/test.spr'),
      path.join(assetsDir, 'sound/test.wav'),
      path.join(assetsDir, 'maps/test.bsp')
    ];

    await project.initDir(projectFiles);

    const projectConfig = await createProjectConfig(
      config.project.defaultType,
      { input: { assets: assetsDir } }
    );

    const builder = new BuilderService(projectConfig);

    const resolveDestPath = (projectFile: string) => {
      const filePath = path.join(projectConfig.path, projectFile);
      const target = builder['getFileTarget'](filePath);

      return path.join(target.dest, path.relative(assetsDir, projectFile));
    };

    const expectFileCopied = (projectFile: string) => expect(copyFile)
      .toHaveBeenCalledWith(
        path.join(projectConfig.path, projectFile),
        resolveDestPath(projectFile)
      );

    await builder.buildAssets();

    expect(copyFile).toHaveBeenCalledTimes(projectFiles.length);

    copyFile.mockClear();

    await fs.promises.writeFile(path.join(projectConfig.path, projectFiles[0]), 'somecontent-1');
    await fs.promises.writeFile(resolveDestPath(projectFiles[1]), 'somecontent-2');
    await fs.promises.unlink(resolveDestPath(projectFiles[2]));

    await builder.buildAssets();

    expect(copyFile).toHaveBeenCalledTimes(3);

    expectFileCopied(projectFiles[0]);
    expectFileCopied(projectFiles[1]);
    expectFileCopied(projectFiles[2]);
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

    await project.initDir(projectFiles);

    const projectConfig = await createProjectConfig(
      config.project.defaultType,
      { input: { assets: assetsDir, scripts: scriptsDir } }
    );

    const builder = new BuilderService(projectConfig);

    const updateAssetSpy = jest.spyOn(builder, 'updateAsset');
    const updateScriptSpy = jest.spyOn(builder, 'updateScript');
    const updateIncludeSpy = jest.spyOn(builder, 'updateInclude');

    await builder.buildAssets();
    await builder.buildInclude();
    await builder.buildScripts();

    expect(updateAssetSpy).toHaveBeenCalled();
    for (const call of updateAssetSpy.mock.calls) {
      const [filePath] = call;
      expect(path.isAbsolute(filePath)).toEqual(true);
    }

    expect(updateScriptSpy).toHaveBeenCalled();
    for (const call of updateScriptSpy.mock.calls) {
      const [srcDir] = call;
      expect(path.isAbsolute(srcDir)).toEqual(true);
    }

    expect(updateIncludeSpy).toHaveBeenCalled();
    for (const call of updateIncludeSpy.mock.calls) {
      const [filePath] = call;
      expect(path.isAbsolute(filePath)).toEqual(true);
    }
  });

  describe('flat compilation', () => {
    it('when script input is flat and plugin input is not', async () => {
      const scriptsDir = './src/scripts';
      const scriptName = 'foo/bar/baz/test.sma';

      const projectFiles = [
        path.join(scriptsDir, scriptName)
      ];

      await project.initDir(projectFiles);

      const projectConfig = await createProjectConfig(
        config.project.defaultType,
        {
          input: { scripts: { dir: scriptsDir, output: { flat: true } }, include: [] },
          output: { plugins: { dir: '.', flat: false } }
        }
      );

      const builder = new BuilderService(projectConfig);

      await builder.buildScripts();

      expect(compilerMock).toHaveBeenCalledTimes(1);
      const [callOptions] = compilerMock.mock.calls[0];

      const scriptPath = path.join(projectConfig.path, scriptsDir, scriptName);

      expect(callOptions).toHaveProperty('dest', path.join(
        builder['getPluginTarget'](scriptPath).dest,
        `${path.parse(scriptName).name}.${projectConfig.compiler.config.fileExtensions.plugin}`
      ));
    });

    it('when script input is not flat and plugin output is flat', async () => {
      const scriptsDir = './src/scripts';
      const scriptName = 'foo/bar/baz/test.sma';

      const projectFiles = [
        path.join(scriptsDir, scriptName)
      ];

      await project.initDir(projectFiles);

      const projectConfig = await createProjectConfig(
        config.project.defaultType,
        {
          input: { scripts: { dir: scriptsDir, output: { flat: false } }, include: [] },
          output: { plugins: { dir: '.', flat: true } }
        }
      );

      const builder = new BuilderService(projectConfig);

      await builder.buildScripts();

      expect(compilerMock).toHaveBeenCalledTimes(1);
      const [callOptions] = compilerMock.mock.calls[0];

      const scriptPath = path.join(projectConfig.path, scriptsDir, scriptName);

      expect(callOptions).toHaveProperty('dest', path.join(
        builder['getPluginTarget'](scriptPath).dest,
        `${path.parse(scriptName).name}.${projectConfig.compiler.config.fileExtensions.plugin}`
      ));
    });

    it('when script input is flat and plugin input is flat', async () => {
      const scriptsDir = './src/scripts';
      const scriptName = 'foo/bar/baz/test.sma';

      const projectFiles = [
        path.join(scriptsDir, scriptName)
      ];

      await project.initDir(projectFiles);

      const projectConfig = await createProjectConfig(
        config.project.defaultType,
        {
          input: { scripts: { dir: scriptsDir, output: { flat: true } }, include: [] },
          output: { plugins: { dir: '.', flat: true } }
        }
      );

      const builder = new BuilderService(projectConfig);

      await builder.buildScripts();

      expect(compilerMock).toHaveBeenCalledTimes(1);
      const [callOptions] = compilerMock.mock.calls[0];

      const scriptPath = path.join(projectConfig.path, scriptsDir, scriptName);

      expect(callOptions).toHaveProperty('dest', path.join(
        builder['getPluginTarget'](scriptPath).dest,
        `${path.parse(scriptName).name}.${projectConfig.compiler.config.fileExtensions.plugin}`
      ));
    });

    it('when script input is not flat and plugin input is not flat', async () => {
      const scriptsDir = './src/scripts';
      const scriptName = 'foo/bar/baz/test.sma';

      const projectFiles = [
        path.join(scriptsDir, scriptName)
      ];

      await project.initDir(projectFiles);

      const projectConfig = await createProjectConfig(
        config.project.defaultType,
        {
          input: { scripts: { dir: scriptsDir, output: { flat: false } }, include: [] },
          output: { plugins: { dir: '.', flat: false } }
        }
      );

      const builder = new BuilderService(projectConfig);

      await builder.buildScripts();

      expect(compilerMock).toHaveBeenCalledTimes(1);
      const [callOptions] = compilerMock.mock.calls[0];

      const scriptPath = path.join(projectConfig.path, scriptsDir, scriptName);

      expect(callOptions).toHaveProperty('dest', path.join(
        builder['getPluginTarget'](scriptPath).dest,
        path.dirname(scriptName),
        `${path.parse(scriptName).name}.${projectConfig.compiler.config.fileExtensions.plugin}`
      ));
    });

    it('when output for script input is not set and plugin input is flat', async () => {
      const scriptsDir = './src/scripts';
      const scriptName = 'foo/bar/baz/test.sma';

      const projectFiles = [
        path.join(scriptsDir, scriptName)
      ];

      await project.initDir(projectFiles);


      const projectConfig = await createProjectConfig(
        config.project.defaultType,
        {
          input: { scripts: { dir: scriptsDir }, include: [] },
          output: { plugins: { dir: '.', flat: true } }
        }
      );

      const builder = new BuilderService(projectConfig);

      await builder.buildScripts();

      expect(compilerMock).toHaveBeenCalledTimes(1);
      const [callOptions] = compilerMock.mock.calls[0];

      const scriptPath = path.join(projectConfig.path, scriptsDir, scriptName);

      expect(callOptions).toHaveProperty('dest', path.join(
        builder['getPluginTarget'](scriptPath).dest,
        `${path.parse(scriptName).name}.${projectConfig.compiler.config.fileExtensions.plugin}`
      ));
    });

    it('when output for script input is not set and plugin input is not flat', async () => {
      const scriptsDir = './src/scripts';
      const scriptName = 'foo/bar/baz/test.sma';

      const projectFiles = [
        path.join(scriptsDir, scriptName)
      ];

      await project.initDir(projectFiles);

      const projectConfig = await createProjectConfig(
        config.project.defaultType,
        {
          input: { scripts: { dir: scriptsDir }, include: [] },
          output: { plugins: { dir: '.', flat: false } }
        }
      );

      const builder = new BuilderService(projectConfig);

      await builder.buildScripts();

      expect(compilerMock).toHaveBeenCalledTimes(1);
      const [callOptions] = compilerMock.mock.calls[0];

      const scriptPath = path.join(projectConfig.path, scriptsDir, scriptName);

      expect(callOptions).toHaveProperty('dest', path.join(
        builder['getPluginTarget'](scriptPath).dest,
        path.dirname(scriptName),
        `${path.parse(scriptName).name}.${projectConfig.compiler.config.fileExtensions.plugin}`
      ));
    });
  });
});
