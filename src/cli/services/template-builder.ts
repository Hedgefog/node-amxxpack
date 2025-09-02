import fs from 'fs';
import path from 'path';
import { defaults, get, map, merge } from 'lodash';
import { mkdirp } from 'mkdirp';

import { IAddTemplateContext } from '../types';
import { IResolvedProjectConfig } from '../../types';
import logger from '../../logger/logger';

class TemplateBuilder {
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
    const templatePath = get(
      this.projectConfig.cli.templates.files,
      name,
      path.join(__dirname, `../../../resources/templates/${this.projectConfig.compiler.config.cli.templateDir}/${name}.txt`)
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
    await mkdirp(dir);

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

export default TemplateBuilder;
