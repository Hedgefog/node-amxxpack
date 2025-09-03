import path from 'path';
import { isObject, map } from 'lodash';

import { TEST_TMP_DIR } from '../constants';
import ProjectConfig from '../../src/project-config';
import config from '../../src/config';

const PROJECT_DIR = TEST_TMP_DIR;

describe('Project Config Resolver', () => {
  it('should resolve scripts input', async () => {
    const overrides = {
      input: {
        scripts: [
          'scripts',
          { dir: 'scripts2' },
          { dir: 'scripts3', flat: true },
        ],
        include: 'include',
        assets: 'assets',
      },
      rules: { flatCompilation: false }
    };

    const resolvePath = (p: string) => path.resolve(PROJECT_DIR, p);

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, PROJECT_DIR);

    for (const input of projectConfig.input.scripts) {
      expect(input).toHaveProperty('dir', resolvePath(isObject(input) ? input.dir : input));
      expect(input).toHaveProperty('dest', isObject(input) ? input.dest ?? '.' : '.');
      expect(input).toHaveProperty('flat', isObject(input) ? input.flat ?? overrides.rules.flatCompilation : overrides.rules.flatCompilation);
      expect(input).toHaveProperty('prefix', isObject(input) ? input.prefix ?? '' : '');
    }
  });

  it('should resolve assets input', async () => {
    const overrides = {
      input: {
        assets: [
          'assets',
        ],
      },
    };

    const resolvePath = (p: string) => path.resolve(PROJECT_DIR, p);

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, PROJECT_DIR);

    for (const input of projectConfig.input.assets) {
      expect(input).toHaveProperty('dir', resolvePath(isObject(input) ? input.dir : input));
      expect(input).toHaveProperty('dest', isObject(input) ? input.dest ?? '.' : '.');
      expect(input).toHaveProperty('flat', false);
      expect(input).toHaveProperty('filter', isObject(input) ? input.filter ?? [] : []);
    }
  });
  
  it('should resolve undefined paths as defaults', async () => {
    const defaultConfig = ProjectConfig.resolve(config.defaultProjectType,{}, PROJECT_DIR);

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, {
      input: {
        scripts: undefined,
        include: undefined,
        assets: undefined,
      },
      output: {
        scripts: undefined,
        plugins: undefined,
        include: undefined,
        assets: undefined
      },
      compiler: { dir: undefined },
      thirdparty: { dir: undefined },
      include: undefined
    }, PROJECT_DIR);

    expect(projectConfig).toEqual(defaultConfig);
  });

  it('should resolve null output paths as null values', async () => {
    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, {
      output: {
        scripts: null,
        plugins: null,
        include: null,
        assets: null
      }
    }, PROJECT_DIR);

    expect(projectConfig.output.scripts).toBeNull();
    expect(projectConfig.output.plugins).toBeNull();
    expect(projectConfig.output.include).toBeNull();
    expect(projectConfig.output.assets).toBeNull();
  });

  it('should resolve empty paths as project root', async () => {
    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, {
      input: {
        scripts: '',
        include: '',
        assets: '',
      },
      output: {
        base: '',
        scripts: '',
        plugins: '',
        include: '',
        assets: ''
      },
      compiler: { dir: '' },
      thirdparty: { dir: '' },
      include: [''],
      rules: { flatCompilation: false }
    }, PROJECT_DIR);

    expect(projectConfig.input.scripts).toHaveLength(1);
    expect(projectConfig.input.scripts[0]).toHaveProperty('dir', PROJECT_DIR);
    
    expect(projectConfig.input.include).toHaveLength(1);
    expect(projectConfig.input.include[0]).toBe(PROJECT_DIR);

    expect(projectConfig.input.assets).toHaveLength(1);
    expect(projectConfig.input.assets[0]).toHaveProperty('dir', PROJECT_DIR);

    expect(projectConfig.output.scripts).toBe(PROJECT_DIR);
    expect(projectConfig.output.plugins).toBe(PROJECT_DIR);
    expect(projectConfig.output.include).toBe(PROJECT_DIR);
    expect(projectConfig.output.assets).toBe(PROJECT_DIR);
    expect(projectConfig.compiler.dir).toBe(PROJECT_DIR);
    expect(projectConfig.thirdparty.dir).toBe(PROJECT_DIR);
    expect(projectConfig.include).toEqual([PROJECT_DIR]);
  });

  it('should resolve absolute paths', async () => {
    const overrides = {
      input: {
        scripts: [
          path.resolve(PROJECT_DIR, 'scripts'),
          { dir: path.resolve(PROJECT_DIR, 'scripts2') },
        ],
        include: path.resolve(PROJECT_DIR, 'include'),
        assets: path.resolve(PROJECT_DIR, 'assets'),
      },
      output: {
        base: path.resolve(PROJECT_DIR, 'out'),
        scripts: path.resolve(PROJECT_DIR, 'scripts'),
        plugins: path.resolve(PROJECT_DIR, 'plugins'),
        include: path.resolve(PROJECT_DIR, 'include'),
        assets: path.resolve(PROJECT_DIR, 'assets')
      },
      compiler: { dir: path.resolve(PROJECT_DIR, 'compiler') },
      thirdparty: { dir: path.resolve(PROJECT_DIR, 'thirdparty') },
      include: [path.resolve(PROJECT_DIR, 'extra-include')],
      rules: { flatCompilation: false }
    };

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides);

    expect(projectConfig.input.scripts).toHaveLength(overrides.input.scripts.length);

    for (const input of projectConfig.input.scripts) {
      expect(input).toHaveProperty('dir', isObject(input) ? input.dir : input);
    }

    expect(projectConfig.input.assets).toHaveLength(1);
    expect(projectConfig.input.assets[0]).toHaveProperty('dir', overrides.input.assets);

    expect(projectConfig.input.include).toEqual([overrides.input.include]);
    expect(projectConfig.output.scripts).toBe(overrides.output.scripts);
    expect(projectConfig.output.plugins).toBe(overrides.output.plugins);
    expect(projectConfig.output.include).toBe(overrides.output.include);
    expect(projectConfig.output.assets).toBe(overrides.output.assets);
    expect(projectConfig.compiler.dir).toBe(overrides.compiler.dir);
    expect(projectConfig.thirdparty.dir).toBe(overrides.thirdparty.dir);
    expect(projectConfig.include).toEqual(overrides.include);
  });

  it('should resolve relative paths', async () => {
    const overrides = {
      input: {
        scripts: [
          'scripts',
          { dir: 'scripts2' },
        ],
        include: 'include',
        assets: 'assets',
      },
      output: {
        base: '',
        scripts: 'out/scripts',
        plugins: 'out/plugins',
        include: 'out/include',
        assets: 'out/assets'
      },
      compiler: { dir: 'compiler' },
      thirdparty: { dir: 'thirdparty' },
      include: ['extra-include'],
      rules: { flatCompilation: false }
    };

    const resolvePath = (p: string) => path.resolve(PROJECT_DIR, p);

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, PROJECT_DIR);

    expect(projectConfig.input.scripts).toHaveLength(overrides.input.scripts.length);

    for (const input of projectConfig.input.scripts) {
      expect(input).toHaveProperty('dir', resolvePath(isObject(input) ? input.dir : input));
    }

    expect(projectConfig.input.assets).toHaveLength(1);
    expect(projectConfig.input.assets[0]).toHaveProperty('dir', resolvePath(overrides.input.assets));

    expect(projectConfig.input.include).toEqual([resolvePath(overrides.input.include)]);
    expect(projectConfig.output.scripts).toBe(resolvePath(overrides.output.scripts));
    expect(projectConfig.output.plugins).toBe(resolvePath(overrides.output.plugins));
    expect(projectConfig.output.include).toBe(resolvePath(overrides.output.include));
    expect(projectConfig.output.assets).toBe(resolvePath(overrides.output.assets));
    expect(projectConfig.compiler.dir).toBe(resolvePath(overrides.compiler.dir));
    expect(projectConfig.thirdparty.dir).toBe(resolvePath(overrides.thirdparty.dir));
    expect(projectConfig.include).toEqual(map(overrides.include, resolvePath));
  });

  it('should resolve out paths using base dir', async () => {
    const outputBaseDir = './out';

    const overrides = {
      output: {
        base: outputBaseDir,
        scripts: './scripts',
        plugins: './plugins',
        include: './include',
        assets: './assets'
      }
    };

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, PROJECT_DIR);

    const resolveOutPath = (p: string) => path.resolve(PROJECT_DIR, outputBaseDir, p);

    expect(projectConfig.output.scripts).toBe(resolveOutPath(overrides.output.scripts));
    expect(projectConfig.output.plugins).toBe(resolveOutPath(overrides.output.plugins));
    expect(projectConfig.output.include).toBe(resolveOutPath(overrides.output.include));
    expect(projectConfig.output.assets).toBe(resolveOutPath(overrides.output.assets));
  });

  it('should resolve out paths with null values using base dir', async () => {
    const outputBaseDir = './out';

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, {
      output: {
        base: outputBaseDir,
        scripts: null,
        plugins: null,
        include: null,
        assets: null
      }
    }, PROJECT_DIR);

    expect(projectConfig.output.scripts).toBeNull();
    expect(projectConfig.output.plugins).toBeNull();
    expect(projectConfig.output.include).toBeNull();
    expect(projectConfig.output.assets).toBeNull();
  });

  it('should resolve empty output paths as output base dir', async () => {
    const outputBaseDir = './out';
    const outputAbsBaseDir = path.resolve(PROJECT_DIR, outputBaseDir);

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, {
      output: {
        base: outputBaseDir,
        scripts: '',
        plugins: '',
        include: '',
        assets: ''
      }
    }, PROJECT_DIR);


    expect(projectConfig.output.scripts).toBe(outputAbsBaseDir);
    expect(projectConfig.output.plugins).toBe(outputAbsBaseDir);
    expect(projectConfig.output.include).toBe(outputAbsBaseDir);
    expect(projectConfig.output.assets).toBe(outputAbsBaseDir);
  });
});
