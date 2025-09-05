import { CommanderError } from 'commander';

import { config } from '@common';
import logger from '@logger';

function resolveCommanderError(err: CommanderError): boolean {
  switch (err.code) {
    case 'commander.help': {
      logger.info(`Use '${config.command} --help' to see all available commands`);
      return true;
    }
    case 'commander.version': {
      logger.info(`${config.title} CLI v${err.message}`);
      return true;
    }
  }

  return false;
}

export default function handleError(err: unknown, interactiveMode: boolean = false) {
  if (err instanceof CommanderError) {
    if (resolveCommanderError(err)) {
      if (!interactiveMode) {
        process.exit(0);
      }

      return;
    }

    logger.error(err.message);
  } else if (err instanceof Error) {
    logger.error(err.message);
  } else {
    logger.error('Unknown error');
  }

  if (!interactiveMode && process.env.NODE_ENV === 'development') {
    throw err;
  }

  if (!interactiveMode) {
    process.exit(1);
  }
}
