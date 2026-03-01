import path from 'path';
import fs from 'fs';
import os from 'os';

import TemplateBuilder from '../../src/cli/services/template-builder';
import ProjectConfig from '../../src/project-config';
import { IProjectConfig } from '../../src/types';

const TEST_TMP_DIR = path.join(os.tmpdir(), 'amxxpack-tests');
const TEST_TEMPLATE_PATH = path.join(TEST_TMP_DIR, 'test.txt');

const TEST_VARIABLE_NAME = 'TEST_VARIABLE';

const PROJECT_CONFIG: IProjectConfig = {
  ...ProjectConfig.defaults,
  cli: {
    templates: {
      context: {},
      files: {
        script: TEST_TEMPLATE_PATH
      }
    }
  }
};

const TEMPLATE_CONTEXT = {
  [TEST_VARIABLE_NAME]: 'TEST_VARIABLE_VALUE'
};

describe('Template Builder', () => {
  beforeAll(async () => {
    await fs.promises.writeFile(TEST_TEMPLATE_PATH, `{{${TEST_VARIABLE_NAME}}}`);
  });

  it('should build template with context', async () => {
    const templateBuilder = new TemplateBuilder(PROJECT_CONFIG, TEMPLATE_CONTEXT, {});

    const result = await templateBuilder.buildTemplate('script', {});
    expect(result).toBe(TEMPLATE_CONTEXT[TEST_VARIABLE_NAME]);
  });

  it('should build template with defaults', async () => {
    const contextDefaults = { [TEST_VARIABLE_NAME]: 'foo' };
    const templateBuilder = new TemplateBuilder(PROJECT_CONFIG, {}, contextDefaults);

    const result = await templateBuilder.buildTemplate('script', {});
    expect(result).toBe(contextDefaults[TEST_VARIABLE_NAME]);
  });

  it('should build template with overrides', async () => {
    const contextDefaults = { [TEST_VARIABLE_NAME]: 'foo' };
    const overrideContext = { [TEST_VARIABLE_NAME]: 'bar' };
    const templateBuilder = new TemplateBuilder(PROJECT_CONFIG, TEMPLATE_CONTEXT, contextDefaults);

    const result = await templateBuilder.buildTemplate('script', overrideContext);
    expect(result).toBe(overrideContext[TEST_VARIABLE_NAME]);
  });
});
