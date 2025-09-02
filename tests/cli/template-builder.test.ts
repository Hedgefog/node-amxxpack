import path from 'path';
import fs from 'fs';
import os from 'os';

import TemplateBuilder from '../../src/cli/services/template-builder';
import ProjectConfig from '../../src/project-config';
import { IResolvedProjectConfig } from '../../src/types';
import config from '../../src/config';

const TEST_TMP_DIR = path.join(os.tmpdir(), 'amxxpack-tests');
const TEST_TEMPLATE_PATH = path.join(TEST_TMP_DIR, 'test.txt');

const TEST_VARIABLE_NAME = 'TEST_VARIABLE';

const TEMPLATE_CONTEXT = {
  [TEST_VARIABLE_NAME]: 'TEST_VARIABLE_VALUE'
};

describe('Template Builder', () => {
  let projectConfig: IResolvedProjectConfig;

  beforeAll(async () => {
    projectConfig = ProjectConfig.resolve(config.defaultProjectType, {
      cli: {
        templates: {
          context: {},
          files: {
            script: TEST_TEMPLATE_PATH
          }
        }
      }
    });
    await fs.promises.writeFile(TEST_TEMPLATE_PATH, `{{${TEST_VARIABLE_NAME}}}`);
  });

  it('should build template with context', async () => {
    const templateBuilder = new TemplateBuilder(projectConfig, TEMPLATE_CONTEXT, {});

    const result = await templateBuilder.buildTemplate('script', {});
    expect(result).toBe(TEMPLATE_CONTEXT[TEST_VARIABLE_NAME]);
  });

  it('should build template with defaults', async () => {
    const contextDefaults = { [TEST_VARIABLE_NAME]: 'foo' };
    const templateBuilder = new TemplateBuilder(projectConfig, {}, contextDefaults);

    const result = await templateBuilder.buildTemplate('script', {});
    expect(result).toBe(contextDefaults[TEST_VARIABLE_NAME]);
  });

  it('should build template with overrides', async () => {
    const contextDefaults = { [TEST_VARIABLE_NAME]: 'foo' };
    const overrideContext = { [TEST_VARIABLE_NAME]: 'bar' };
    const templateBuilder = new TemplateBuilder(projectConfig, TEMPLATE_CONTEXT, contextDefaults);

    const result = await templateBuilder.buildTemplate('script', overrideContext);
    expect(result).toBe(overrideContext[TEST_VARIABLE_NAME]);
  });
});
