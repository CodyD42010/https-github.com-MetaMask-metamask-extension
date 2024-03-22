/**
 * @file Fast git utilities for retrieving commit metadata.
 */

import { closeSync, openSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Reader } from './reader';

/**
 * Retrieves the commit hash of the last commit on the current Git branch.
 *
 * Does not require git and is faster than shelling out to git.
 *
 * TODO: investigate if we need to handle packed-refs or recrusive symbolic refs
 *
 * @param gitDir - The path to the `.git` directory of the repository. Defaults
 * to the `.git` directory in the root of the project.
 * @returns Millisecond precision timestamp in UTC of the last commit on the
 * current branch. If the branch is detached or has no commits, it will throw an
 * error.
 * @throws Throws an error if the current branch is detached or has no commits.
 * May also throw if the Git repository is malformed (or not found).
 */
export function getLastCommitHash(gitDir = join(__dirname, '../../../.git')) {
  // read .git/HEAD to get the current branch/commit
  const ref = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();

  // determine if we're in a detached HEAD state or on a branch
  const oid = ref.startsWith('ref: ')
    ? // HEAD is pointer to a branch; load the commit hash
      readFileSync(join(gitDir, ref.slice(5)), 'utf8').trim()
    : // HEAD is detached; so use the commit hash directly
      ref;

  return oid;
}

/**
 * This is the header of a git Idx file v2. Its a "magic" number + version.
 */
const idxV2 = Buffer.from([0xff, 0x74, 0x4f, 0x63, 0x0, 0x0, 0x0, 0x2]);
/**
 * Searches the given git index file for the offset of a given oid.
 * Returns the offset if found, otherwise returns null.
 *
 * @param filename
 * @param oid
 * @returns
 */
function searchGitIdx(filename: string, oid: Buffer) {
  const fd = openSync(filename, 'r');
  try {
    const reader = new Reader(fd, 20);
    if (!reader.read(8).equals(idxV2)) throw new Error('unsupported IDX file');

    // Calculate the position of the first byte of the OID in the fanout table
    const first = oid[0];
    const start = first === 0 ? 0 : reader.readUInt32BE(4 * (first - 1));
    const end = reader.readUInt32BE(0);
    const length = end - start;

    // skip over the remainder of the fanout table (255 entries * 4 bytes each)
    reader.seek(4 * (255 - first - 1));

    // record the number of entries in the hash table
    const hashTableLength = reader.readUInt32BE(0);

    // skip the start of the hash table
    reader.seek(20 * start);

    for (let i = 0; i < length; i++) {
      if (!reader.read(20).equals(oid)) continue;

      // skip over the remaining hashes (20 bytes for each hash)
      reader.seek(20 * (hashTableLength - i - start - 1));
      // we don't care about the CRCs (4 bytes for each CRC)
      reader.seek(4 * hashTableLength);
      // skip to the location of our oid's offset (4 bytes for each offset)
      reader.seek(4 * (i + start));
      // finally, read the offset value
      return reader.readUInt32BE(0);
    }
  } finally {
    closeSync(fd);
  }
  return null;
}

/**
 * Retrieves the commit object from the file system.
 *
 * @param oid
 * @param gitDir
 */
function getCommitFromObject(oid: string, gitDir: string) {
  // read the commit object from the file system
  const commitPath = join(gitDir, 'objects', oid.slice(0, 2), oid.slice(2));
  try {
    return readFileSync(commitPath);
  } catch {
    return null;
  }
}

/**
 * Retrieves the commit object from a pack file, if it exists.
 *
 * @param oid
 * @param gitDir
 * @returns
 */
