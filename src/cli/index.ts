#!/usr/bin/env node

import program from './program';

program.parse();

export { default as program } from './program';
export { default as controller } from './controller';
