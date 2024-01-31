import { readFileSync, readdirSync } from 'node:fs';
import { parse, join, relative } from 'node:path';
import type zlib from 'node:zlib';
import process from 'node:process';
import { isatty } from 'node:tty';
import { SemVerVersion, isValidSemVerVersion } from '@metamask/utils';
import { merge } from 'lodash';
import type chalkType from 'chalk';
import { Chunk, type EntryObject, type Stats, version } from 'webpack';
import type TerserPluginType from 'terser-webpack-plugin';

export type Manifest = chrome.runtime.Manifest;
export type ManifestV2 = chrome.runtime.ManifestV2;
export type ManifestV3 = chrome.runtime.ManifestV3;

/**
 * Target browsers
 */
export const Browsers = ['brave', 'chrome', 'firefox', 'opera'] as const;
export type Browser = (typeof Browsers)[number];

// HMR (Hot Module Reloading) can't be used until all circular dependencies in
// the codebase are removed
// See: https://github.com/MetaMask/metamask-extension/issues/22450
// TODO: remove this variable when HMR is ready.
export const __HMR_READY__ = false;

/**
 * Regular expression to match files in `node_modules`
 */
export const NODE_MODULES_RE = /^.*\/node_modules\/.*$/u;

/**
 * No Operation. A function that does nothing and returns nothing.
 *
 * @returns `undefined`
 */
export const noop = () => undefined;

/**
 *
 * @returns Returns the current version of MetaMask as specified in package.json
 * @throws Throws an error if the version is not a valid semantic version.
 */
export const getMetaMaskVersion = (): SemVerVersion => {
  const { version } = require('../../../package.json');
  if (isValidSemVerVersion(version)) {
    return version as SemVerVersion;
  }
  throw new Error(
    `Couldn't run webpack. Invalid \`version\` found in \`package.json\`. Expected a valid semantic version (https://semver.org/) but got "${version}".`,
  );
};

/**
 *
 * @param userEnv
 * @returns Returns `process.env` after checking that it is valid for building.
 * @throws Throws an error if `process.env` is invalid or missing required fields.
 */
export const mergeEnv = (userEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  // TODO: throw this whole function in the trash and import env vars the way
  // the gulp build system does it.
  let env: NodeJS.ProcessEnv = {};
  try {
    const rawConfig = readFileSync(join(__dirname, '../../../.metamaskrc'));
    env = require('dotenv').parse(rawConfig);
  } catch {
    console.log('No .metamaskrc file found, using default env');
    env.INFURA_PROJECT_ID = '00000000000000000000000000000000';
  }

  env.METAMASK_VERSION = getMetaMaskVersion();
  env.BLOCKAID_FILE_CDN =
    'static.metafi.codefi.network/api/v1/confirmations/ppom';
  env.BLOCKAID_PUBLIC_KEY =
    '066ad3e8af5583385e312c156d238055215d5f25247c1e91055afa756cb98a88';
  env.SUPPORT_LINK = 'https://support.metamask.io';
  env.METAMASK_DEBUG;

  // TODO: these should be dynamic somehow
  env.PHISHING_WARNING_PAGE_URL = 'http://localhost:9999';
  env.IFRAME_EXECUTION_ENVIRONMENT_URL =
    'https://execution.consensys.io/0.36.1-flask.1/index.html';
  env.METAMASK_BUILD_NAME = 'MM Webpack Test';
  env.METAMASK_BUILD_ICON = 'data:image:./images/icon-64.png';
  env.METAMASK_BUILD_APP_ID = 'io.metamask';
  // env.IN_TEST = "0";

  const finalEnv = { ...userEnv, ...env };

  const { INFURA_PROJECT_ID } = finalEnv;
  // if we don't have an INFURA_PROJECT_ID at build time we should bail!
  if (!INFURA_PROJECT_ID) {
    throw new Error(
      'The `INFURA_PROJECT_ID` environment variable was not supplied at build time.',
    );
  }

  // validate INFURA_KEY
  if (INFURA_PROJECT_ID) {
    if (!/^[a-f0-9]{32}$/.test(INFURA_PROJECT_ID)) {
      throw new Error(
        'INFURA_PROJECT_ID must be 32 characters long and contain only the characters a-f0-9',
      );
    }
  }

  return env;
};

export type ManifestOptions = {
  env: 'development' | 'production';
  browser: Browser;
  version: SemVerVersion;
  name: string;
  description: string;
};

type ManifestTypeForVersion<T extends Manifest> =
  T['manifest_version'] extends 2 ? ManifestV2 : ManifestV3;

