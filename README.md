# 📦 AMXXPack 🇺🇦 [![npm](https://img.shields.io/npm/v/amxxpack.svg)](https://www.npmjs.com/package/amxxpack)
Simple build system and **CLI** for **AMX Mod X** projects.

## 📄 About

This system will be useful for projects with multiple plugins and assets. Using the command-line interface you can build an entire project with a single command. It also supports hot rebuild to keep your plugins and assets up to date during the work.


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
- Execute `amxxpack create .` command to create a new config
- Execute `amxxpack install` to download project dependencies (compiler, thirdparty etc.)
- Use `amxxpack build` command to build the project
- Use `amxxpack watch` command to build the project and watch changes

## 📋 Commands
- `amxxpack create <name>` - create new project
  - `--git` - initialize git
  - `--nonpm` - don't initialize the npm package 
  - `--version` - project version
  - `--author` - project author
  - `--description` - project name
- `amxxpack config` - initialize project config in the current workspace
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
- `amxxpack generate <script|lib|include> [name]` - create a new file in the project workspace
  - `--config` - config file
  - `--name` - plugin name
  - `--version` - plugin version
  - `--author` - plugin author
  - `--lib` - library name
  - `--include` - include list separated by a comma
  - `--overwrite` - overwrite the file if it already exists
- `amxxpack cache clean` - clean amxxpack cache
- `amxpack i` - alias to `install` command
- `amxpack g` - alias to `generate` command
- `amxpack b` - alias to `build` command
- `amxpack c` - alias to `compile` command

## 🦸 Advanced configuration

### Third-party dependencies
In case your project requires third-party modules you can specify a link to third-party archives and these archives will be downloaded and extracted to the third-party directory.
```json
{
  "thirdparty": {
    "dir": "./.thirdparty",
    "dependencies": [
      {
        "name": "somemodule",
        "url": "https://website/somemodule-v100.zip"
      }
    ]
  }
}
```

the configuration above will download `somemodule-v100.zip` archive and extract it to the `./.thirdparty/somemodule` directory then you can use thirparty files in your project. For example, add a third-party directory to the include list:
```json
{
    "include": [
      "./.thirdparty/somemodule/include"
    ]
}
```

### Multiple directories as an input
You can use multiple directories as builder inputs, just specify an array of directories in the project configuration. Example:

```json
  {
    "input": {
      "scripts": ["./src/scripts", "./src/extra-scripts"],
      "include": ["./src/include", "./src/extra-include"],
      "assets": ["./assets", "./extra-assets"]
    }
  }
```

### Assets filtering and subdirectories
Using glob filters you can specify which assets should be copied.

For example, you can exclude all assets except `*.mdl`:
```json
  {
    "input": {
      "assets": [
        { "dir": "./assets", "filter": "*.mdl" }
      ]
    }
  }
```

or exclude `*.tga` and `*.wav` files:
```json
  {
    "input": {
      "assets": [
        { "dir": "./assets", "filter": "*.!(tga|wav)" }
      ]
    }
  }
```

You can also specify subdirectories for copying. With this configuration, the builder will copy all files from `./assets/models` to `./models/myproject` of the project build directory.
```json
  {
    "input": {
      "assets": [
        { "dir": "./assets/models", "dest": "./models/myproject" }
      ]
    }
  }
```

### Compiler configuration
Using the `compiler` configuration you can specify the compiler version you want to use.

For example, if you want to use AmxModX 1.9 with `cstrike` addon in your project, then use this configuration:
```json
{
  "compiler": {
    "version": "1.9",
    "addons": ["cstrike"]
  }
}
```

In case you want to use a dev build from `amxxdrop` you should set `dev` flag to `true` and specify the build you want to use in the `version` field:
```json
{
  "compiler": {
    "version": "1.10.0-git5467",
    "dev": true,
    "addons": ["cstrike"]
  }
}
```
