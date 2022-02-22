import fs from 'fs';
import path from 'path';
import { defaults, get, merge } from 'lodash';
import mkdirp from 'mkdirp';

import { IAddTemplateContext } from './types';
import { IProjectConfig } from '../types';

export async function buildTemplate(
  projectConfig: IProjectConfig,
  name: string,
  context: IAddTemplateContext
) {
  const templatePath = get(
    projectConfig.cli.templates.files,
    name,
    path.join(__dirname, `../../resources/templates/${name}.txt`)
  );

  const templateString = await fs.promises.readFile(templatePath, 'utf8');

  const data = templateString.replace(
    /\{\{([a-zA-Z0-9_]+)\}\}/gm,
    (substring: string, ...args: string[]) => {
      const [key] = args;
      return get(context, key, substring);
    }
  );

  return data;
}

export async function createFileFromTemplate(
  projectConfig: IProjectConfig,
  filePath: string,
  template: string,
  context: IAddTemplateContext
): Promise<void> {
  const { dir } = path.parse(filePath);
  await mkdirp(dir);

  await fs.promises.writeFile(
    filePath,
    await buildTemplate(projectConfig, template, context),
    { flag: projectConfig.cli.rules.overrideFiles ? 'w' : 'wx' }
  );
}

export async function resolveContext(
  projectConfig: IProjectConfig,
  context: IAddTemplateContext,
  contextDefaults: Partial<IAddTemplateContext> = {}
): Promise<IAddTemplateContext> {
  const templateContext = defaults(
    merge({}, projectConfig.cli.templates.context, context),
    contextDefaults
  );

  return templateContext;
}
