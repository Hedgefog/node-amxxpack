import chokidar from 'chokidar';

function setupWatch(dir: string | string[]) {
  const watcher = chokidar.watch(dir, {
    persistent: true,
    ignoreInitial: true,
    interval: 300,
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    }
  });

  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });

  watcher.on('error', (err) => {
    console.error('Watcher failure', err);
    process.exit(1);
  });

  return watcher;
}

export default setupWatch;
