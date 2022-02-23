import { IProjectConfig } from '../types';

export default {
  input: {
    scripts: './src/scripts',
    include: './src/include',
    assets: './assets',
  },
  output: {
    scripts: './dist/addons/amxmodx/scripting',
    plugins: './dist/addons/amxmodx/plugins',
    include: './dist/addons/amxmodx/scripting/include',
    assets: './dist'
  },
  compiler: {
    dir: './.compiler',
    version: '1.8.2',
    dev: false,
    addons: [],
    executable: 'amxxpc'
  },
  thirdparty: {
    dir: './.thirdparty',
    dependencies: []
  },
  include: [],
  rules: {
    flatCompilation: true
  },
  cli: {
    templates: {
      context: {
        PLUGIN_VERSION: '1.0.0',
        PLUGIN_AUTHOR: 'AMXXPack'
      }
    }
  }
} as IProjectConfig;
