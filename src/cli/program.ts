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
  .option('--config, -c <path>', 'Config file', '.amxxpack.json')
  .action(async (str: string, options: any) => {
    const { C: configPath } = options;
    await controller.compile(str, configPath);
  });

program
  .command('build')
  .option('--watch, -w', 'Watch project')
  .option('--config, -c <path>', 'Config file', '.amxxpack.json')
  .action(async (str: string, options: any) => {
    const { C: configPath, W: watch } = options.opts();
    await controller.build(configPath, watch);
  });

program
  .command('install')
  .option('--config, -c <path>', 'Config file', '.amxxpack.json')
  .action(async (str: string, options: any) => {
    const { C: configPath } = options.opts();

    await controller.install({ configPath });
  });

export default program;
