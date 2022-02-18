const path = require('path');
const childProcess = require('child_process');

const mkdirp = require('mkdirp');

const PluginExt = 'amxx';

export enum AMXPCMessageType {
  Echo = 'echo',
  Error = 'error',
  Warning = 'warning',
  FatalError = 'fatal error'
}

interface IMessage {
  filename?: string;
  startLine?: number;
  endLine?: number;
  code?: number;
  type: AMXPCMessageType;
  text: string;
}

interface IParseOutputResult {
  messages: IMessage[];
  aborted: boolean;
  error: boolean;
}

interface ICompileResult {
  output: IParseOutputResult,
  plugin: string;
  error?: string;
  success: boolean;
}

const MessageRegExp = {
  filename: /([a-zA-Z0-9.\-_/:\\\s]+)/,
  line: /\(([0-9]+)(?:\s--\s([0-9]+))?\)/,
  type: /((?:fatal\s)?error|warning)/,
  code: /([0-9]+)/,
  text: /(.*)/
};

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
  ].map((r) => r.toString().slice(1, -1)).join('');

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

function parseOutput(output: string): IParseOutputResult {
  const result: IParseOutputResult = { messages: [], aborted: false, error: false };

  output.split('\n').forEach((line: string) => {
    const message = parseLine(line);

    const { type } = message;

    if (type === AMXPCMessageType.Error || type === AMXPCMessageType.FatalError) {
      result.error = true;
    } else if (type === AMXPCMessageType.Echo) {
      if (line.startsWith('Compilation aborted.')
        || line.startsWith('Could not locate output file')) {
        result.error = true;
        result.aborted = true;
      }
    }

    result.messages.push(message);
  });

  return result;
}

function formatArgs(params: any, outPath: string) {
  const includeArgs = params.includeDir instanceof Array
    ? params.includeDir.map((dir: string) => `-i${dir}`)
    : [`-i${params.includeDir}`];

  return [params.path, `-o${outPath}`, ...includeArgs];
}

function compile(params: any): Promise<ICompileResult> {
  const parsedPath = path.parse(params.path);
  const fileName = `${parsedPath.name}.${PluginExt}`;
  const dest = path.join(params.dest, fileName);

  mkdirp.sync(params.dest);

  return new Promise((resolve) => {
    let output = '';

    const compilerProcess = childProcess.spawn(
      params.compiler,
      formatArgs(params, dest),
      {
        env: process.env,
        cwd: path.parse(params.compiler).dir
      }
    );

    compilerProcess.stdout.on('data', (data: string) => {
      output += data.toString();
    });

    compilerProcess.stderr.on('data', (data: string) => console.error(data));

    compilerProcess.on('error', (err: Error) => {
      const parsedOutput = parseOutput(output);

      resolve({
        plugin: fileName,
        error: err.message,
        success: false,
        output: parsedOutput
      });
    });

    compilerProcess.on('close', () => {
      const parsedOutput = parseOutput(output);
      const error = parsedOutput.error ? 'Compilation error' : undefined;

      resolve({
        plugin: fileName,
        error,
        success: !parsedOutput.error,
        output: parsedOutput
      });
    });
  });
}

export default compile;
