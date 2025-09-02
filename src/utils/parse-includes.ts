import fs from 'fs';

export interface IInclude {
  name: string;
  type: IncludeType;
}

export enum IncludeType {
  Relative = 'relative',
  Native = 'native'
}

export async function parseIncludes(filePath: string): Promise<IInclude[]> {
  const srcData = await fs.promises.readFile(filePath, 'utf8');

  const regexp = /^\s*#(?:tryinclude|include)\s+(?:(?:"([^"]+)")|(?:<([^>]+)>))/gm;

  const includes = [];

  let match;
  while ((match = regexp.exec(srcData))) {
    if (match[1]) {
      includes.push({ name: match[1], type: IncludeType.Relative });
    } else if (match[2]) {
      includes.push({ name: match[2], type: IncludeType.Native });
    }
  }

  return includes;
}
