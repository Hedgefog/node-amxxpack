import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import fetch from 'node-fetch';

export interface IDownloadResult {
  url: string;
  path: string;
}

async function download(url: string, filePath: string): Promise<IDownloadResult> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);

  const writeStream = fs.createWriteStream(filePath, { flags: 'w' });
  await promisify(pipeline)(res.body, writeStream);

  return { url, path: filePath };
}

export default download;
