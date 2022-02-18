#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';

import AmxxBuilder from './builder';

function resolveConfigPath(configPath: string) {
  return path.isAbsolute(configPath) ? configPath : path.join(process.cwd(), configPath);
}

function loadConfig(configPath: string) {
  const resolvedPath = resolveConfigPath(configPath);
  console.log('loadConfig', resolvedPath);

  if (!fs.existsSync(resolvedPath)) {
    console.log('Project is not initialzied! Use "init" command to initialize the project!');
    process.exit(1);
  }

  // eslint-disable-next-line global-require, import/no-dynamic-require
  const config = require(resolvedPath);

  return config;
}

function createBuilder(configPath: string) {
  const config = loadConfig(configPath);
  return new AmxxBuilder(config);
}

const program = new Command();

program
  .name('AMXXPack CLI')
  .description('Simple AmxModX CLI');

program
  .command('init')
  .action(async () => {
    console.log(__dirname, process.cwd());
    await fs.promises.copyFile(
      path.join(__dirname, '../resources/default-config.json'),
      path.join(process.cwd(), '.amxxpack.json')
    );
  });

program
  .command('compile')
  .argument('<path>', 'Script path or glob')
  .option('--config, -c', 'Config file', '.amxxpack.json')
  .action(async (str, options) => {
    const builder = createBuilder(options.C);

    const matches = await builder.findPlugins(str);
    matches.map(async (filePath: string) => {
      const srcPath = path.resolve(filePath);
      await builder.compilePlugin(srcPath);
    });
  });

program
  .command('build')
  .option('--watch, -w', 'Watch project')
  .option('--config, -c', 'Config file', '.amxxpack.json')
  .action(async (str, options) => {
    const opts = options.opts();
    const builder = createBuilder(opts.C);

    await builder.build();

    if (opts.W) {
      await builder.watch();
    }
  });

program.parse();
