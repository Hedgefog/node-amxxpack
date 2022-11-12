# 📦 AMXXPack 🇺🇦 [![npm](https://img.shields.io/npm/v/amxxpack.svg)](https://www.npmjs.com/package/amxxpack)
Simple build system and **CLI** for **AMX Mod X** projects.

## 📄 About

This system will be useful for projects with multiple plugins and assets. Using the command-line interface you can build entire project with a single command. It also supports hot rebuild to keep your plugins and assets up to date during the work.


## 📚 Features
- ⚙ Flexible configuration
- 🔥 Hot reload
- 🧸 Assets builder

## 🔄Requirements
- Node.js 10.0.0+

## 🔧 Installation
**AMXXPack** is available through the npm registry.
Installation can be done using the `npm install` command:
```
npm install amxxpack
```

or install it globally to use as a system command
```
npm install -g amxxpack
```

## ▶ Quick start
- Open a terminal inside the project directory (existing or create a new one)
- Execute `npm install amxxpack -g` command to install `amxxpack` globally
- Execute `amxxpack create .` command to create new config
- Execute `amxxpack install` to download project dependencies (compiler, thirdparty etc.)
- Use `amxxpack build` command to build the project
- Use `amxxpack watch` command to build the project and watch changes

## 📋 Commands
- `amxxpack create <name>` - create new project
  - `--git` - initialize git
  - `--nonpm` - don't initialize npm pacakge 
  - `--version` - project version
  - `--author` - project author
  - `--description` - project name
- `amxxpack config` - initialize project config in current workspace
- `amxxpack install` - install project dependencies
  - `--config` - config file
- `amxxpack build` - command to build the project
  - `--watch` - flag to watch changes
  - `--config` - config file
  - `--ignore` - ignore build errors
  - `--no-cache` - disable caching
- `amxxpack compile <path|glob>` - compile specific plugin in the project
  - `--config` - config file
  - `--no-cache` - disable caching
- `amxxpack new <script|lib|include> [name]` - create new file in the project workspace
  - `--config` - config file
  - `--name` - plugin name
  - `--version` - plugin version
  - `--author` - plugin author
  - `--lib` - library name
  - `--include` - include list separated by a comma
  - `--overwrite` - overwrite file if it already exists
- `amxpack i` - alias to `install` command
- `amxpack n` - alias to `new` command
- `amxpack b` - alias to `build` command
- `amxpack c` - alias to `compile` command
