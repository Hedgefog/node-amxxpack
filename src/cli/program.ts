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
  .command('fetch-compiler')
  .option('--config, -c <path>', 'Config file', '.amxxpack.json')
  .option('--version, -v <version>', 'Version', '1.8.2')
  .option('--addon, -a <addon>', 'Addon', 'base')
  .option('--dev, -d', 'Dev build flag', false)
  .action(async (str: string, options: any) => {
    const { D: dev, A: addon, V: version, C: configPath } = options.opts();
    const addons: string[] = addon.split(' ');

    await controller.fetchCompiler({ configPath, version, dev, addons });
  });

export default program;
