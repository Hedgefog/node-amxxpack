import { Command } from 'commander';

import logger from '@logger';

import commandAction from '../helpers/command-action';
import DependencyController from '../controllers/dependency.controller';

const command = new Command();

let dependencyController: DependencyController;

command.hook('preAction', () => {
  dependencyController = new DependencyController();
});

command.command('list')
  .alias('l')
  .action(
    commandAction(async () => {
      const dependencies = await dependencyController.getDependencies();
      if (!dependencies.length) {
        logger.info('🔍 No thirdparty dependencies found!');
        return;
      }

      logger.info('🔍 Thirdparty dependencies:');
      for (const dependency of dependencies) {
        logger.info(`- ${dependency.name} "${dependency.url}"`);
      }
    })
  );

command.command('add')
  .alias('a')
  .argument('<name>', 'Thirdparty name')
  .argument('<url>', 'Thirdparty URL')
  .option('--strip [strip]', 'Strip', v => parseInt(v, 10))
  .option('--filter [filter]', 'Filter', [])
  .action(
    commandAction(async (name: string, url: string, options) => {
      const { strip, filter } = options;

      await dependencyController.addDependency(name, url, strip, filter);

      logger.success(`➕ Dependency "${name}" added successfully!`);
    })
  );

command.command('remove')
  .alias('r')
  .argument('<name>', 'Thirdparty name')
  .action(
    commandAction(async (name: string) => {
      await dependencyController.removeDependency(name);

      logger.success(`🗑️ Dependency "${name}" removed successfully!`);
    })
  );

export default command;
