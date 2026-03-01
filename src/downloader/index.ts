import { IResolvedProjectConfig } from '@common';

import CompilerDownloader from './compiler';
import ThirdpartyDownloader from './thirdparty';

export class Downloader {
  private readonly compilerDownloader: CompilerDownloader;
  private readonly thirdpartyDownloader: ThirdpartyDownloader;

  constructor(projectConfig: IResolvedProjectConfig) {
    this.compilerDownloader = new CompilerDownloader(projectConfig);
    this.thirdpartyDownloader = new ThirdpartyDownloader(projectConfig);
  }

  async downloadCompiler(): Promise<void> {
    await this.compilerDownloader.download();
  }

  async downloadThirdparty(): Promise<void> {
    await this.thirdpartyDownloader.download();
  }
}
