import { CommanderError } from "commander";
import logger from "../../logger/logger";

export default function handleError(err: unknown) {
  if (err instanceof CommanderError) {
    switch (err.code) {
      case 'commander.help': {
        logger.info('Use `amxxpack --help` to see all available commands');
        break;
      }
      case 'commander.version': {
        logger.info(`AMXXPack v${err.message}`);
        break;
      }
      default: {
        logger.error(err.message);
        break;
      }
    }
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
