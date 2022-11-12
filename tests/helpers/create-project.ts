import { map } from 'lodash';
import Chance from 'chance';
import mkdirp from 'mkdirp';
import fs from 'fs';
import path from 'path';

import { TEST_PROJECTS_DIR } from '../constants';

const chance = new Chance();

function createProject() {
  const projectName = chance.word({ length: 8 });
  const projectPath = path.join(TEST_PROJECTS_DIR, projectName);

  return {
    projectName,
    projectPath,
    projectOptions: {
      author: '',
      description: '',
      version: '0.0.1',
      name: projectName,
      git: false,
      nonpm: false,
      cwd: TEST_PROJECTS_DIR
    },
    async initDir(files: { [fileName: string]: string } = {}) {
      await mkdirp(projectPath);

      await Promise.all(
        map(files, async (content, file) => {
          const filePath = path.resolve(projectPath, file);
          const { dir: subDir } = path.parse(filePath);
          await mkdirp(subDir);

          await fs.promises.writeFile(filePath, content);
        })
      );
    }
  };
}

export default createProject;
