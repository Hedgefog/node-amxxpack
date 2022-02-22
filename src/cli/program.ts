#!/usr/bin/env node

import { Command } from 'commander';
import config from '../config';

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
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .action(async (filePath: string, options: any) => {
    const { C: configPath } = options;
    await controller.compile(filePath, configPath);
  });

program
  .command('build')
  .option('--watch, -w', 'Watch project')
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .action(async (_argument: string, options: any) => {
    const { C: configPath, W: watch } = options.opts();
    await controller.build(configPath, watch);
  });

program
  .command('install')
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .action(async (_argument: string, options: any) => {
    const { C: configPath } = options.opts();
    await controller.install(configPath);
  });

program
  .command('new <type> [filename]')
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .option('--name, -n <name>', 'Plugin name')
  .option('--version, -v <version>', 'Plugin version')
  .option('--author, -a <author>', 'Plugin author')
  .option('--library, -l <library>', 'Library name')
  .option('--include, -i <include>', 'Add include')
  .action(async (type: string, fileName: string, options: any) => {
    const { C: configPath, N: name, V: version, A: author, L: library } = options;

    const include = options.I ? options.I.split(' ') : [];
    if (!include.includes('amxmodx')) {
      include.unshift('amxmodx');
    }

    await controller.add(configPath, type, fileName, {
      configPath,
      name,
      version,
      author,
      library,
      include
    });
  });

export default program;
