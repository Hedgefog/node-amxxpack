#!/usr/bin/env -S node --no-deprecation

import readline  from 'readline';
import { parseArgsStringToArgv } from 'string-argv';

import logger from '@logger';

import handleError from './helpers/handle-error';
import program from './program';
import { RunFlags } from './constants';

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
  const params = [];

  for (const arg of argv) {
    if (arg[0] !== '-') break;
    params.push(arg);
  }

  return params;
}

function resolveFlags(params: string[]) {
  const flags = new Set<string>();

  for (const flag of params) {
    switch (flag) {
      case '-i': case '--interactive': case '--input': case '--shell': {
        flags.add(RunFlags.Interactive);
        break;
      }
    }
  }

  return flags;
}

async function bootstrap() {
  const params = parseParams(process.argv.slice(2));
  const flags = resolveFlags(params);

  if (flags.size > 0) {
    const argv = process.argv.slice(2 + params.length);
    if (flags.has(RunFlags.Interactive)) {
      await startInteractiveMode(argv);
    } else {
      await executeCommand(argv);
    }
  } else {
    await executeCommand(process.argv.slice(2));
  }
}

if (process.env.NODE_ENV !== 'development') {
  process.on('warning', warning => {
    if (warning.name === 'DeprecationWarning') return;
    console.warn(warning);
  });
}

bootstrap();
