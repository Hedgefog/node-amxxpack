import { Command } from 'commander';

import { config } from '@common';

import indexCommand from './commands/index.command';

const program = new Command();

program
  .name(`${config.title} CLI`)
  .description(`${config.title} CLI - Building tools for pawn projects`);

program.version(config.version);

indexCommand.commands.forEach(c => program.addCommand(c));

export default program;
