import fs from 'fs';

/**
 * Safely copies file
 * On some OS versions source file may be corrupted durion the copy process
 * The issue is related to file accessibility,
 * so we have to check access to the file before copying to avoid it
 */
async function copyFile(srcPath: string, destPath: string) {
  // eslint-disable-next-line no-bitwise
  await fs.promises.access(srcPath, fs.constants.W_OK | fs.constants.R_OK);

  try {
    // eslint-disable-next-line no-bitwise
    await fs.promises.access(destPath, fs.constants.W_OK | fs.constants.R_OK);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  await fs.promises.copyFile(srcPath, destPath);
}

export default copyFile;
