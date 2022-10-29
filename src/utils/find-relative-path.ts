import path from 'path';

function findRelativePath(dirs: string[], to: string) {
  for (const dir of dirs) {
    const result = path.relative(dir, to);
    if (!result.startsWith(`..${path.sep}`)) {
      return result;
    }
  }

  return null;
}

export default findRelativePath;
