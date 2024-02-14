const { promises: fs } = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { exitWithError } = require('../../development/lib/exit-with-error');

async function main() {
  const { argv } = yargs(hideBin(process.argv))
    .usage(
      '$0 [options] <e2e-test-path>',
      'Run a single E2E test, with a variable number of retries.',
      (_yargs) =>
        _yargs
          .option('browser', {
            default: process.env.SELENIUM_BROWSER,
            description: `Set the browser used; either 'chrome' or 'firefox'.`,
            type: 'string',
            choices: ['chrome', 'firefox'],
          })
          .option('debug', {
            default: process.env.E2E_DEBUG === 'true',
            description:
              'Run tests in debug mode, logging each driver interaction',
            type: 'boolean',
          })
          .option('mmi', {
            description: 'Run only mmi related tests',
            type: 'boolean',
          })
          .option('leave-running', {
            default: false,
            description:
              'Leaves the browser running after a test fails, along with anything else that the test used (ganache, the test dapp, etc.)',
            type: 'boolean',
          })
          .option('update-snapshot', {
            alias: 'u',
            default: false,
            description: 'Update E2E snapshots',
            type: 'boolean',
          })
          .option('update-privacy-snapshot', {
            default: false,
            description:
              'Update the privacy snapshot to include new hosts and paths',
            type: 'boolean',
          })
          .positional('e2e-test-path', {
            describe: 'The path for the E2E test to run.',
            type: 'string',
            normalize: true,
          }),
    )
    .strict()
    .help('help');

  const {
    browser,
    debug,
    mmi,
    e2eTestPath,
    leaveRunning,
    updateSnapshot,
    updatePrivacySnapshot,
  } = argv;

  if (!browser) {
    exitWithError(
      `"The browser must be set, via the '--browser' flag or the SELENIUM_BROWSER environment variable`,
    );
    return;
  } else if (browser !== process.env.SELENIUM_BROWSER) {
    process.env.SELENIUM_BROWSER = browser;
  }

  try {
    const stat = await fs.stat(e2eTestPath);
    if (!stat.isFile()) {
      exitWithError('Test path must be a file');
      return;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      exitWithError('Test path specified does not exist');
      return;
    } else if (error.code === 'EACCES') {
      exitWithError(
        'Access to test path is forbidden by file access permissions',
      );
      return;
    }
    throw error;
  }

  if (debug) {
    process.env.E2E_DEBUG = 'true';
  }

  if (leaveRunning) {
    process.env.E2E_LEAVE_RUNNING = 'true';
  }

  if (updateSnapshot) {
    process.env.UPDATE_SNAPSHOTS = 'true';
  }

  if (updatePrivacySnapshot) {
    process.env.UPDATE_PRIVACY_SNAPSHOT = 'true';
  }

  const extraArgs = process.env.E2E_ARGS?.split(' ') || [];

  // If mmi flag is passed
  if (mmi) {
    // Tests that contains `@no-mmi` will be grep (-g) and inverted (-i)
    // meaning that all tests with @no-mmi in the title will be ignored
    extraArgs.push('-g', '@no-mmi', '-i');
  }

  const dir = 'test/test-results/e2e';
  fs.mkdir(dir, { recursive: true });
}

main().catch((error) => {
  exitWithError(error);
});
