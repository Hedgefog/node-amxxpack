import fs from 'fs';
import path from 'path';
import { defaults, get, map, merge } from 'lodash';

import { IResolvedProjectConfig } from '@common';
import logger from '@logger';

import { IAddTemplateContext } from '../types';

export default class TemplateBuilderController {
  public context: IAddTemplateContext = null;
  public rawIncludes: string = null;

  constructor(
    public projectConfig: IResolvedProjectConfig,
    context: IAddTemplateContext,
    contextDefaults: Partial<IAddTemplateContext>
  ) {
    this.context = defaults(
      merge({}, this.projectConfig.cli.templates.context, context),
      contextDefaults
    );
  }

  async buildTemplate(name: string, contextOverride: IAddTemplateContext) {
    const { templateDir } = this.projectConfig.compiler.config.cli;

    const templatePath = get(
      this.projectConfig.cli.templates.files,
      name,
      path.join(__dirname, `../../../resources/templates/${templateDir}/${name}.txt`)
    );

    const templateString = await fs.promises.readFile(templatePath, 'utf8');

    const data = templateString.replace(
      /\{\{([a-zA-Z0-9_]+)\}\}/gm,
      (substring: string, ...args: string[]) => {
        const [key] = args;

        return get(contextOverride, key, get(this.context, key, substring)) as string;
      }
    );

    return data;
  }

  async createFileFromTemplate(
    filePath: string,
    template: string,
    overwrite: boolean
  ): Promise<void> {
    const { dir } = path.parse(filePath);
    await fs.promises.mkdir(dir, { recursive: true });

    const rawIncludes = (
      await Promise.all(
        map(
          this.context.INCLUDES as string[],
          (includeName: string) => this.buildTemplate(
            'include-directive',
            { FILE: includeName }
          )
        )
      )
    ).join('\n');

    await fs.promises.writeFile(
      filePath,
      await this.buildTemplate(template, { INCLUDES: rawIncludes }),
      { flag: overwrite ? 'w' : 'wx' }
    );

    logger.info('📄 New file created:', filePath);
  }
}
