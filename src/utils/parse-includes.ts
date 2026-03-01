import fs from 'fs';

export interface IInclude {
  name: string;
  type: IncludeType;
}

export enum IncludeType {
  Relative = 'relative',
  Native = 'native'
}

export default async function parseIncludes(filePath: string): Promise<IInclude[]> {
  const srcData = await fs.promises.readFile(filePath, 'utf8');

  const regexp = /^\s*#(tryinclude|include)\s+(?:(?:"([^"]+)")|(?:<([^>]+)>))/gm;

  const includes = [];

  let match;
  while ((match = regexp.exec(srcData))) {
    const required = match[2] !== 'tryinclude';

    if (match[2]) {
      includes.push({ name: match[2], type: IncludeType.Relative, required });
    } else if (match[3]) {
      includes.push({ name: match[3], type: IncludeType.Native, required });
    }
  }

  return includes;
}
