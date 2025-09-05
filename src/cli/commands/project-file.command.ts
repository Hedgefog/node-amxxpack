import { Command } from 'commander';

import { CLICommand, config } from '@common';

import ProjectController from '../controllers/project.controller';
import { ProjectFileType } from '../constants';
import commandAction from '../helpers/command-action';

const command = new Command();

command
  .command(CLICommand.Generate)
  .alias('new')
  .alias('n')
  .alias('g')
  .arguments('<type> <filename>')
  .option('--config, -c <path>', 'Config file', config.project.configFile)
  .option('--name, -n <name>', 'Plugin name')
  .option('--version, -v <version>', 'Plugin version')
  .option('--author, -a <author>', 'Plugin author')
  .option('--library, -l <library>', 'Library name')
  .option('--include, -i <include>', 'Add include', v => v.split(/[\s|,]/), [])
  .option('--overwrite', 'Overwrite file if it already exists', false)
  .action(
    commandAction(async (type: ProjectFileType, fileName: string, options) => {
      const { config: configFile, name, version, author, library, include, overwrite } = options;

      const projectService = new ProjectController(configFile);

      await projectService.createFile(type, fileName, {
        name,
        version,
        author,
        library,
        include,
        overwrite
      });
    })
  );

export default command;
