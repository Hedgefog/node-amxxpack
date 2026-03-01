import fs from 'fs';

/**
 * Safely copies file
 * On some OS versions source file may be corrupted durion the copy process
 * The issue is related to file accessibility,
 * so we have to check access to the file before copying to avoid it
 */
async function copyFile(srcPath: string, destPath: string) {
  await fs.promises.access(srcPath, fs.constants.W_OK | fs.constants.R_OK);

  try {
    await fs.promises.access(destPath, fs.constants.W_OK | fs.constants.R_OK);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  await fs.promises.copyFile(srcPath, destPath);
}

export default copyFile;
