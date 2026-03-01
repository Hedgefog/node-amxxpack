export interface IDownloadThirdpartyOptions {
  name: string;
  url: string;
  dir: string;
  strip: number;
  filter?: string | string[];
}
