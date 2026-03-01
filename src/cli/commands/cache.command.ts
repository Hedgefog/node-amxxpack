import { Command } from 'commander';

import logger from '@logger';

import commandAction from '../helpers/command-action';
import CacheController from '../controllers/cache.controller';

const command = new Command();

let cacheController: CacheController;

command.hook('preAction', () => {
  cacheController = new CacheController();
});

command
  .command('clean')
  .action(
    commandAction(() => {
      cacheController.clearCache();
      logger.info('🧹 Cache cleaned!');
    })
  );

command.command('size')
  .action(
    commandAction(() => {
      const size = cacheController.getCacheSize();
      logger.info(`💾 Cache size: ${size} bytes`);
    })
  );

export default command;
