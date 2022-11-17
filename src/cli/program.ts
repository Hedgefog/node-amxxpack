#!/usr/bin/env node

import { Command } from 'commander';

import config from '../config';
import controller from './controller';

const program = new Command();

program
  .name('AMXXPack CLI')
  .description('Simple AmxModX CLI');

program.version(require('../../package.json').version);

program
  .command('create')
  .argument('<name>', 'Project name')
  .option('--version, -v <version>', 'Project version')
  .option('--author, -a <author>', 'Project author')
  .option('--description, -d <author>', 'Project description')
  .option('--nonpm', 'Don\'t initialize npm package', false)
  .option('--git', 'Initialize git', false)
  .action(async (name: string, options: any) => {
    const { V: version, A: author, D: description, nonpm, git } = options;
    await controller.create({ name, version, author, description, nonpm, git });
  });

program
  .command('config')
  .action(async () => {
    const projectDir = process.cwd();
    await controller.config(projectDir);
  });

program
  .command('compile')
  .alias('c')
  .argument('<path>', 'Script path or glob')
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .option('--no-cache', 'Disable caching')
  .action(async (filePath: string, options: any) => {
    const { C: configPath, cache } = options;
    await controller.compile(filePath, configPath, { noCache: !cache });
  });

program
  .command('build')
  .alias('b')
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .option('--watch, -w', 'Watch project')
  .option('--ignore, -i', 'Ignore build errors')
  .option('--no-cache', 'Disable caching')
  .action(async (_argument: string, options: any) => {
    const { C: configPath, W: watch, I: ignoreErrors, cache } = options.opts();
    await controller.build(configPath, { watch, ignoreErrors, noCache: !cache });
  });

program
  .command('install')
  .alias('i')
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .action(async (_argument: string, options: any) => {
    const { C: configPath } = options.opts();
    await controller.install(configPath);
  });

program
  .command('generate')
  .alias('new')
  .alias('n')
  .alias('g')
  .arguments('<type> <filename>')
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .option('--name, -n <name>', 'Plugin name')
  .option('--version, -v <version>', 'Plugin version')
  .option('--author, -a <author>', 'Plugin author')
  .option('--library, -l <library>', 'Library name')
  .option('--include, -i <include>', 'Add include')
  .option('--overwrite', 'Overwrite file if it already exists', false)
  .action(async (type: string, fileName: string, options: any) => {
    const { C: configPath, N: name, V: version, A: author, L: library, overwrite } = options;

    const include = options.I ? options.I.split(/[\s|,]/) : [];
    if (!include.includes('amxmodx')) {
      include.unshift('amxmodx');
    }

    await controller.add(configPath, type, fileName, {
      name,
      version,
      author,
      library,
      include,
      overwrite
    });
  });

export default program;
