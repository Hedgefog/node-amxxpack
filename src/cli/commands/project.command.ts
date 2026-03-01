import { Command } from 'commander';

import logger from '@logger';
import { config, CLICommand, CLIError } from '@common';

import commandAction from '../helpers/command-action';
import projectFileCommand from './generate.command';
import ProjectBuilderController from '../controllers/project-builder.controller';
import ProjectCreatorController from '../controllers/project-creator.controller';
import ProjectController from '../controllers/project.controller';

const command =  new Command();

command
  .command(CLICommand.Config)
  .option('--type, -t <type>', 'Project type', config.project.defaultType)
  .action(
    commandAction(async options => {
      const { type } = options;

      const projectCreator = new ProjectCreatorController({ type });
      await projectCreator.createConfig();
    })
  );

command
  .command(CLICommand.Create)
  .argument('<name>', 'Project name')
  .option('--type, -t <type>', 'Project type', config.project.defaultType)
  .option('--version, -v <version>', 'Project version')
  .option('--author, -a <author>', 'Project author')
  .option('--description, -d <author>', 'Project description')
  .option('--no-npm', 'Don\'t initialize npm package', true)
  .option('--no-install', 'Don\'t install dependencies', true)
  .option('--git', 'Initialize git', false)
  .action(
    commandAction(async (name: string, options) => {
      const { version, author, description, npm, install, git, type } = options;

      if (!name) {
        throw new CLIError('Project name cannot be empty!');
      }

      const projectService = new ProjectCreatorController({ name, version, author, description, npm, install, git, type });
      await projectService.createProject();

      logger.success(`Your project is ready! Thanks for using ${config.title} CLI! 🤗`);
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

command
  .command(CLICommand.Compile)
  .alias('c')
  .argument('<pattern>', 'Script path or glob')
  .option('--config, -c <path>', 'Config file', config.project.configFile)
  .option('--no-cache', 'Disable caching')
  .action(
    commandAction(async (pattern: string, options) => {
      const { config: configPath, cache } = options;

      const projectBuilderService = new ProjectBuilderController(configPath, { noCache: !cache });

      await projectBuilderService.compile(pattern);
    })
  );

command
  .command(CLICommand.Build)
  .alias('b')
  .option('--config, -c <path>', 'Config file', config.project.configFile)
  .option('--watch, -w', 'Watch project')
  .option('--ignore, -i', 'Ignore build errors')
  .option('--no-cache', 'Disable caching')
  .option('--assets', 'Build assets')
  .option('--scripts', 'Build scripts')
  .option('--plugins', 'Build plugins')
  .option('--includes', 'Build includes')
  .action(
    commandAction(async (_argument: string, options) => {
      const { config: configPath, watch, ignore: ignoreErrors, cache, assets, scripts, plugins, includes } = options.opts();

      const fullBuild = !assets && !scripts && !plugins && !includes;

      const projectBuilderService = new ProjectBuilderController(configPath, { noCache: !cache });

      logger.info('⚒️ Building...');

      const success = await projectBuilderService.build({
        watch,
        ignoreErrors,
        noCache: !cache,
        assets: fullBuild || assets,
        scripts: fullBuild || scripts,
        plugins: fullBuild || plugins,
        includes: fullBuild || includes
      });

      if (success) {
        logger.success('✅ Build completed successfully!');
      } else {
        logger.error('⚠️ Build completed with errors!');
      }
    })
  );

command.addCommand(
  projectFileCommand
    .name(CLICommand.Generate)
    .alias('new')
    .alias('n')
    .alias('g')
);

export default command;
