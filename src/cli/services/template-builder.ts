import fs from 'fs';
import path from 'path';
import { defaults, get, map, merge } from 'lodash';
import mkdirp from 'mkdirp';

import { IAddTemplateContext } from '../types';
import { IProjectConfig } from '../../types';

class TemplateBuilder {
  public context: IAddTemplateContext = null;
  public rawIncludes: string = null;

  constructor(
    public projectConfig: IProjectConfig,
    context: IAddTemplateContext,
    contextDefaults: Partial<IAddTemplateContext>
  ) {
    this.context = defaults(
      merge({}, this.projectConfig.cli.templates.context, context),
      contextDefaults
    );
  }

  async buildTemplate(name: string, contextOverride: Partial<IAddTemplateContext>) {
    const templatePath = get(
      this.projectConfig.cli.templates.files,
      name,
      path.join(__dirname, `../../../resources/templates/${name}.txt`)
    );

    const templateString = await fs.promises.readFile(templatePath, 'utf8');

    const data = templateString.replace(
      /\{\{([a-zA-Z0-9_]+)\}\}/gm,
      (substring: string, ...args: string[]) => {
        const [key] = args;

        return get(
          contextOverride,
          key,
          get(this.context, key, substring)
        );
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
          this.context.INCLUDES,
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
  }
}

export default TemplateBuilder;
