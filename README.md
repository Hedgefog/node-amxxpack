# 📦 AMXXPack 🇺🇦 [![npm](https://img.shields.io/npm/v/amxxpack/beta.svg)](https://www.npmjs.com/package/amxxpack/v/beta)
Simple build system and **CLI** for **AMX Mod X** projects.

---

## Quick Links
- [About](#-about)
- [Features](#-features)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Quick start](#-quick-start)
- [Commands](#-commands)
- [Advanced configuration](#-advanced-configuration)
- [Using with SourceMod](#using-with-sourcemod)
- [License](#-license)

---

## 📄 About

This system will be useful for projects with multiple plugins and assets. Using the command-line interface you can build an entire project with a single command. It also supports hot rebuild to keep your plugins and assets up to date during the work.

---

## 📚 Features
- ⚙ Flexible configuration
- 🔥 Hot reload
- 🧸 Assets builder

---

## 🔄Requirements
- Node.js 10.0.0+

---

## 🔧 Installation
**AMXXPack** is available through the npm registry.
Installation can be done using the `npm i amxxpack@1.5.0-beta.2` command:
```
npm install amxxpack@1.5.0-beta.2
```

or install it globally to use as a system command
```
npm install -g amxxpack@1.5.0-beta.2
```

---


## ▶ Quick start
- Open a terminal inside the project directory (existing or create a new one)
- Execute `npm install amxxpack@1.5.0-beta.2 -g` command to install `amxxpack` globally
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
  - `--type` - project type (e.g. `amxmodx`, `amxmodx-legacy`, `sourcemod`)
- `amxxpack config` - initialize project config in the current workspace
  - `--type` - project type (e.g. `amxmodx`, `amxmodx-legacy`, `sourcemod`)
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
- `amxxpack i` - alias to `install` command
- `amxxpack g` - alias to `generate` command
- `amxxpack b` - alias to `build` command
- `amxxpack c` - alias to `compile` command

---

## 🦸 Advanced configuration

### Third-party dependencies

#### Archives
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

the configuration above will download `somemodule-v100.zip` archive and extract it to the `./.thirdparty/somemodule` directory then you can use thirdparty files in your project. For example, add a third-party directory to the include list:
```json
{
    "include": [
      "./.thirdparty/somemodule/include"
    ]
}
```

You can also specify a `strip` and `filter` options for better control over the extracted files.
- `strip` - used to remove specific number of directories from the archive.
- `filter` - used to filter specific files from the archive by glob patterns.

```json
{
  "thirdparty": {
    "dir": "./.thirdparty",
    "dependencies": [
      {
        "name": "somemodule",
        "url": "https://website/somemodule-v100.zip",
        "strip": 1,
        "filter": [
          "something/**/*.inc"
        ]
      }
    ]
  }
}
```

#### Single file
If you need to download a single file you can provide URL to the file and it will be downloaded to the third-party directory without trying to extract it.

```json
{
  "thirdparty": {
    "dir": "./.thirdparty",
    "dependencies": [
      {
        "name": "utils",
        "url": "https://website/util.inc"
      }
    ]
  }
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

### Input options
You can specify additional options for the input directories.

#### Flat compilation
`flat` option is used to specify if the scripts should be compiled in a flat directory structure even if `rules.flatCompilation` is disabled.

```json
  {
    "input": {
      "scripts": ["./src/scripts", { "dir": "./src/scripts", "flat": false }]
    }
  }
```

#### Prefix
`prefix` option is used to specify a prefix which will be added to the compiled plugin name.

```json
  {
    "input": {
      "scripts": ["./src/scripts", { "dir": "./src/scripts", "prefix": "test_" }]
    }
  }
```

#### Destination

`dest` option is used to specify a destination directory for the compiled plugin. So plugin will be placed in the `sub` directory of the final compiled plugins directory.

```json
  {
    "input": {
      "scripts": ["./src/scripts", { "dir": "./src/scripts", "dest": "sub" }]
    }
  }
```

### Disabling output
Use `null` value for outputs to disable copying of specific output.

For example, in this case, include files will not be copied to the output folder:

```json
  {
    "output": {
      "include": null
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

### Using with SourceMod

If you use **SourceMod** with **AMXXPack** you should set `type` to `sourcemod` in the project configuration or just use `amxxpack config --type sourcemod` command to crate new configuration file.

```json
{
  "type": "sourcemod",
  "compiler": {
    "version": "1.12.0",
  }
}
```

---

## 📝 License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---
