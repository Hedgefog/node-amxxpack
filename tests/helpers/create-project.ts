import { map } from 'lodash';
import Chance from 'chance';
import mkdirp from 'mkdirp';
import fs from 'fs';
import path from 'path';

const chance = new Chance();

export interface IProjectFile {
  fileName: string;
  content?: string;
}

function createProject(dir: string) {
  const projectName = chance.word({ length: 8 });
  const projectPath = path.join(dir, projectName);

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
      cwd: dir
    },
    async initDir(files: (IProjectFile | string)[]) {
      await mkdirp(projectPath);

      await Promise.all(
        map(files, async (file) => {
          const fileName = typeof file === 'string' ? file : file.fileName;
          const content = typeof file === 'string' ? '' : file.content;

          const filePath = path.join(projectPath, fileName);
          const { dir: subDir } = path.parse(filePath);
          await mkdirp(subDir);

          await fs.promises.writeFile(filePath, content || '');
        })
      );
    }
  };
}

export default createProject;
