#!/usr/bin/env node

import { Command } from 'commander';

import controller from './controller';
import commandAction from './helpers/command-action';
import config from '../config';
import { FileType } from './constants';

const program = new Command();

program
  .name('AMXXPack CLI')
  .description('Simple AmxModX CLI');

program.version(config.version);

program
  .command('create')
  .argument('<name>', 'Project name')
  .option('--type, -t <type>', 'Project type', config.defaultProjectType)
  .option('--version, -v <version>', 'Project version')
  .option('--author, -a <author>', 'Project author')
  .option('--description, -d <author>', 'Project description')
  .option('--nonpm', 'Don\'t initialize npm package', false)
  .option('--git', 'Initialize git', false)
  .action(
    commandAction(async (name: string, options) => {
      const { version, author, description, nonpm, git, type } = options;
      await controller.create({ name, version, author, description, nonpm, git, type });
    })
  );

program
  .command('config')
  .option('--type, -t <type>', 'Project type', config.defaultProjectType)
  .action(
    commandAction(async options => {
      const { type } = options;
      const projectDir = process.cwd();
      await controller.config(projectDir, type);
    })
  );

program
  .command('compile')
  .alias('c')
  .argument('<pattern>', 'Script path or glob')
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .option('--no-cache', 'Disable caching')
  .action(
    commandAction(async (pattern: string, options) => {
      const { config: configPath, cache } = options;
      await controller.compile(pattern, configPath, { noCache: !cache });
    })
  );

program
  .command('build')
  .alias('b')
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .option('--watch, -w', 'Watch project')
  .option('--ignore, -i', 'Ignore build errors')
  .option('--no-cache', 'Disable caching')
  .option('--assets', 'Build assets')
  .option('--scripts', 'Build scripts')
  .option('--plugins', 'Build plugins')
  .option('--includes', 'Build includes')
  .action(
    commandAction(async (_argument: string, options) => {
      const { config: configPath, watch, ignore: ignoreErrors, cache, assets, scripts, plugins, includes } = options.opts();

      const fullBuild = !assets && !scripts && !plugins && !includes;

      await controller.build(configPath, {
        watch,
        ignoreErrors,
        noCache: !cache,
        assets: fullBuild || assets,
        scripts: fullBuild || scripts,
        plugins: fullBuild || plugins,
        includes: fullBuild || includes
      });
    })
  );

program
  .command('install')
  .alias('i')
  .option('--config, -c <path>', 'Config file', config.projectConfig)
  .option('--compiler', 'Install compiler')
  .option('--thirdparty', 'Install thirdparty dependencies')
  .action(
    commandAction(async (_argument: string, options) => {
      const { config: configPath, compiler, thirdparty } = options.opts();
  
      const fullInstall = !compiler && !thirdparty;
  
      await controller.install(
        configPath,
        {
          compiler: fullInstall || !!compiler,
          thirdparty: fullInstall || !!thirdparty
        }
      );
    })
  );

program
  .command('cache clean')
  .action(
    commandAction(async () => {
      await controller.cleanCache();
    })
  );

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
  .action(
    commandAction(async (type: FileType, fileName: string, options) => {
      const { config: configPath, name, version, author, library, overwrite } = options;
  
      const include = options.include ? options.include.split(/[\s|,]/) : [];
  
      await controller.add(configPath, type, fileName, {
        name,
        version,
        author,
        library,
        include,
        overwrite
      });
    })
  );

export default program;
