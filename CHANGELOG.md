# 1.3.0
- Added filtering and subdirs for assets
- Downloader can now download newer compiler version without providing dev flag and build identifier
- Updated some log messages

# 1.2.0
- Added caching to skip already compiled plugins
- Added `--ignore` flag for `build` and `compile` commands to ignore errors during the build process
- Added ability to specify multiple directories for `scripts`, `includes`, `assets` using an array
- Added global error handler to avoid displaying stack traces in the console
- Various fixes for builder and watcher

# 1.1.1
- Fixed path to includes in error messages

# 1.1.0
- `scripts` and `assets` inputs are now optional
- Added watch interval

# 1.0.2
- `compile` command now only looks for `*.sma` files
- Dependency installation now runs after git initialization
- `create` command no longer overrides an existing `package.json` file

# 1.0.1
- Fixed `config` command
