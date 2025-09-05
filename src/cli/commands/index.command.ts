import { Command } from 'commander';

import { config, CLICommand } from '@common';

import commandAction from '../helpers/command-action';
import dependencyCommand from './dependency.command';
import projectCommand from './project.command';
import cacheCommand from './cache.command';
import ProjectCreatorController from '../controllers/project-creator.controller';
import ProjectController from '../controllers/project.controller';

const command = new Command();

command
  .command(CLICommand.Config)
  .option('--type, -t <type>', 'Project type', config.project.defaultType)
  .action(
    commandAction(async options => {
      const { type } = options;
      const projectDir = process.cwd();

      const projectCreator = new ProjectCreatorController({ type });
      projectCreator.projectDir = projectDir;
      await projectCreator.createConfig();
    })
  );

command
  .command(CLICommand.Install)
  .alias('i')
  .option('--config, -c <path>', 'Config file', config.project.configFile)
  .option('--compiler', 'Install compiler')
  .option('--thirdparty', 'Install thirdparty dependencies')
  .action(
    commandAction(async (_argument: string, options) => {
      const { config: configPath, compiler, thirdparty } = options.opts();

      const fullInstall = !compiler && !thirdparty;

      const projectController = new ProjectController(configPath);

      await projectController.install({
        compiler: fullInstall || !!compiler,
        thirdparty: fullInstall || !!thirdparty
      });
    })
  );

projectCommand.commands.forEach(c => command.addCommand(c));

command.addCommand(
  cacheCommand
    .name('cache')
);

command.addCommand(
  dependencyCommand
    .name('dependency')
    .alias('dep')
    .alias('d')
    .alias('thirdparty')
    .alias('t')
);

export default command;