export const generateManifest = (
  baseManifest: Manifest,
  options: ManifestOptions,
): ManifestTypeForVersion<typeof baseManifest> => {
  const { version, name, description, browser } = options;

  const browserManifestOverrides: Partial<Manifest> = require(join(
    __dirname,
    `../../../app/manifest/v${baseManifest.manifest_version}/${browser}.json`,
  ));

  const overrides = {
    version,
    name,
    description,
  };

  return merge(
    {},
    baseManifest,
    browserManifestOverrides,
    overrides,
  ) as ManifestTypeForVersion<typeof baseManifest>;
};

/**
 * Collects all entry files for use with webpack.
 *
 * @param manifest - Base manifest file
 * @param dir - Absolute directory to search for entry files listed in the base
 * manifest
 * @returns an `entry` object containing html and JS entry points for use with
 * webpack, and an array, `manifestScripts`, list of filepaths of all scripts
 * that were added to it.
 */
export function combineEntriesFromManifestAndDir(
  manifest: Manifest,
  dir: string,
) {
  const entry: EntryObject = {};
  const selfContainedScripts: Set<string> = new Set([
    // Snow shouldn't be chunked
    'snow.prod',
    'use-snow',
  ]);

  function addManifestScript(filename: string | undefined) {
    if (filename) {
      selfContainedScripts.add(filename);
      entry[filename] = {
        chunkLoading: false,
        filename, // output filename
        import: join(dir, filename), // the path to the file to use as an entry
      };
    }
  }
  function addHtml(filename: string | undefined) {
    if (filename) {
      entry[parse(filename).name] = join(dir, filename);
    }
  }

  // add content_scripts to entries
  manifest.content_scripts?.forEach((s) => s.js?.forEach(addManifestScript));

  if (manifest.manifest_version === 2) {
    manifest.web_accessible_resources?.forEach(addManifestScript);
    manifest.background?.scripts?.forEach(addManifestScript);
    addHtml(manifest.background?.page);
  } else {
    addManifestScript(manifest.background?.service_worker);
    manifest.web_accessible_resources?.forEach(({ resources }) =>
      resources.forEach((filename) => {
        filename.endsWith('.js') && addManifestScript(filename);
      }),
    );
  }

  for (const file of readdirSync(dir)) {
    // ignore non-htm/html files
    if (/\.html?$/iu.test(file)) {
      assertValidEntryFileName(file, dir);
      addHtml(file);
    }
  }

  /**
   * Ignore scripts that were found in the manifest, as these are only loaded by
   * the browser extension platform itself.
   *
   * @param chunk
   * @param chunk.name
   * @returns
   */
  function canBeChunked({ name }: Chunk): boolean {
    return !name || !selfContainedScripts.has(name);
  }
  return { entry, canBeChunked };
}

function assertValidEntryFileName(file: string, dir: string) {
  if (!file.startsWith('_')) {
    return;
  }

  const chalk: typeof chalkType = require('chalk');
  throw new DetailedError({
    problem: chalk`{red.inverse Invalid Filename Detected}\nPath: {bold.white.dim '${relative(
      process.cwd(),
      join(dir, file),
    )}'}`,
    reason: chalk`Filenames at the root of the extension directory starting with {green "_"} are reserved for use by the browser.`,
    solutions: [
      chalk`Rename this file to remove the underscore (e.g., {bold.white.dim '${file}'} to {bold.white.dim '${file.slice(
        1,
      )}'}).`,
      chalk`Move this file to a subdirectory. If necessary, add it manually to the build.`,
    ],
    context: chalk`This file was included in the build automatically by our script, which adds all HTML files at the root of {dim '${dir}'}.`,
  });
}

export type DetailedErrorMessage = {
  problem: string;
  reason: string;
  solutions: string[];
  context?: string;
};

export class DetailedError extends Error {
  constructor({ problem, reason, solutions, context }: DetailedErrorMessage) {
    const chalk: typeof chalkType = require('chalk');
    const message = `${chalk.red(problem)}
${chalk.red('Reason:')} ${chalk.white(reason)}

${chalk.white.bold(`Suggested Action${solutions.length === 1 ? '' : 's'}:`)}
${solutions
  .map((solution) => `${chalk.hex('EF811A')('•')} ${chalk.white(solution)}`)
  .join('\n')}
${
  context
    ? `\n${chalk.white.dim.bold('Context:')} ${chalk.white.dim(context)}`
    : ``
}
`;
    super(message);
    this.message = message;
    this.name = '';
  }
}

