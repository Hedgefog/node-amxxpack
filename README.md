# 📦 AMXXPack 🇺🇦

[![npm version](https://img.shields.io/npm/v/amxxpack/beta.svg)](https://www.npmjs.com/package/amxxpack/v/beta)
[![License](https://img.shields.io/github/license/Hedgefog/node-amxxpack)](https://github.com/Hedgefog/node-amxxpack/blob/master/LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/amxxpack)](https://www.npmjs.com/package/amxxpack/v/beta)
[![GitHub issues](https://img.shields.io/github/issues/Hedgefog/node-amxxpack)](https://github.com/Hedgefog/node-amxxpack/issues)
[![Dependencies Status](https://img.shields.io/librariesio/release/npm/amxxpack)](https://libraries.io/npm/amxxpack)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Hedgefog/node-amxxpack/pulls)

Build system and **CLI** for **AMX Mod X** and **SourceMod** projects.

---

## Quick Links
- [About](#-about)
- [Features](#-features)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Quick start](#-quick-start)
- [Examples](#-examples)
  - [Basic Project Structure](#basic-project-structure)
  - [Configuration Examples](#configuration-examples)
  - [Development Workflow](#development-workflow-examples)
  - [Integration Examples](#integration-examples)
- [Commands](#-commands)
- [Advanced configuration](#-advanced-configuration)
- [Using with SourceMod](#using-with-sourcemod)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📄 About

This system will be useful for projects with multiple plugins and assets. Using the command-line interface you can build an entire project with a single command. It also supports hot rebuild to keep your plugins and assets up to date during the work.

Check out projects [built with **AMXXPack**](https://github.com/search?q=path%3A.amxxpack*.json&type=code)

---

## 📚 Features

### 🛠 Build System
- ⚙ Flexible JSON-based configuration
- 🗃️ Multi-plugin project support
- 🔄 Incremental builds with caching
- 🎯 Selective plugin compilation
- 📁 Support for multiple input directories
- 🔧 Customizable output structure
- 🔥 Hot reload for rapid development

### 🧩 Plugin Development
- 🔗 Third-party dependencies management
- 📥 Automatic compiler downloads
- 📚 Generating new files using CLI commands
- ⛓️ Support for both **AMX Mod X** and **SourceMod**

### 🧸 Asset Management
- 🔍 Glob pattern filtering

---

## 🔄 Requirements
- Node.js 14.0.0 or higher

---

## 🔧 Installation
**AMXXPack** is available through the npm registry.
Installation can be done using the `npm i amxxpack@beta` command:
```
npm install amxxpack@beta
```

or install it globally to use as a system command
```
npm install -g amxxpack@beta
```

---

## ▶ Quick start
- Open a terminal inside the project directory (existing or create a new one)
- Execute `npm install amxxpack@beta -g` command to install `amxxpack` globally
- Execute `amxxpack create .` command to create a new config
- Execute `amxxpack install` to download project dependencies (compiler, thirdparty etc.)
- Use `amxxpack build` command to build the project
- Use `amxxpack watch` command to build the project and watch changes

---

## 📋 Commands
- `amxxpack create <name>` - create new project
  - `--git` - initialize git
  - `--no-npm` - don't initialize the npm package 
  - `--no-install` - don't install compiler
  - `--version` - project version
  - `--author` - project author
  - `--description` - project name
  - `--type` - project type (e.g. `amxmodx`, `amxmodx-legacy`, `sourcemod`)
- `amxxpack config` - initialize project config in the current workspace
  - `--type` - project type (e.g. `amxmodx`, `amxmodx-legacy`, `sourcemod`)
- `amxxpack install` - install project dependencies
  - `--compiler` - install compiler
  - `--thirdparty` - install third-party dependencies
  - `--config` - config file
- `amxxpack build` - command to build the project
  - `--watch` - flag to watch changes
  - `--config` - config file
  - `--ignore` - ignore build errors
  - `--no-cache` - disable caching
  - `--assets` - build assets
  - `--includes` - build includes
  - `--scripts` - build scripts
  - `--plugins` - build plugins
- `amxxpack compile <path|glob>` - compile specific plugin in the project
  - `--config` - config file
  - `--no-cache` - disable caching
- `amxxpack generate <type>` - create a new file in the project workspace
  - `script` - create a new script file
    - `--title` - plugin title
    - `--version` - plugin version
    - `--author` - plugin author
    - `--include` - include list separated by a comma
    - `--overwrite` - overwrite the file if it already exists
    - `--config` - config file
  - `include` - create a new include file
    - `--include` - include list separated by a comma
    - `--overwrite` - overwrite the file if it already exists
    - `--config` - config file
  - `library` - create a new library file
    - `--name` - library name
    - `--title` - library title
    - `--version` - library version
    - `--author` - library author
    - `--include` - include list separated by a comma
    - `--overwrite` - overwrite the file if it already exists
    - `--config` - config file
- `amxxpack dependency <command>` - third-party dependencies
  - `list` - list all third-party dependencies
  - `add <name> <url>` - add a new third-party dependency
    - `--strip <value>` - number of directories to strip from the archive structure
    - `--filter <value>` - glob patterns separated by a comma
  - `remove <name>` - remove a third-party dependency
- `amxxpack cache` - clean amxxpack cache
  - `clean` - clean amxxpack cache
  - `size` - show amxxpack cache size
- `amxxpack i` - alias to `install` command
- `amxxpack g` - alias to `generate` command
- `amxxpack b` - alias to `build` command
- `amxxpack c` - alias to `compile` command
- `amxxpack d` - alias to `dependency` command
- `amxxpack dep` - alias to `dependency` command
- `amxxpack thirdparty` - alias to `dependency` command
- `amxxpack t` - alias to `dependency` command

---

## 📋 Examples

### Basic Project Structure

Here's a typical **AMXXPack** project structure:

```
myproject/
├── .thirdparty/         # Third-party dependencies
│
├── assets/              # Game assets
│   ├── models/
│   └── sounds/
│
├── src/
│   ├── scripts/         # Plugin source files
│   │   ├── plugin1.sma
│   │   └── plugin2.sma
│   └── include/         # Include files
│       ├── constants.inc
│       └── stocks.inc
│
├── .amxxpack.json        # Project configuration
└── package.json          # NPM configuration
```

### Configuration Examples

#### Basic Configuration
```json
{
  "type": "amxmodx",
  "compiler": {
    "version": "1.9",
    "addons": ["cstrike"]
  },
  "input": {
    "scripts": "./src/scripts",
    "include": "./src/include",
    "assets": "./assets"
  },
  "output": {
    "base": "./dist",
    "plugins": "./addons/amxmodx/plugins",
    "scripts": "./addons/amxmodx/scripting",
    "include": "./addons/amxmodx/scripting/include",
    "assets": "."
  }
}
```

#### Advanced Configuration with Third-party Dependencies
```json
{
  "type": "amxmodx",
  "compiler": {
    "version": "1.9",
    "addons": ["cstrike"]
  },
  "thirdparty": {
    "dependencies": [
      { "name": "somemodule", "url": "https://website/somemodule-v100.zip" }
    ]
  },
  "include": [
    "./.compiler/include",
    "./.thirdparty/somemodule/include"
  ],
  "input": {
    "scripts": [
      { "dir": "./src/scripts", "output": { "prefix": "mymod_" } },
      { "dir": "./somemodule/scripts" }
    ],
    "include": ["./src/include"],
    "assets": [
      { "dir": "./assets" },
      { "dir": "./somemodule/models", "output": { "dest": "./models" } }
    ]
  },
  "output": {
    "base": "./dist",
    "plugins": "./addons/amxmodx/plugins",
    "scripts": "./addons/amxmodx/scripting",
    "include": "./addons/amxmodx/scripting/include",
    "assets": "."
  }
}
```

### Development Workflow Examples

1. **Starting a New Project**
```bash
# Create a new directory
mkdir myproject
cd myproject

# Initialize the project
amxxpack create . --git --type amxmodx

# Install dependencies
amxxpack install

# Generate a new plugin
amxxpack generate script mymod_core --author "Your Name" --version "1.0.0"

# Start development with hot reload
amxxpack build --watch
```

2. **Working with Multiple Plugins**
```bash
# Compile specific plugins
amxxpack compile "mymod_core.sma"
amxxpack compile "mymod_*.sma"
amxxpack compile "features/*.sma"

# Build entire project
amxxpack build

# Watch for changes
amxxpack build --watch
```

3. **Using with Version Control**
```bash
# Typical .gitignore entries
node_modules/
.compiler/
.thirdparty/
dist/
*.amxx
```

### Integration Examples

1. **CI/CD Pipeline (GitHub Actions)**
```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npm install -g amxxpack@beta
      - run: amxxpack install
      - run: amxxpack build
```

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

### Configuring input and output
You can specify additional output options for the input directories.
Output options can be specified in the input configuration or in the output configuration. Specifying options in the input configuration will override output configuration for specific input.

#### Flat compilation
`flat` option is used to specify if the input directory should be copied using a flat directory structure.
By default only `assets` are compiled without a flat directory structure.

```json
  {
    "input": {
      "scripts": ["./src/scripts", { "dir": "./src/scripts", "output": { "flat": false } }]
    }
  }
```

Same option can be specified for the output directories:

```json
  {
    "output": {
      "scripts": { "dir": "./dist/scripts", "flat": false }
    }
  }
```

#### Prefix
`prefix` option is used to specify a prefix which will be added to the compiled plugin name.

```json
  {
    "input": {
      "scripts": ["./src/scripts", { "dir": "./src/scripts", "output": { "prefix": "test_" } }]
    }
  }
```

For output directories:
```json
  {
    "output": {
      "scripts": { "dir": "./dist/scripts", "prefix": "test_" }
    }
  }
```

#### Destination

`dest` option is used to specify a destination directory for the compiled plugin. So plugin will be placed in the `sub` directory of the final compiled plugins directory.

```json
  {
    "input": {
      "scripts": ["./src/scripts", { "dir": "./src/scripts", "output": { "dest": "sub" } }]
    }
  }
```

For output directories:
```json
  {
    "output": {
      "scripts": { "dir": "./dist/scripts", "dest": "sub" }
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
    "version": "1.12",
  }
}
```

---

## 📝 License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---
