#!/usr/bin/env node

import { Command } from 'commander';

import controller from './controller';

const program = new Command();

program
  .name('AMXXPack CLI')
  .description('Simple AmxModX CLI');

program
  .command('init')
  .action(async () => {
    const projectDir = process.cwd();
    await controller.init(projectDir);
  });

program
  .command('compile')
  .argument('<path>', 'Script path or glob')
  .option('--config, -c', 'Config file', '.amxxpack.json')
  .action(async (str: string, options: any) => {
    await controller.compile(str, options.C);
  });

program
  .command('build')
  .option('--watch, -w', 'Watch project')
  .option('--config, -c', 'Config file', '.amxxpack.json')
  .action(async (str: string, options: any) => {
    const opts = options.opts();
    await controller.build(opts.C, opts.W);
  });

export default program;
