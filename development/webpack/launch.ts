// note: minimize non-`type` imports to decrease load time.
import { spawn, ChildProcess, type SpawnOptions } from 'node:child_process';
import { join } from 'node:path';
import { type Socket } from 'node:net';
import { type IPty } from 'node-pty';
import parser from 'yargs-parser';

const [command, _, ...argv] = process.argv;

const alias = { cache: 'c', help: 'h', watch: 'h' };
type Args = { [x in keyof typeof alias]?: boolean };
const args = parser(argv, { alias, boolean: Object.keys(alias) }) as Args;

if (args.cache === false || args.help === true || args.watch === true) {
  // there are no time savings to running the build in a child process if the
  // cache is disabled, we need to output "help", or we're in watch mode.
  import(join(__dirname, 'build.ts')).then(({ build }) => build());
} else {
  const env = { NODE_OPTIONS: '', ...process.env, LAUNCHPID: `${process.pid}` };
  // node recommends using 75% of the available memory for `max-old-space-size`
  // https://github.com/nodejs/node/blob/dd67bf08cb1ab039b4060d381cc68179ee78701a/doc/api/cli.md#--max-old-space-sizesize-in-megabytes
  // and `--max-semi-space-size=128` and `--huge-max-old-generation-size` reduce garbage collection pauses
  const maxOldSpace = ~~((require('node:os').totalmem() * 0.75) / (1 << 20));
  env.NODE_OPTIONS += ` --max-old-space-size=${maxOldSpace} --max-semi-space-size=128 --stack-trace-limit=0 --title=fork`;

  // run the build in a child process so that we can exit the parent process as
  // soon as the build completes, but let the cache serialization finish in the
  // background (the cache can take 5+ seconds to serialize and persist).

  const { connect, destroy, stdio } = createOutputStreams();
  const options: SpawnOptions = {
    // detach to allow the parent to exit without killing the child process
    detached: true,
    env,
    stdio,
  };
  const fork = join(__dirname, 'fork.ts');
  spawn(command, [...process.execArgv, fork, ...argv], options)
    .once('close', destroy) // clean up if the child crashes
    .once('spawn', connect);
}

function createOutputStreams() {
  const { isatty } = require('node:tty');
  // TODO: handle Windows
  const isWindows = process.platform === 'win32';
  const outs = (['stdout', 'stderr'] as const).map((name) => {
    const stream = process[name];
    if (isWindows || !isatty(stream.fd)) {
      return {
        destroy: (): void => {},
        pipe: (child: ChildProcess) => void child[name]!.pipe(stream),
        pty: 'pipe' as 'pipe' | Socket, // let Node create the Pipes
        resize: (): void => {}, // Add explicit return type annotation
      };
    }

    // create a "pseudo" TTY so the child behaves like a tty
    const pty = require('node-pty').open({
      cols: stream.columns,
      rows: stream.rows,
      encoding: null, // don't bother encoding since we pipe the data anyway
    }) as IPty & { master: Socket; slave: Socket };

    // unref lets the parent shut down
    [pty.master, pty.slave].forEach((s) => s.unref());

    return {
      destroy: (): void => void pty.slave.destroy(),
      pipe: (child: ChildProcess) => void pty.master.pipe(stream),
      pty: pty.slave as 'pipe' | Socket,
      resize: (): void => pty.resize(stream.columns, stream.rows),
    };
  });

  return {
    connect(this: ChildProcess, child = this) {
      // hook up the child's stdio to the parent's so we can see progress
      outs.forEach((out) => out.pipe(child));

      // exit gracefully when the child signals the parent via `SIGUSR2`
      process.on('SIGUSR2', () => child.unref());

      // kill the child process if we didn't exit cleanly
      process.on('exit', (code) => code > 128 && child.kill(code - 128));

      // `SIGWINCH` means the terminal was resized
      process.on('SIGWINCH', (signal) => {
        // resize the tty's
        outs.forEach((out) => out.resize());
        // then tell the child process to update dimensions
        child.kill(signal);
      });
    },
    destroy: () => outs.forEach((out) => out.destroy()),
    stdio: ['ignore' as const, outs[0].pty, outs[1].pty],
  };
}
