import path from 'path';
import { isObject, map } from 'lodash';
import Chance from 'chance';

import { TEST_TMP_DIR } from '../constants';
import ProjectConfig from '../../src/project-config';
import config from '../../src/config';
import { mkdirpSync } from 'mkdirp';
import { IProjectConfig } from '../../src/types';

const chance = new Chance();

const TEST_DIR = path.join(TEST_TMP_DIR, 'config-resolver');

function resolveDefaultFlatValue(key: keyof IProjectConfig['output']) {
  switch (key) {
    case 'scripts': return true;
    case 'include': return true;
    case 'assets': return false;
  }

  return false;
}

describe('Project Config Resolver', () => {
  let projectDir: string = '';

  const resolveProjectPath = (p: string) => path.resolve(projectDir, p);

  beforeEach(() => {    
    projectDir = path.join(TEST_DIR, chance.word({ length: 8 }));
  });
  
  for (const key of ['scripts', 'include', 'assets'] as const) {
    describe(`input ${key}`, () => {
      it('should resolve input with defaults', async () => {
        const overrides = {
          input: {
            [key]: [
              'directory1',
              { dir: 'directory2' },
              { dir: 'directory3' },
            ]
          },
          rules: { flatCompilation: false }
        };
    
    
        const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);
    
        for (const input of projectConfig.input[key]) {
          expect(input).toHaveProperty('dir', resolveProjectPath(isObject(input) ? input['dir'] : input));
          expect(input).toHaveProperty('filter', []);
          expect(input).toHaveProperty('output', {
            dir: projectConfig.output[key]!.dir,
            dest: '.',
            flat: resolveDefaultFlatValue(key),
            prefix: '',
          });
        }
      });
    
      it('should resolve input with overrides', async () => {
        const overrides = {
          input: {
            [key]: [
              { dir: './directory1', output: { dest: 'sub1', flat: true, prefix: 'prefix1_' } },
              { dir: './directory2', output: { dest: 'sub2', flat: false, prefix: 'prefix2_' } },
            ]
          },
          rules: { flatCompilation: false }
        };
    
        const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);
    
        for (const input of projectConfig.input[key]) {
          expect(input).toHaveProperty('dir', resolveProjectPath(isObject(input) ? input['dir'] : input));
          expect(input).toHaveProperty('filter', []);
          expect(input).toHaveProperty('output', input.output);
        }
      });
    });

    describe(`output ${key}`, () => {
      it('should resolve output with defaults', async () => {
        const overrides = {
          output: {
            base: './dist',
            [key]: './directory',
          },
          rules: { flatCompilation: false }
        };

        const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);

        expect(projectConfig.output[key]).toHaveProperty('flat', resolveDefaultFlatValue(key));
        expect(projectConfig.output[key]).toHaveProperty('dir', resolveProjectPath(path.join(overrides.output.base, overrides.output[key])));
        expect(projectConfig.output[key]).toHaveProperty('dest', '.');
        expect(projectConfig.output[key]).toHaveProperty('prefix', '');
      });

      it('should resolve output with overrides', async () => {
        const output = { dir: './directory', dest: 'sub1', flat: true, prefix: 'prefix1_' };

        const overrides = {
          output: { base: './dist', [key]: output },
          rules: { flatCompilation: false }
        };

        const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);

        expect(projectConfig.output[key]).toHaveProperty('dir', resolveProjectPath(path.join(overrides.output.base, output.dir)));
        expect(projectConfig.output[key]).toHaveProperty('dest', output.dest);
        expect(projectConfig.output[key]).toHaveProperty('flat', output.flat);
        expect(projectConfig.output[key]).toHaveProperty('prefix', output.prefix);
      });
    });
  }
  
  it('should resolve undefined paths as defaults', async () => {
    const defaultConfig = ProjectConfig.resolve(config.defaultProjectType,{}, projectDir);

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
    }, projectDir);

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
    }, projectDir);

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
    }, projectDir);

    expect(projectConfig.input.scripts).toHaveLength(1);
    expect(projectConfig.input.scripts[0]).toHaveProperty('dir', projectDir);
    
    expect(projectConfig.input.include).toHaveLength(1);
    expect(projectConfig.input.include[0]).toHaveProperty('dir', projectDir);

    expect(projectConfig.input.assets).toHaveLength(1);
    expect(projectConfig.input.assets[0]).toHaveProperty('dir', projectDir);

    expect(projectConfig.output.scripts).toHaveProperty('dir', projectDir);
    expect(projectConfig.output.plugins).toHaveProperty('dir', projectDir);
    expect(projectConfig.output.include).toHaveProperty('dir', projectDir);
    expect(projectConfig.output.assets).toHaveProperty('dir', projectDir);
    expect(projectConfig.compiler.dir).toBe(projectDir);
    expect(projectConfig.thirdparty.dir).toBe(projectDir);
    expect(projectConfig.include).toEqual([projectDir]);
  });

  it('should resolve absolute paths', async () => {
    const overrides = {
      input: {
        scripts: [
          resolveProjectPath('scripts'),
          { dir: resolveProjectPath('scripts2') },
        ],
        include: resolveProjectPath('include'),
        assets: resolveProjectPath('assets'),
      },
      output: {
        base: resolveProjectPath('out'),
        scripts: resolveProjectPath('scripts'),
        plugins: resolveProjectPath('plugins'),
        include: resolveProjectPath('include'),
        assets: resolveProjectPath('assets')
      },
      compiler: { dir: resolveProjectPath('compiler') },
      thirdparty: { dir: resolveProjectPath('thirdparty') },
      include: [resolveProjectPath('extra-include')],
      rules: { flatCompilation: false }
    };

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);

    expect(projectConfig.input.scripts).toHaveLength(overrides.input.scripts.length);

    for (const input of projectConfig.input.scripts) {
      expect(input).toHaveProperty('dir', isObject(input) ? input.dir : input);
    }

    expect(projectConfig.input.assets).toHaveLength(1);
    expect(projectConfig.input.assets[0]).toHaveProperty('dir', overrides.input.assets);

    expect(projectConfig.input.include).toHaveLength(1);
    expect(projectConfig.input.include[0]).toHaveProperty('dir', overrides.input.include);

    expect(projectConfig.output.scripts).toHaveProperty('dir', overrides.output.scripts);
    expect(projectConfig.output.plugins).toHaveProperty('dir', overrides.output.plugins);
    expect(projectConfig.output.include).toHaveProperty('dir', overrides.output.include);
    expect(projectConfig.output.assets).toHaveProperty('dir', overrides.output.assets);
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

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);

    expect(projectConfig.input.scripts).toHaveLength(overrides.input.scripts.length);

    for (const input of projectConfig.input.scripts) {
      expect(input).toHaveProperty('dir', resolveProjectPath(isObject(input) ? input.dir : input));
    }

    expect(projectConfig.input.assets).toHaveLength(1);
    expect(projectConfig.input.assets[0]).toHaveProperty('dir', resolveProjectPath(overrides.input.assets));

    expect(projectConfig.input.include).toHaveLength(1);
    expect(projectConfig.input.include[0]).toHaveProperty('dir', resolveProjectPath(overrides.input.include));

    expect(projectConfig.output.scripts).toHaveProperty('dir', resolveProjectPath(overrides.output.scripts));
    expect(projectConfig.output.plugins).toHaveProperty('dir', resolveProjectPath(overrides.output.plugins));
    expect(projectConfig.output.include).toHaveProperty('dir', resolveProjectPath(overrides.output.include));
    expect(projectConfig.output.assets).toHaveProperty('dir', resolveProjectPath(overrides.output.assets));
    expect(projectConfig.compiler.dir).toBe(resolveProjectPath(overrides.compiler.dir));
    expect(projectConfig.thirdparty.dir).toBe(resolveProjectPath(overrides.thirdparty.dir));
    expect(projectConfig.include).toEqual(map(overrides.include, resolveProjectPath));
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

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);

    const resolveOutPath = (p: string) => resolveProjectPath(path.join(outputBaseDir, p));

    expect(projectConfig.output.scripts).toHaveProperty('dir', resolveOutPath(overrides.output.scripts));
    expect(projectConfig.output.plugins).toHaveProperty('dir', resolveOutPath(overrides.output.plugins));
    expect(projectConfig.output.include).toHaveProperty('dir', resolveOutPath(overrides.output.include));
    expect(projectConfig.output.assets).toHaveProperty('dir', resolveOutPath(overrides.output.assets));
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
    }, projectDir);

    expect(projectConfig.output.scripts).toBeNull();
    expect(projectConfig.output.plugins).toBeNull();
    expect(projectConfig.output.include).toBeNull();
    expect(projectConfig.output.assets).toBeNull();
  });

  it('should resolve empty output paths as output base dir', async () => {
    const outputBaseDir = './out';
    const outputAbsBaseDir = path.resolve(projectDir, outputBaseDir);

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, {
      output: {
        base: outputBaseDir,
        scripts: '',
        plugins: '',
        include: '',
        assets: ''
      }
    }, projectDir);


    expect(projectConfig.output.scripts).toHaveProperty('dir', outputAbsBaseDir);
    expect(projectConfig.output.plugins).toHaveProperty('dir', outputAbsBaseDir);
    expect(projectConfig.output.include).toHaveProperty('dir', outputAbsBaseDir);
    expect(projectConfig.output.assets).toHaveProperty('dir', outputAbsBaseDir);
  });
});
