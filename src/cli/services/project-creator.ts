import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import mkdirp from 'mkdirp';
import { get } from 'lodash';

import ProjectConfig from '../../project-config';
import { IProjectOptions } from '../types';
import { IProjectConfig } from '../../types';
import config from '../../config';
import logger from '../../logger/logger';

class ProjectCreator {
  public projectDir: string = null;
  public projectConfig: IProjectConfig = null;
  public options: IProjectOptions = null;
  public isCurrentDir: boolean = false;

  constructor(
    options: IProjectOptions = null
  ) {
    if (options) {
      if (!options.name) {
        throw new Error('Project name cannot be empty!');
      }

      this.isCurrentDir = options.name === '.';

      const cwd = options.cwd || process.cwd();

      this.options = {
        ...options,
        name: this.isCurrentDir ? path.basename(cwd) : options.name,
        cwd: options.cwd || cwd
      };

      this.projectDir = this.isCurrentDir
        ? cwd
        : path.join(cwd, this.options.name);
    }

    this.projectConfig = ProjectConfig.defaults;
  }

  public async createProject(): Promise<void> {
    if (!this.isCurrentDir && fs.existsSync(this.projectDir)) {
      logger.error('Project', this.options.name, 'is already exists!');
      return;
    }

    if (this.isCurrentDir && this.isInitialized()) {
      logger.error('Cannot create a project! The directory is not empty!');
      return;
    }

    await this.createConfig();
    await this.createDirectories();

    if (!this.options.nonpm) {
      await this.createPackage();
    }

    if (this.options.git && !this.isGitInitialized()) {
      await this.initGit();
    }

    if (this.isNpmPackageInitialized()) {
      await this.installDependencies();
    }

    if (this.isGitInitialized()) {
      await this.updateGitignore();
    }

    logger.success('Your project is ready! Thanks for using AMXXPack CLI! 🤗');
  }

  public async createPackage() {
    logger.info('📦 Initializing npm package...');
    const packagePath = path.join(this.projectDir, 'package.json');

    const packageData = {
      name: this.options.name,
      version: get(this.options, 'version', '0.1.0'),
      author: get(this.options, 'author', 'AMXXPack'),
      description: get(this.options, 'description', 'This project was generated by AMXXPack CLI'),
      scripts: {
        build: 'amxxpack build',
        watch: 'amxxpack build --watch',
        postinstall: 'amxxpack install'
      }
    };

    await fs.promises.writeFile(packagePath, JSON.stringify(packageData, null, 2));
  }

  public async createConfig() {
    logger.info('🔧 Creating project configuration file...');
    await mkdirp(this.projectDir);
    const configPath = path.join(this.projectDir, config.projectConfig);
    await fs.promises.writeFile(configPath, JSON.stringify(this.projectConfig, null, 2));
  }

  public async createDirectories() {
    logger.info('📁 Creating project directories...');
    await mkdirp(path.join(this.projectDir, this.projectConfig.input.assets));
    await mkdirp(path.join(this.projectDir, this.projectConfig.input.include));
    await mkdirp(path.join(this.projectDir, this.projectConfig.input.scripts));
  }

  public async installDependencies() {
    logger.info('🔄 Installing dependencies...');
    await this.execCommand('npm install amxxpack --save-dev');
    await this.execCommand('npm run postinstall');
  }

  public async initGit() {
    logger.info('🌿 Initializing git...');
    await this.execCommand('git init');
  }

  public async updateGitignore(): Promise<void> {
    logger.info('❔ Updating .gitignore file...');
    const filePath = path.join(this.projectDir, '.gitignore');

    const lines = ['*.amxx'];

    const addDir = (dir: string) => !path.isAbsolute(dir) && lines.push(
      `${path.relative(this.projectDir, dir)}/`
    );

    addDir('node_modules');
    addDir(this.projectConfig.compiler.dir);
    addDir(this.projectConfig.thirdparty.dir);
    addDir(this.projectConfig.output.assets);

    if (fs.existsSync(filePath)) {
      lines.unshift('');
    }

    lines.push('');

    await fs.promises.appendFile(filePath, lines.join('\n'));
  }

  public isInitialized(): boolean {
    return fs.existsSync(path.join(this.projectDir, config.projectConfig));
  }

  public isGitInitialized(): boolean {
    return fs.existsSync(path.join(this.projectDir, '.git'));
  }

  public isNpmPackageInitialized(): boolean {
    return fs.existsSync(path.join(this.projectDir, 'package.json'));
  }

  public execCommand(command: string) {
    const process = exec(command, {
      cwd: this.projectDir
    });

    return new Promise((resolve) => {
      process.on('error', resolve);
      process.on('close', resolve);
    });
  }
}

export default ProjectCreator;