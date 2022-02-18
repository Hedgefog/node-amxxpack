import colors from 'colors/safe';

export interface ILoggerOptions {
  debug?: boolean;
}

export enum LogLevel {
  Debug = 'debug',
  Success = 'success',
  Info = 'info',
  Warning = 'warning',
  Error = 'error'
}

export default class Logger {
  private debugMode: boolean = false;

  constructor(options: ILoggerOptions = {}) {
    this.debugMode = options.debug || false;
  }

  debug(...args: any[]) {
    this.out(LogLevel.Debug, ...args);
  }

  success(...args: any[]) {
    this.out(LogLevel.Success, ...args);
  }

  info(...args: any[]) {
    this.out(LogLevel.Info, ...args);
  }

  warn(...args: any[]) {
    this.out(LogLevel.Warning, ...args);
  }

  error(...args: any[]) {
    this.out(LogLevel.Error, ...args);
  }

  out(level: LogLevel, ...args: any[]) {
    if (level === 'debug' && !this.debugMode) {
      return;
    }

    const message = args
      .map((arg) => (
        (arg instanceof Object) ? JSON.stringify(arg) : arg
      ))
      .join(' ');

    const label = this.getLevelLabel(level);
    const coloredMessage = this.colorifyMessageByLevel(level, message);

    // eslint-disable-next-line no-console
    console.log(label, coloredMessage);
  }

  private colorifyMessageByLevel(level: LogLevel, message: string) {
    switch (level) {
      case 'debug': return colors.grey(message);
      case 'success': return colors.white(message);
      case 'info': return colors.white(message);
      case 'warning': return colors.white(message);
      case 'error': return colors.white(message);
    }

    return message;
  }

  private getLevelLabel(level: LogLevel): string {
    switch (level) {
      case 'debug': return colors.grey('[DEBUG]');
      case 'success': return colors.green('[SUCCESS]');
      case 'info': return colors.cyan('[INFO]');
      case 'warning': return colors.yellow('[WARNING]');
      case 'error': return colors.red('[ERROR]');
    }

    return '';
  }
}
