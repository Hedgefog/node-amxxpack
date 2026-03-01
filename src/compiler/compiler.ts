import path from 'path';
import childProcess from 'child_process';
import fs from 'fs';

import stringAccumulator from '../utils/string-accumulator';
import { castArray } from 'lodash';
import { IMessage, IParseOutputResult, ICompileParams, ICompileResult } from './types';
import { MessageRegExp, AMXPCMessageType } from './constants';

function buildMessageRegExp() {
  const {
    filename, line, type, code, text
  } = MessageRegExp;

  const pattern = [
    filename,
    line,
    /\s:\s/,
    type,
    /\s/,
    code,
    /:\s/,
    text
  ].map(r => r.toString().slice(1, -1)).join('');

  return new RegExp(pattern);
}

const messageRegExp = buildMessageRegExp();

function parseLine(line: string): IMessage {
  const match = line.match(messageRegExp);
  if (!match) {
    return { type: AMXPCMessageType.Echo, text: line };
  }

  const [, filename, startLine, endLine, type, code, text] = match;

  return {
    filename,
    startLine: +startLine,
    endLine: endLine ? +endLine : -1,
    type: type as AMXPCMessageType,
    code: +code,
    text
  };
}

function isAbortedEcho(line: string) {
  return (
    line.startsWith('Compilation aborted.') ||
    line.startsWith('Could not locate output file')
  );
}

function parseOutput(output: string): IParseOutputResult {
  const result: IParseOutputResult = { messages: [], aborted: false, error: false };

  output.split('\n').forEach(line => {
    const message = parseLine(line);

    const { type } = message;

    if (type === AMXPCMessageType.Error || type === AMXPCMessageType.FatalError) {
      result.error = true;
    } else if (type === AMXPCMessageType.Echo && isAbortedEcho(line)) {
      result.error = true;
      result.aborted = true;
    }

    result.messages.push(message);
  });

  return result;
}

function formatArgs(params: ICompileParams, outPath: string) {
  return [
    params.path,
    `-o${outPath}`,
    ...castArray(params.includeDir).map(dir => `-i${dir}`)
  ];
}

function compile(params: ICompileParams): Promise<ICompileResult> {
  const dest = params.dest;

  const parsedDest = path.parse(dest);
  const fileName = path.parse(dest).base;

  fs.mkdirSync(parsedDest.dir, { recursive: true });

  return new Promise(resolve => {
    const output = stringAccumulator();

    const done = (error: Error) => {
      const outputData = output();
      const parsedOutput = parseOutput(outputData);

      let errorMessage = error && error.message;
      if (!errorMessage && parsedOutput.error) {
        errorMessage = 'Compilation error';
      }

      resolve({
        error: errorMessage,
        plugin: fileName,
        success: !errorMessage,
        output: parsedOutput
      });
    };

    const compilerProcess = childProcess.spawn(
      params.compiler,
      formatArgs(params, dest),
      {
        env: process.env,
        cwd: path.parse(params.compiler).dir
      }
    );

    compilerProcess.on('error', done);
    compilerProcess.on('close', done);
    compilerProcess.stdout.on('data', output);
    compilerProcess.stderr.on('data', (data: string) => console.error(data));
  });
}

export default compile;
