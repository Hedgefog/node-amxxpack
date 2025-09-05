import { AMXPCMessageType } from '../constants';

export interface ICompileParams {
  path: string;
  dest: string;
  compiler: string;
  includeDir: string[];
}
export interface IMessage {
  filename?: string;
  startLine?: number;
  endLine?: number;
  code?: number;
  type: AMXPCMessageType;
  text: string;
}
export interface IParseOutputResult {
  messages: IMessage[];
  aborted: boolean;
  error: boolean;
}
export interface ICompileResult {
  output: IParseOutputResult;
  plugin: string;
  error?: string;
  success: boolean;
}
