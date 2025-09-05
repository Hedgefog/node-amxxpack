import colors from 'colors/safe';

import { ILoggerOptions } from './types';
import { LogLevel } from './constants';

class Logger {
  private debugMode: boolean;

  constructor(options: ILoggerOptions = {}) {
    this.debugMode = options.debug || process.env.NODE_ENV === 'development';
  }

  debug(...args: unknown[]) {
    this.out(LogLevel.Debug, ...args);
  }

  success(...args: unknown[]) {
    this.out(LogLevel.Success, ...args);
  }

  info(...args: unknown[]) {
    this.out(LogLevel.Info, ...args);
  }

  warn(...args: unknown[]) {
    this.out(LogLevel.Warning, ...args);
  }

  error(...args: unknown[]) {
    this.out(LogLevel.Error, ...args);
  }

  out(level: LogLevel, ...args: unknown[]) {
    if (level === LogLevel.Debug && !this.debugMode) {
      return;
    }

    const message = args
      .map(arg => (
        (arg instanceof Object) ? JSON.stringify(arg) : String(arg)
      ))
      .join(' ');

    const label = this.getLevelLabel(level);
    const coloredMessage = this.colorifyMessageByLevel(level, message);
    const time = (new Date()).toLocaleTimeString();

    console.log(`[${time}]`, label, coloredMessage);
  }

  private colorifyMessageByLevel(level: LogLevel, message: string) {
    switch (level) {
      case LogLevel.Debug: return colors.grey(message);
      case LogLevel.Success: return colors.white(message);
      case LogLevel.Info: return colors.grey(message);
      case LogLevel.Warning: return colors.white(message);
      case LogLevel.Error: return colors.white(message);
    }

    return message;
  }

  private getLevelLabel(level: LogLevel): string {
    switch (level) {
      case LogLevel.Debug: return colors.grey('[DEBUG]');
      case LogLevel.Success: return colors.green('[SUCCESS]');
      case LogLevel.Info: return colors.cyan('[INFO]');
      case LogLevel.Warning: return colors.yellow('[WARNING]');
      case LogLevel.Error: return colors.red('[ERROR]');
    }

    return '';
  }
}

export default new Logger();
