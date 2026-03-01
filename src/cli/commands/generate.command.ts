import { Command } from 'commander';

import { config } from '@common';

import ProjectController from '../controllers/project.controller';
import commandAction from '../helpers/command-action';

const command = new Command();

  command
  .command('script')
  .alias('s')
  .arguments('<filename>')
  .option('--title, -n <title>', 'Plugin title')
  .option('--version, -v <version>', 'Plugin version')
  .option('--author, -a <author>', 'Plugin author')
  .option('--include, -i <include>', 'Add include', v => v.split(/[\s|,]/), [])
  .option('--overwrite', 'Overwrite file if it already exists', false)
  .option('--config, -c <path>', 'Config file', config.project.configFile)
  .action(
    commandAction(async (fileName: string, options) => {
      const { title, version, author, include, overwrite, config: configFile } = options;

      const projectController = new ProjectController(configFile);

      await projectController.createScript(fileName, {
        title,
        version,
        author,
        include,
        overwrite
      });
    })
  );

command.command('include')
  .alias('i')
  .arguments('<filename>')
  .option('--include, -i <include>', 'Add include', v => v.split(/[\s|,]/), [])
  .option('--overwrite', 'Overwrite file if it already exists', false)
  .option('--config, -c <path>', 'Config file', config.project.configFile)
  .action(
    commandAction(async (fileName: string, options) => {
      const { include, overwrite, config: configFile } = options;

      const projectController = new ProjectController(configFile);

      await projectController.createInclude(fileName, { include, overwrite });
    })
  );

command
  .command('library')
  .alias('lib')
  .alias('l')
  .arguments('<filename>')
  .option('--title, -t <title>', 'Library title')
  .option('--version, -v <version>', 'Library version')
  .option('--author, -a <author>', 'Library author')
  .option('--name, -n <name>', 'Library name')
  .option('--include, -i <include>', 'Add include', v => v.split(/[\s|,]/), [])
  .option('--overwrite', 'Overwrite file if it already exists', false)
  .option('--config, -c <path>', 'Config file', config.project.configFile)
  .action(
    commandAction(async (fileName: string, options) => {
      const { name, title, version, author, include, overwrite, config: configFile } = options;

      const projectController = new ProjectController(configFile);

      await projectController.createLibrary(fileName, {
        name,
        title,
        version,
        author,
        include,
        overwrite
      });
    })
  );

export default command;
