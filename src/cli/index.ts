#!/usr/bin/env node

import handleError from './helpers/handle-error';
import program from './program';

try {
  program.exitOverride(handleError).parse();
} catch (err) {
  handleError(err);
}

export { default as program } from './program';
export { default as controller } from './controller';
