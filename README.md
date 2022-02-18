# 📦 AMXXPack 
Simple build system and **CLI** for **AMX Mod X** projects.

This system will be useful for projects with multiple plugins and assets. Using the command-line interface you can build entire project with a single command. It also supports hot rebuild to keep your plugins and assets up to date during the work.

⚠ Attention! This is an alpha version and may be unstable and contains a large number of bugs!

## 📚 Features
- 🧸 Assets builder
- ⚙ Flexible configuration
- 🔥 Hot rebuild

## ▶ Getting Started
- Create new folder for your project
- Execute `amxxpack init` command to create new config
- Customize generated configuration based on the project structure

## 📋 Commands
- `amxxpack init` init config for a new project
- `amxxpack build` command to build the project
  - `--watch` flag to watch changes
  - `--config` config file
- `amxxpack compile <path|glob>` to compile specific plugin in the project
  - `--config` config file
