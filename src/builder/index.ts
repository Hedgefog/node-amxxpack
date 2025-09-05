import { IResolvedProjectConfig } from '@common';

import BuilderService from './services/builder.service';
import { IBuildOptions } from './types';

function createBuilder(projectConfig: IResolvedProjectConfig, options: IBuildOptions): BuilderService {
  const builder = new BuilderService(projectConfig, options);

  return builder;
}

export { createBuilder };

export * from './constants';
export * from './types';
export type { default as BuilderService } from './services/builder.service';