/**
 * Retrieves the datetime of the last commit in UTC for the current Git branch.
 *
 * The author timestamp is used for its consistency across different
 * repositories and its inclusion in the Git commit hash calculation. This makes
 * it a stable choice for reproducible builds.
 *
 * Does not require git and is faster than shelling out to git.
 *
 * @param gitDir
 * @returns Millisecond precision timestamp in UTC of the last commit on the
 * current branch. If the branch is detached or has no commits, it will throw an
 * error.
 * @throws Throws an error if the current branch is detached or has no commits.
 * May also throw if the Git repository is malformed (or not found).
 */
export function getLastCommitDateTimeUtc(
  gitDir = join(__dirname, '..', '.git'),
): number {
  // Note: this function is synchronous because it needs to be used in a
  // synchronous context (it's also faster this way)

  // use `unzipSync` from zlib since git uses zlib-wrapped DEFLATE
  // loaded in this way to avoid requiring it when the function isn't used.
  const { unzipSync } = require('node:zlib') as typeof zlib;

  // read .git/HEAD to get the current branch/commit
  const ref = readFileSync(join(gitDir, 'HEAD'), 'utf-8').trim();

  // determine if we're in a detached HEAD state or on a branch
  const oid = ref.startsWith('ref: ')
    ? // HEAD is pointer to a branch; load the commit hash
      readFileSync(join(gitDir, ref.slice(5)), 'utf-8').trim()
    : // HEAD is detached; so use the commit hash directly
      ref;

  // read the commit object from the file system
  const commitPath = join(gitDir, 'objects', oid.slice(0, 2), oid.slice(2));
  const rawCommit = readFileSync(commitPath);
  // it's compressed with zlib DEFLATE, so we need to decompress it
  const decompressed = unzipSync(rawCommit);
  // the commit object is a text file with a header and a body, we just want the
  // body, which is after the first null byte
  const firstNull = decompressed.indexOf(0);
  const commitBuffer = decompressed.subarray(firstNull + 1);
  const commitText = new TextDecoder().decode(commitBuffer);
  // git commits are strictly formatted, so we can use a regex to extract the
  // authorship time fields
  const [, timestamp, timezoneOffset] = commitText.match(
    /^author .* <.*> (.*) (.*)$/mu,
  )!;
  // convert git timestamp from seconds to milliseconds
  const msSinceLocalEpoch = parseInt(timestamp, 10) * 1000;
  const msTimezoneOffset = parseInt(timezoneOffset, 10) * 60000;

  return msSinceLocalEpoch - msTimezoneOffset;
}

export function getMinimizers() {
  const TerserPlugin: typeof TerserPluginType = require('terser-webpack-plugin');
  return [
    new TerserPlugin({
      // use SWC to minify (about 7x faster than Terser)
      minify: TerserPlugin.swcMinify,
      // do not minify snow.
      exclude: /snow\.prod/u,
    }),
  ];
}

const colors = isatty(process.stderr.fd) ? process.stderr.getColorDepth() : 1;
function green(message: string) {
  return colors ? message : `\x1b[1;32m${message}\x1b[0m`;
}
function orange(message: string): string {
  switch (colors) {
    case 4: // 16 colors; return yellow :-(
      return `\x1b[1;33m${message}\x1b[0m`;
    case 8: // 256 colors; return approximate metamask orange
      return `\x1b[1;38;5;208m${message}\x1b[0m`;
    case 24: // 2**24 colors; return metamask orange as RGB
      return `\x1b[1;38;2;246;133;27m${message}\x1b[0m`;
    case 1: // no colors; return normal text :-(
    default:
      return message;
  }
}

/**
 * Logs a summary of build information to `stderr`.
 *
 * @param logStats - If `true`, logs the full stats object to `stderr`,
 * otherwise logs only errors and a completion message, if it completed.
 * @param err
 * @param stats
 */
export function logSummary(
  logStats: boolean,
  err: Error | null | undefined,
  stats: Stats | undefined,
) {
  err && console.error(err);

  if (stats) {
    stats.compilation.name = orange(`🦊 ${stats.compilation.compiler.name}`);
    if (logStats) {
      // log everything (computing stats is slow, so we only do it if asked).
      console.error(stats.toString({ colors }));
    } else if (stats.hasErrors() || stats.hasWarnings()) {
      // always log errors and warnings, if we have them.
      const message = stats.toString({ colors, preset: 'errors-warnings' });
      console.error(message);
    } else {
      // otherwise, just log a simple update
      console.error(
        `${stats.compilation.name} (webpack ${version}) compiled ${green(
          'successfully',
        )} in ${stats.endTime - stats.startTime}ms`,
      );
    }
  }
}

/**
 * @param array
 * @returns a new array with duplicate values removed and sorted
 */
export const uniqueSort = (array: string[]) => [...new Set(array)].sort();
