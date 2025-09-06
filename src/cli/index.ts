#!/usr/bin/env -S node --no-deprecation

import readline  from 'readline';
import { parseArgsStringToArgv } from 'string-argv';

import logger from '@logger';

import handleError from './helpers/handle-error';
import program from './program';

async function executeCommand(argv: string[], interactive: boolean = false) {
  try {
    await program.exitOverride().parseAsync(argv, { from: 'user' });
  } catch (err) {
    handleError(err, interactive);
  }
}

async function startInteractiveMode(argv: string[]) {
  if (argv.length > 0) {
    await executeCommand(argv, true);
  }

  logger.info('🕹️ Interactive mode: Waiting for input...');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.on('line', async line => {
    rl.pause();
    await executeCommand(parseArgsStringToArgv(line), true);
    rl.resume();
  });

  process.on('SIGINT', () => rl.close());
  process.on('uncaughtException', () => rl.close());
  process.on('unhandledRejection', () => rl.close());
}

function parseParams(argv: string[]) {
  const params = new Set<string>();

  for (const arg of argv) {
    if (arg[0] !== '-') break;
    params.add(arg);
  }

  return params;
}

async function bootstrap() {
  const params = parseParams(process.argv.slice(2));
  const argv = process.argv.slice(2 + params.size);

  const interactive = (
    params.has('-i') ||
    params.has('--interactive') ||
    params.has('--input') ||
    params.has('--shell')
  );

  if (interactive) {
    await startInteractiveMode(argv);
  } else {
    await executeCommand(argv);
  }
}

if (process.env.NODE_ENV !== 'development') {
  process.on('warning', warning => {
    if (warning.name === 'DeprecationWarning') return;
    console.warn(warning);
  });
}

bootstrap();
