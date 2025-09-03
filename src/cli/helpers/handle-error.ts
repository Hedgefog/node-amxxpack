import { CommanderError } from 'commander';
import logger from '../../logger/logger';

function resolveCommanderError(err: CommanderError): boolean {
  switch (err.code) {
    case 'commander.help': {
      logger.info('Use `amxxpack --help` to see all available commands');
      return true;
    }
    case 'commander.version': {
      logger.info(`AMXXPack v${err.message}`);
      return true;
    }
  }

  return false;
}

export default function handleError(err: unknown) {
  if (err instanceof CommanderError) {
    if (resolveCommanderError(err)) {
      process.exit(0);
      return;
    }

    logger.error(err.message);
  } else if (err instanceof Error) {
    logger.error(err.message);
  } else {
    logger.error('Unknown error');
  }

  if  (process.env.NODE_ENV === 'development') {
    throw err;
  }

  process.exit(1);
}
