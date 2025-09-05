export enum AMXPCMessageType {
  Echo = 'echo',
  Error = 'error',
  Warning = 'warning',
  FatalError = 'fatal error'
}

export const MessageRegExp = {
  filename: /([a-zA-Z0-9.\-_/:\\\s]+)/,
  line: /\(([0-9]+)(?:\s--\s([0-9]+))?\)/,
  type: /((?:fatal\s)?error|warning)/,
  code: /([0-9]+)/,
  text: /(.*)/
};
