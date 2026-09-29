import fg from 'fast-glob';

// Every file under a directory (dotfiles included), as sorted POSIX paths relative to it.
const listFiles = (dir) =>
  fg
    .sync('**/*', { cwd: dir, onlyFiles: true, dot: true })
    .sort((a, b) => a.localeCompare(b));

export { listFiles };
