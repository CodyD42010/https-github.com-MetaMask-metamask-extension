import type { ChildProcess } from 'node:child_process';
import { type Readable } from 'node:stream';
import { type Socket } from 'node:net';
import { type IPty } from 'node-pty';

/**
 * A more complete type for the `node-pty` module's `IPty` interface
 */
export interface PTY extends IPty {
  master: Socket;
  slave: Socket;
}

/**
 * Node's ChildProcess type extended with `stderr` and `stdout`'s `unref`
 * method, which is missing from the standard Node.js types.
 */
export interface Child extends ChildProcess {
  stderr: (Readable & { unref: () => Readable }) | null;
  stdout: (Readable & { unref: () => Readable }) | null;
}

export type StdName = 'stdout' | 'stderr';

/**
 * The control interface for a child process's stdio streams.
 */
export interface Stdio {
  destroy: () => void;
  listen: (child: Child) => void;
  pty: Socket | 'pipe';
  resize: () => void;
  unref: (child: Child) => void;
}
