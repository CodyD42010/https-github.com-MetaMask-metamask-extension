if (!process.disconnect) {
  throw new Error(`${__filename} must be run as an IPC-enabled child process`);
}

// the build process inspects `stdout` and `stderr` to determine how logging
// should behave (colors, line clearing, etc).
process.stdout.isTTY = process.stderr.isTTY = process.env.ISTTY === 'true';
// sync columns, as webpack uses this to determine how to format its output.
process.on('message', (columns: number) => (process.stderr.columns = columns));

function afterBuild() {
  process.stdout.write = process.stderr.write = () => true;

  // disconnect IPC from and end stdio to allow the parent to exit
  process.disconnect();
  process.stdout.end();
  process.stderr.end();
}

require('./build').build(afterBuild);
