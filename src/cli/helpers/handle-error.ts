import logger from "../../logger/logger";

export default function handleError(err: unknown) {
  logger.error(err instanceof Error ? err.message : 'Unknown error');

  if  (process.env.NODE_ENV === 'development') {
    throw err;
  }

  process.exit(1);
}
