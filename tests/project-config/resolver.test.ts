import path from 'path';
import { filter, isObject, map, over } from 'lodash';
import Chance from 'chance';

import { TEST_TMP_DIR } from '../constants';
import ProjectConfig from '../../src/project-config';
import config from '../../src/config';
import { IProjectConfig, IResolvedProjectConfig } from '../../src/types';

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

  const resolveProjectPath = (...p: string[]) => path.resolve(projectDir, ...p);

  beforeEach(() => {    
    projectDir = path.join(TEST_DIR, chance.word({ length: 8 }));
  });
  
  for (const key of ['scripts', 'include', 'assets'] as (keyof IResolvedProjectConfig['targets'])[]) {
    describe(`input ${key}`, () => {
      it('should resolve input with defaults', async () => {
        const overrides = {
          input: {
            [key]: [
              './directory1',
              { dir: './directory2' },
              { dir: './directory3' },
            ]
          },
          rules: { flatCompilation: false }
        };
    
    
        const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);
    
        for (const [i, input] of overrides.input[key].entries()) {
          const target = projectConfig.targets[key][i];

          const expectedSrc = resolveProjectPath(isObject(input) ? input.dir : input);

          const expectedDest = resolveProjectPath(
            projectConfig.defaults.output!.base as string,
            projectConfig.defaults.output![key] as string
          );

          expect(target).toHaveProperty('filter', []);
          expect(target).toHaveProperty('src', expectedSrc);
          expect(target).toHaveProperty('dest', expectedDest);
          expect(target).toHaveProperty('flat');
          expect(target).toHaveProperty('prefix', '');
        }
      });
    
      it('should resolve input with overrides', async () => {
        const overrides = {
          input: {
            [key]: [
              { dir: './directory1', output: { dir: './sub1', flat: true, prefix: 'prefix1_' } },
              { dir: './directory2', output: { dir: './sub2', flat: false, prefix: 'prefix2_' } },
            ]
          },
          rules: { flatCompilation: false }
        };
    
        const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);
    
        for (const [i, input] of overrides.input[key].entries()) {
          const expectedSrc = resolveProjectPath(isObject(input) ? input.dir : input);

          const expectedDest = resolveProjectPath(
            projectConfig.defaults.output!.base as string,
            projectConfig.defaults.output![key] as string,
            input.output.dir
          );

          const target = projectConfig.targets[key][i];
          expect(target).toHaveProperty('src', expectedSrc);
          expect(target).toHaveProperty('dest', expectedDest);
          expect(target).toHaveProperty('filter', []);
          expect(target).toHaveProperty('prefix', input.output.prefix);
        }
      });
    });

    it('should resolve default flat value', async () => {
      const projectConfig = ProjectConfig.resolve(config.defaultProjectType, {}, projectDir);

      expect(projectConfig.targets[key]).toHaveLength(1);
      expect(projectConfig.targets[key][0]).toHaveProperty('flat', resolveDefaultFlatValue(key));
    });

    it('should resolve input with output options but without dir', async () => {
      const overrides = {
        input: {
          [key]: { dir: 'directory1', output: { flat: true, prefix: 'input-prefix' } },
        },
      };
  
      const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);
  
      expect(projectConfig.targets[key]).toHaveLength(1);
      expect(projectConfig.targets[key][0]).toHaveProperty('dest', resolveProjectPath(
        projectConfig.defaults.output!.base as string,
        projectConfig.defaults.output![key] as string
      ));
    });

    for (const flatValue of [true, false]) {
      it(`should resolve ${flatValue} flat value set to input`, async () => {
        const overrides = {
          input: { [key]: { dir: 'directory1', output: { flat: flatValue } } }
        };
  
        const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);
  
        expect(projectConfig.targets[key]).toHaveLength(1);
        expect(projectConfig.targets[key][0]).toHaveProperty('flat', flatValue);
      });

      it(`should resolve ${flatValue} flat value set to output`, async () => {
        const overrides = {
          output: { [key]: { dir: 'directory1', flat: flatValue } }
        };
  
        const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);
  
        expect(projectConfig.targets[key]).toHaveLength(1);
        expect(projectConfig.targets[key][0]).toHaveProperty('flat', flatValue);
      });

      it(`should resolve ${flatValue} flat value set to both input and output`, async () => {
        const overrides = {
          input: { [key]: { dir: 'directory1', output: { flat: flatValue } } },
          output: { [key]: { dir: 'directory1', flat: flatValue } }
        };
  
        const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);

        expect(projectConfig.targets[key]).toHaveLength(1);
        expect(projectConfig.targets[key][0]).toHaveProperty('flat', flatValue);
      });

      it(`should resolve ${flatValue} flat value set to input and ${!flatValue} flat value set to output`, async () => {
        const overrides = {
          input: { [key]: { dir: 'directory1', output: { flat: flatValue } } },
          output: { [key]: { dir: 'directory1', flat: !flatValue } }
        };
  
        const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);

        expect(projectConfig.targets[key]).toHaveLength(1);
        expect(projectConfig.targets[key][0]).toHaveProperty('flat', true);
      });
    }
  }
  
  it('should resolve undefined paths as defaults', async () => {
    const defaultConfig = ProjectConfig.resolve(config.defaultProjectType, {}, projectDir);

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
      output: { scripts: null, plugins: null, include: null, assets: null }
    }, projectDir);

    expect(projectConfig.targets.scripts).toHaveLength(0);
    expect(projectConfig.targets.plugins).toHaveLength(0);
    expect(projectConfig.targets.include).toHaveLength(0);
    expect(projectConfig.targets.assets).toHaveLength(0);
  });

  it('should resolve empty paths as project root', async () => {
    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, {
      input: { scripts: '', include: '', assets: '' },
      output: { base: '', scripts: '', plugins: '', include: '', assets: '' },
      compiler: { dir: '' },
      thirdparty: { dir: '' },
      include: [''],
      rules: { flatCompilation: false }
    }, projectDir);

    expect(projectConfig.targets.scripts).toHaveLength(1);
    expect(projectConfig.targets.scripts[0]).toHaveProperty('src', projectDir);
    expect(projectConfig.targets.scripts[0]).toHaveProperty('dest', projectDir);
    
    expect(projectConfig.targets.include).toHaveLength(1);
    expect(projectConfig.targets.include[0]).toHaveProperty('src', projectDir);
    expect(projectConfig.targets.include[0]).toHaveProperty('dest', projectDir);

    expect(projectConfig.targets.assets).toHaveLength(1);
    expect(projectConfig.targets.assets[0]).toHaveProperty('src', projectDir);
    expect(projectConfig.targets.assets[0]).toHaveProperty('dest', projectDir);
    
    expect(projectConfig.targets.plugins).toHaveLength(1);
    expect(projectConfig.targets.plugins[0]).toHaveProperty('src', projectDir);
    expect(projectConfig.targets.plugins[0]).toHaveProperty('dest', projectDir);

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

    expect(projectConfig.targets.scripts).toHaveLength(overrides.input.scripts.length);

    for (const [i, input] of overrides.input.scripts.entries()) {
      expect(projectConfig.targets.scripts[i]).toHaveProperty('src', isObject(input) ? input.dir : input);
      expect(projectConfig.targets.scripts[i]).toHaveProperty('dest', overrides.output.scripts);
      expect(projectConfig.targets.plugins[i]).toHaveProperty('src', isObject(input) ? input.dir : input);
      expect(projectConfig.targets.plugins[i]).toHaveProperty('dest', overrides.output.plugins);
    }

    expect(projectConfig.targets.assets).toHaveLength(1);
    expect(projectConfig.targets.assets[0]).toHaveProperty('src', overrides.input.assets);
    expect(projectConfig.targets.assets[0]).toHaveProperty('dest', overrides.output.assets);

    expect(projectConfig.targets.include).toHaveLength(1);
    expect(projectConfig.targets.include[0]).toHaveProperty('src', overrides.input.include);
    expect(projectConfig.targets.include[0]).toHaveProperty('dest', overrides.output.include);

    expect(projectConfig.compiler.dir).toBe(overrides.compiler.dir);
    expect(projectConfig.thirdparty.dir).toBe(overrides.thirdparty.dir);
    expect(projectConfig.include).toEqual(overrides.include);
  });

  it('should resolve relative paths', async () => {
    const overrides = {
      input: {
        scripts: ['scripts', { dir: 'scripts2' }],
        include: 'include',
        assets: 'assets',
      },
      output: { base: '', scripts: './out/scripts', plugins: './out/plugins', include: './out/include', assets: './out/assets' },
      compiler: { dir: 'compiler' },
      thirdparty: { dir: 'thirdparty' },
      include: ['extra-include'],
      rules: { flatCompilation: false }
    };

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);

    expect(projectConfig.targets.scripts).toHaveLength(overrides.input.scripts.length);

    for (const [i, input] of overrides.input.scripts.entries()) {
      expect(projectConfig.targets.scripts[i]).toHaveProperty('src', resolveProjectPath(isObject(input) ? input.dir : input));
      expect(projectConfig.targets.scripts[i]).toHaveProperty('dest', resolveProjectPath(overrides.output.scripts));
      expect(projectConfig.targets.plugins[i]).toHaveProperty('src', resolveProjectPath(isObject(input) ? input.dir : input));
      expect(projectConfig.targets.plugins[i]).toHaveProperty('dest', resolveProjectPath(overrides.output.plugins));
    }

    expect(projectConfig.targets.assets).toHaveLength(1);
    expect(projectConfig.targets.assets[0]).toHaveProperty('src', resolveProjectPath(overrides.input.assets));
    expect(projectConfig.targets.assets[0]).toHaveProperty('dest', resolveProjectPath(overrides.output.assets));

    expect(projectConfig.targets.include).toHaveLength(1);
    expect(projectConfig.targets.include[0]).toHaveProperty('src', resolveProjectPath(overrides.input.include));
    expect(projectConfig.targets.include[0]).toHaveProperty('dest', resolveProjectPath(overrides.output.include));

    expect(projectConfig.compiler.dir).toBe(resolveProjectPath(overrides.compiler.dir));
    expect(projectConfig.thirdparty.dir).toBe(resolveProjectPath(overrides.thirdparty.dir));
    expect(projectConfig.include).toEqual(map(overrides.include, v => resolveProjectPath(v)));
  });

  it('should resolve out paths using base dir', async () => {
    const overrides = {
      output: { base: './directory0', scripts: './directory1', plugins: './directory2', include: './directory3', assets: './directory4' }
    };

    const resolveOutPath = (p: string) => resolveProjectPath(overrides.output.base, p);

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);

    expect(projectConfig.targets.scripts).toHaveLength(1);
    expect(projectConfig.targets.scripts[0]).toHaveProperty('dest', resolveOutPath(overrides.output.scripts));

    expect(projectConfig.targets.plugins).toHaveLength(1);
    expect(projectConfig.targets.plugins[0]).toHaveProperty('dest', resolveOutPath(overrides.output.plugins));

    expect(projectConfig.targets.include).toHaveLength(1);
    expect(projectConfig.targets.include[0]).toHaveProperty('dest', resolveOutPath(overrides.output.include));

    expect(projectConfig.targets.assets).toHaveLength(1);
    expect(projectConfig.targets.assets[0]).toHaveProperty('dest', resolveOutPath(overrides.output.assets));
  });

  it('should resolve out paths with null values using base dir', async () => {
    const outputBaseDir = './out';

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, {
      output: { base: outputBaseDir, scripts: null, plugins: null, include: null, assets: null }
    }, projectDir);

    expect(projectConfig.targets.scripts).toHaveLength(0);
    expect(projectConfig.targets.plugins).toHaveLength(0);
    expect(projectConfig.targets.include).toHaveLength(0);
    expect(projectConfig.targets.assets).toHaveLength(0);
  });

  it('should resolve empty output paths as output base dir', async () => {
    const outputBaseDir = './out';
    const outputAbsBaseDir = path.resolve(projectDir, outputBaseDir);

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, {
      output: { base: outputBaseDir, scripts: '', plugins: '', include: '', assets: '' }
    }, projectDir);


    expect(projectConfig.targets.assets).toHaveLength(1);
    expect(projectConfig.targets.assets[0]).toHaveProperty('dest', outputAbsBaseDir);
    expect(projectConfig.targets.include).toHaveLength(1);
    expect(projectConfig.targets.include[0]).toHaveProperty('dest', outputAbsBaseDir);
    expect(projectConfig.targets.scripts).toHaveLength(1);
    expect(projectConfig.targets.scripts[0]).toHaveProperty('dest', outputAbsBaseDir);
    expect(projectConfig.targets.plugins).toHaveLength(1);
    expect(projectConfig.targets.plugins[0]).toHaveProperty('dest', outputAbsBaseDir);
  });

  it('should correctly set output options for input', async () => {
    const overrides = {
      input: {
        scripts: { dir: 'scripts', output: { dir: './input-dest', flat: true, prefix: 'input-prefix' } },
      },
      output: {
        base: './output-base',
        scripts: { dir: './output-dest', flat: false, prefix: 'output-prefix' }
      }
    };

    const projectConfig = ProjectConfig.resolve(config.defaultProjectType, overrides, projectDir);

    expect(projectConfig.targets.scripts).toHaveLength(1);
    expect(projectConfig.targets.scripts[0]).toHaveProperty('dest', resolveProjectPath(overrides.output.base, overrides.output.scripts.dir, overrides.input.scripts.output.dir));
    expect(projectConfig.targets.scripts[0]).toHaveProperty('flat', overrides.input.scripts.output.flat);
    expect(projectConfig.targets.scripts[0]).toHaveProperty('prefix', [overrides.output.scripts.prefix, overrides.input.scripts.output.prefix].join(''));
  });
});
