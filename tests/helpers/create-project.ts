import { map } from 'lodash';
import Chance from 'chance';
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
    name: projectName,
    path: projectPath,
    options: {
      description: chance.word({ length: 8 }),
      version: `${chance.integer({ min: 0, max: 9 })}.${chance.integer({ min: 0, max: 9 })}.${chance.integer({ min: 0, max: 9 })}`,
      author: chance.word({ length: 8 }),
      name: projectName,
      git: false,
      nonpm: false,
      cwd: dir
    },
    async initDir(files: (IProjectFile | string)[]) {
      await fs.promises.mkdir(projectPath, { recursive: true });

      await Promise.all(
        map(files, async file => {
          const fileName = typeof file === 'string' ? file : file.fileName;
          const content = typeof file === 'string' ? '' : file.content;

          const filePath = path.join(projectPath, fileName);
          const { dir: subDir } = path.parse(filePath);
          await fs.promises.mkdir(subDir, { recursive: true });

          await fs.promises.writeFile(filePath, content || '');
        })
      );
    }
  };
}

export default createProject;
