import { join } from 'node:path';
import type { ChildProcess as Child } from 'node:child_process';
// note: we minimize imports to decrease load time.
import parser, { Arguments } from 'yargs-parser';

const args = process.argv.slice(2);
const { cache, help, watch } = parser(args, {
  boolean: ['cache', 'help', 'watch'],
  alias: {
    cache: ['c'],
    help: ['h'],
    watch: ['w'],
  },
}) as Arguments & { cache?: boolean; help?: boolean; watch?: boolean };

if (cache === false || help === true || watch === true) {
  // there are no time savings to running the build in a child process if we're
  // in watch mode, the cache is disabled, or we need to output `help`.
  require(join(__dirname, 'build.ts')).build();
} else {
  // node recommends using 75% of the available memory for `max-old-space-size`
  // https://github.com/nodejs/node/blob/dd67bf08cb1ab039b4060d381cc68179ee78701a/doc/api/cli.md#--max-old-space-sizesize-in-megabytes
  const maxOldSpace = ~~((require('node:os').totalmem() * 0.75) / (1 << 20));
  const { NODE_OPTIONS, ...env } = process.env;
  // --max-semi-space-size reduces garbage collection pauses
  env.NODE_OPTIONS = `${NODE_OPTIONS} --max-old-space-size=${maxOldSpace} --max-semi-space-size=128`;
  env.ISTTY = Boolean(process.stdout.isTTY).toString();

  // run the build in a child process so that we can exit the parent process as
  // soon as the build completes, but let the cache serialization finish in the
  // background (the cache can take 5+ seconds to serialize and persist).
  const modulePath = join(__dirname, 'fork.ts');
  const child: Child = require('node:child_process').fork(modulePath, args, {
    env,
    // detach the child. this allows the parent to exit without killing the
    // child. The ipc connection prevents the parent from exiting too early.
    detached: true,
    // `overlapped` makes Windows faster; it's identical to `pipe` on other
    // platforms. `ipc` allows the child to call `process.disconnect()` from
    // the parent.
    stdio: ['overlapped', 'overlapped', 'overlapped', 'ipc'],
  });

  if ('columns' in process.stderr) {
    // Handle terminal resize events so that the child can reflow its output
    child.send(process.stderr.columns);
    process.on('SIGWINCH', () => child.send(process.stderr.columns));
  }

  // hook up the child's stdio to the parent's stdio so we can see the output.
  (['stderr', 'stdout'] as const).forEach((io) => child[io]!.pipe(process[io]));
  process.stdin.pipe(child.stdin!);

  // unpipe stdin on child.disconnect to allow the parent to exit immediately.
  child.once('disconnect', () => process.stdin.unpipe()).unref();
}