function getCommitFromPackFile(
  oid: string,
  gitDir = join(__dirname, '../../../.git'),
): Buffer | null {
  const idxs = readdirSync(join(gitDir, 'objects/pack')).filter((x) =>
    x.endsWith('.idx'),
  );
  for (const filename of idxs) {
    const indexFile = `${gitDir}/objects/pack/${filename}`;
    const offset = searchGitIdx(indexFile, Buffer.from(oid, 'hex'));
    if (offset === null) continue;

    const packFile = indexFile.replace(/idx$/u, 'pack');
    const fd = openSync(packFile, 'r');
    try {
      const reader = new Reader(fd, 1).seek(offset);
      const flags = reader.readUInt8(0);
      // type is encoded in bits 654, 0b0001_0000 is for "commit"
      if ((flags & 0b0111_0000) !== 0b0001_0000) {
        throw new Error('Only commit types are supported');
      }
      // extract the last four bits of length from the data
      let length = flags & 0b0000_1111;
      // check if the next byte is part of the variable-length encoded number
      const multibyte = flags & 0b1000_0000;
      // if multibyte encoding is used, decode the number
      if (multibyte) {
        let shift = 4;
        let byte: number;

        for (; ; shift += 7) {
          // Read the next byte
          byte = reader.readUInt8(0);

          // Accumulate the byte into the length, excluding its most significant bit
          length |= (byte & 0x7f) << shift;

          // Check if the MSB is set, indicating more bytes are part of the number
          // If not, break out of the loop
          if (!(byte & 0x80)) {
            break;
          }
        }
      }

      return reader.peek(length);
    } finally {
      closeSync(fd);
    }
  }
  return null;
}

/**
 * Retrieves the timestamp of the last commit in UTC for the current Git branch.
 *
 * The author timestamp is used for its consistency across different
 * repositories and its inclusion in the Git commit hash calculation. This makes
 * it a stable choice for reproducible builds.
 *
 * Does not require git and is faster than shelling out to git.
 *
 * This function is synchronous because it's faster for our workloads this way.
 *
 * @param oid - The commit hash to retrieve the timestamp for. Defaults to the
 * latest commit on the current branch.
 * @param gitDir - The path to the `.git` directory of the repository. Defaults
 * to the `.git` directory in the root of the project.
 * @returns Millisecond precision timestamp in UTC of the last commit on the
 * current branch. If the branch is detached or has no commits, it will throw an
 * error.
 * @throws Throws an error if the current branch is detached or has no commits.
 * May also throw if the Git repository is malformed (or not found).
 */
export function getCommitTimestamp(
  oid: string | null = null,
  gitDir = join(__dirname, '../../../.git'),
) {
  let hash = oid;
  if (hash === null) hash = getLastCommitHash(gitDir);
  const rawCommit = getRawCommit(hash, gitDir);

  if (!rawCommit) throw new Error(`commit ${hash} not found`);

  // It's compressed with zlib DEFLATE, so we need to decompress it. Use
  // `unzipSync` from zlib since git uses zlib-wrapped DEFLATE. It's loaded in
  // this way to avoid requiring it when this function isn't used.
  const { inflateSync } = require('node:zlib') as typeof import('node:zlib');
  const inflated = inflateSync(rawCommit);
  // the commit object is a text file with a header and a body, we just want the
  // body, which is after the first null byte (if there is one)
  const firstNull = inflated.indexOf(0);
  const commit = inflated.subarray(firstNull + 1).toString('utf8');
  // commits are strictly formatted; use regex to extract the time fields
  const timestamp = extractAuthorTimestamp(commit);
  // convert git timestamp from seconds to milliseconds
  return parseInt(timestamp, 10) * 1000;
}

/**
 * Retrieves the commit object from the file system.
 *
 * @param oid
 * @param gitDir
 * @returns
 */
function getRawCommit(oid: string, gitDir: string): Buffer | null {
  // most commits will be available as loose objects, but if it isn't we'll need
  // to look in the packfiles.
  return getCommitFromObject(oid, gitDir) || getCommitFromPackFile(oid, gitDir);
}

/**
 * Extracts the authorship timestamp from a well-formed git commit string.
 *
 * @param commit - A well-formed git commit
 * @returns timestamp of the commit
 */
function extractAuthorTimestamp(commit: string): string {
  return (commit.match(/^author .* <.*> (.*) .*$/mu) as string[])[1];
}
