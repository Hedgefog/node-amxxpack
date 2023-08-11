import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function createDirHash(
  dirs: string[],
  filterFn: (p: {
    dir: string,
    info: fs.Dirent
  }) => boolean = null,
  initialHash: crypto.Hash = null
) {
  const hashSum = initialHash || crypto.createHash('sha256');

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    const items = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (filterFn && !filterFn({ dir, info: item })) {
        continue;
      }

      if (item.isFile()) {
        const fileStat = await fs.promises.stat(fullPath);
        const data = `${fullPath}:${fileStat.size}:${fileStat.mtimeMs}`;
        hashSum.update(data);
      } else if (item.isDirectory()) {
        await createDirHash([fullPath], filterFn, hashSum);
      }
    }
  }

  return hashSum;
}

export default createDirHash;
