# 📦 AMXXPack 
Simple build system and **CLI** for **AMX Mod X** projects.

# 📄 About

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
- Create new directory for your project
- Open a terminal inside the project directory
- Execute `npm init -y` command to init the package
- Execute `npm install amxxpack --save-dev` command to install `amxxpack` locally
- Execute `npx amxxpack init` command to create new config
- Execute `npx amxxpack fetch-compiler` to download latest compiler release
- Use `npx amxxpack build` command to build the project
- Adding build scripts *(optional)*

  To use `npm run build` and `npm run watch` to build or watch the project update the `scripts` section in `package.json`:
  ```json
    "scripts": {
      "build": "amxxpack build",
      "watch": "amxxpack build --watch"
    }
  ```

## 📋 Commands
- `amxxpack init` - init config for a new project
- `amxxpack build` - command to build the project
  - `--watch` - flag to watch changes
  - `--config` - config file
- `amxxpack compile <path|glob>` - compile specific plugin in the project
  - `--config` - config file
- `amxxpack fetch-compiler` - fetch amxmodx compiler
  - `--config` - config file
  - `--version` - compiler version
  - `--addon` - addon name
  - `--dev` - search for dev build
