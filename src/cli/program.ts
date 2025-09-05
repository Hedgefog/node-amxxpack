import { Command } from 'commander';

import { config } from '@common';

import projectCommand from './commands/project.command';
import cacheCommand from './commands/cache.command';
import dependencyCommand from './commands/dependency.command';

const program = new Command();

program
  .name(`${config.title} CLI`)
  .description(`${config.title} CLI - Building tools for pawn projects`);

program.version(config.version);

projectCommand.commands.forEach(c => program.addCommand(c));

program.addCommand(
  cacheCommand
    .name('cache')
);

program.addCommand(
  dependencyCommand
    .name('dependency')
    .alias('dep')
    .alias('d')
    .alias('thirdparty')
    .alias('t')
);

export default program;
