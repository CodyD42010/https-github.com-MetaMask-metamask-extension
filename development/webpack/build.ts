import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import webpack, {
  ProvidePlugin,
  type Configuration,
  type WebpackPluginInstance,
  type Chunk,
  type MemoryCacheOptions,
  type FileCacheOptions,
} from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlBundlerPlugin from 'html-bundler-webpack-plugin';
import rtlCss from 'postcss-rtlcss';
import autoprefixer from 'autoprefixer';
import type WebpackDevServerType from 'webpack-dev-server';
import type ReactRefreshPluginType from '@pmmmwh/react-refresh-webpack-plugin';
import { type SemVerVersion } from '@metamask/utils';
import {
  type Browser,
  type Manifest,
  generateManifest,
  mergeEnv,
  combineEntriesFromManifestAndDir,
  getLastCommitDateTimeUtc,
  getMinimizers,
  NODE_MODULES_RE,
  noop,
  logSummary,
} from './utils/helpers';
import { parseArgv } from './utils/cli';
import { type CodeFenceLoaderOptions } from './utils/loaders/codeFenceLoader';
import { type SwcLoaderOptions } from './utils/loaders/swcLoader';
import { SelfInjectPlugin } from './utils/plugins/SelfInjectPlugin';

// HMR can't be used until all circular dependencies in the codebase are removed
// see:  https://github.com/MetaMask/metamask-extension/issues/22450
// TODO: remove this variable when HMR is ready
const HMR_READY = false;

// disable browserslist stats as it needlessly traverses the filesystem multiple
// times looking for a stats file that doesn't exist.
require('browserslist/node.js').getStat = noop;

export function build(onBuild: () => void = noop) {
  const { conf, cacheKey, features } = parseArgv(process.argv.slice(2));

  if (conf['dry-run']) {
    console.error(`🦊 Build Config 🦊

Environment: ${conf.env}
Minify: ${conf.minify}
Watch: ${conf.watch}
Cache: ${conf.cache}
Progress: ${conf.progress}
Zip: ${conf.zip}
Snow: ${conf.snow}
LavaMoat: ${conf.lavamoat}
Manifest version: ${conf.manifest_version}
Browsers: ${conf.browser.join(', ')}
Devtool: ${conf.devtool}
Built type: ${conf.type}
Features: ${[...features.active].join(', ')}
`);
    process.exit(0);
  }

  // #region temporary short circuit for unsupported build configurations
  if (conf.lavamoat) {
    throw new Error(
      "The webpack build doesn't support LavaMoat yet. So sorry.",
    );
  }

  if (conf.browser.length > 1) {
    throw new Error(
      `The webpack build doesn't support multiple browsers yet. So sorry.`,
    );
  }

  if (conf.manifest_version === 3) {
    throw new Error(
      "The webpack build doesn't support manifest_version 3 yet. So sorry.",
    );
  }
  // #endregion temporary short circuit for unsupported build configurations

  const dir = join(__dirname, '../../app');
  const isDevelopment = conf.env === 'development';

  const MANIFEST_VERSION = conf.manifest_version;
  const manifestPath = join(dir, `manifest/v${MANIFEST_VERSION}/_base.json`);
  const manifest: Manifest = JSON.parse(readFileSync(manifestPath).toString());
  const { entry, canBeChunked } = combineEntriesFromManifestAndDir(
    manifest,
    dir,
  );

  // removes fenced code blocks from the source
  const codeFenceLoader: webpack.RuleSetRule & {
    options: CodeFenceLoaderOptions;
  } = {
    loader: require.resolve('./utils/loaders/codeFenceLoader'),
    options: {
      features,
    },
  };

  const browsersListPath = join(dir, '../.browserslistrc');
  // read browserslist manually to prevent it from searching for it everytime.
  const browsersListQuery = readFileSync(browsersListPath, 'utf-8');

  /**
   * Gets the Speedy Web Compiler (SWC) loader for the given syntax.
   *
   * @param syntax
   * @param enableJsx
   * @param config
   * @param envs
   * @returns
   */
  function getSwcLoader(
    syntax: 'typescript' | 'ecmascript',
    enableJsx: boolean,
    config: ReturnType<typeof parseArgv>['conf'],
    envs: Record<string, string> = {},
  ) {
    return {
      loader: require.resolve('./utils/loaders/swcLoader'),
      options: {
        env: {
          targets: browsersListQuery,
        },
        jsc: {
          externalHelpers: true,
          transform: {
            react: {
              development: isDevelopment,
              refresh: HMR_READY && isDevelopment && config.watch,
            },
            optimizer: {
              globals: {
                envs,
              },
            },
          },
          parser:
            syntax === 'typescript'
              ? {
                  syntax,
                  tsx: enableJsx,
                }
              : {
                  syntax,
                  jsx: enableJsx,
                },
        },
      } as const satisfies SwcLoaderOptions,
    };
  }

  // TODO: build once, then copy to each browser's folder then update the
  // manifests
  const BROWSER = conf.browser[0] as Browser;

  // TODO: make these dynamic. yargs, maybe?
  const NAME = 'MetaMask';
  const DESCRIPTION = `MetaMask ${BROWSER} Extension`;
  // TODO: figure out what build.yml's env vars are doing and them do the merge
  // stuff. Also, fix all this crappy ENV code.
  const ENV = mergeEnv({});
  const envsStringified = Object.entries(ENV).reduce(
    (acc: Record<string, string>, [key, val]) => {
      acc[`${key}`] = JSON.stringify(val);
      return acc;
    },
    {
      // PPOM_URI is only here because the gulp build process doesn't understand
      // `import.meta.url`
      PPOM_URI:
        'new URL("@blockaid/ppom_release/ppom_bg.wasm", import.meta.url)',
    },
  );
  // // this is code to set some of the gulp-build system's ENV variables
  // // it takes an extra 400ms, even after an experiment to make it to read
  // // files synchronously. It is commented out because it is just too slow for
  // // this build process. It needs to be rewritten. It should probably take
  // // about 5ms, including the `require` calls.
  // const { getConfig } = require("./development/build/config");
  // const c = getConfig(config.type, config.env)
  // const { variables, activeBuild } = c;

  // const { getVersion } = require("./development/lib/get-version");
  // const { setEnvironmentVariables } = require("./development/build/scripts");
  // setEnvironmentVariables({
  //   buildTarget: config.env === "production" ? "prod" : "dev",
  //   buildType: config.type,
  //   activeBuild: activeBuild,
  //   variables,
  //   version: getVersion(config.type, 0),
  // } as any); // the types are wrong lol

  // const ENV = [...c.variables.definitions()].reduce((obj, [key, value]) => {
  //   if (value != null) {
  //     obj[key] = value.toString();
  //   }
  //   return obj;
  // }, {});
  // const envsStringified = Object.entries(ENV).reduce(
  //   (acc: any, [key, val]) => {
  //     acc[`${key}`] = JSON.stringify(val);
  //     return acc;
  //   }
  // ) as any;
  // envsStringified.PPOM_URI = ENV.PPOM_URI = `new URL('@blockaid/ppom_release/ppom_bg.wasm', import.meta.url)`;

  // #region cache
  const cache = conf.cache
    ? ({
        type: 'filesystem',
        name: `MetaMask-${conf.env}`,
        version: cacheKey,

        idleTimeout: 0,
        idleTimeoutForInitialStore: 0,
        idleTimeoutAfterLargeChanges: 0,

        // small performance gain by increase memory generations
        maxMemoryGenerations: Infinity,

        // Disable allowCollectingMemory because it can slow the build by 10%!
        allowCollectingMemory: false,

        buildDependencies: {
          defaultConfig: [__filename],
          // Invalidates the build cache when the listed files change.
          // `__filename` makes all `require`d dependencies of *this* file
          // `buildDependencies`
          config: [
            __filename,
            join(dir, '../.metamaskrc'),
            join(dir, '../builds.yml'),
            join(dir, '../.browserslistrc'),
          ],
        },
      } as const satisfies FileCacheOptions)
    : ({ type: 'memory' } as const satisfies MemoryCacheOptions);
  // #endregion cache

  // #region plugins
  const plugins: WebpackPluginInstance[] = [
    new SelfInjectPlugin({
      test: /^scripts\/inpage\.js$/u,
    }),

    // HtmlBundlerPlugin treats HTML files as entry points
    new HtmlBundlerPlugin({
      // Disable the HTML preprocessor as we currently use Squirrley in an
      // html-loader instead.
      preprocessor: false,
      minify: conf.minify,
      integrity: 'auto',
    }),

    // use ProvidePlugin to polyfill *global* node variables
    new ProvidePlugin({
      // Make a global `Buffer` variable that points to the `buffer` package.
      Buffer: ['buffer', 'Buffer'],
      // Make a global `process` variable that points to the `process` package.
      process: 'process/browser',
    }),

    new CopyPlugin({
      patterns: [
        // translations
        { from: join(dir, '_locales'), to: '_locales' },
        // misc images
        // TODO: fix overlap between this folder and automatically bundled assets
        { from: join(dir, 'images'), to: 'images' },
        // generate manifest
        // TODO: do this better, it's gross.
        {
          from: join(dir, `manifest/v${MANIFEST_VERSION}/_base.json`),
          to: 'manifest.json',
          transform: (manifestBytes: Buffer, _path: string) => {
            const baseManifest: Manifest = JSON.parse(
              manifestBytes.toString('utf-8'),
            );
            const browserManifest = generateManifest(baseManifest, {
              env: conf.env,
              browser: BROWSER,
              description: DESCRIPTION,
              name: NAME,
              version: ENV.METAMASK_VERSION as SemVerVersion,
            });

            if (conf.devtool === 'source-map') {
              browserManifest.web_accessible_resources = [
                'scripts/inpage.js.map',
                'scripts/contentscript.js.map',
              ] as any;
            }
            return JSON.stringify(browserManifest, null, conf.minify ? 0 : 2);
          },
        },
      ],
    }),
  ];

  // enable React Refresh in 'development' mode when `watch` is enabled
  if (HMR_READY && isDevelopment && conf.watch) {
    const ReactRefreshWebpackPlugin: typeof ReactRefreshPluginType = require('@pmmmwh/react-refresh-webpack-plugin');
    plugins.push(new ReactRefreshWebpackPlugin());
  }

  if (conf.progress) {
    const { ProgressPlugin } = require('webpack');
    plugins.push(new ProgressPlugin());
  }

  if (conf.zip) {
    const { ZipPlugin } = require('./utils/plugins/ZipPlugin');
    const options = {
      outFilePath: '../../../builds/metamask.zip',
      mtime: getLastCommitDateTimeUtc(),
      excludeExtensions: ['.map'],
      // `level: 9` is the highest; it may increase build time by ~5% over
      level: 9,
    };
    plugins.push(new ZipPlugin(options));
  }
  // #endregion plugins

  const webpackOptions = {
    entry,
    cache,
    plugins,
    context: dir,
    mode: conf.env,
    name: `MetaMask – ${conf.env}`,

    // use the `.browserlistrc` file directly to avoid browserslist searching
    target: `browserslist:${browsersListPath}:defaults`,

    output: {
      wasmLoading: 'fetch',
      // required for `integrity` to work in the browser
      crossOriginLoading: 'anonymous',
      // filenames for *initial* files (essentially JS entry points)
      filename: '[name].[contenthash].js',
      // chunkFilename is used because in some cases webpack may generate a
      // filename that starts with "_", which chrome does not allow at the root
      // of the extension directory (subdirectories are fine). If we switch to
      // `output.module = true` this function must be updated to return an `.mjs`
      // extension. Alternatively, we could output all js files to a
      // subdirectory and not have to worry about it.
      chunkFilename: ({ chunk }) => {
        if (chunk!.id?.toString().startsWith('_')) {
          return '-[id].[contenthash].js';
        }
        return '[id].[contenthash].js';
      },

      path: resolve(__dirname, `../../dist/webpack/${BROWSER}`),
      // Clean the output directory before emit, so that only the latest build
      // files remain. Nearly 0 performance penalty for this clean up step.
      clean: true,
      // relative to HTML page. This value is essentially prepended to asset URLs
      // in the output HTML, i.e., `<script src="<publicPath><resourcePath>">`.
      publicPath: '',

      // disabling pathinfo makes reading the bundle harder, but reduces build
      // time by 500ms+
      pathinfo: false,
    },

    resolve: {
      // Disable symlinks for performance; saves about .5 seconds off full build
      symlinks: false,

      // Extensions added to the request when trying to find the file. The most
      // common extensions should be first to improve resolution performance.
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],

      // use `fallback` to redirect module requests when normal resolving fails,
      // good for polyfill-ing built-in node modules that aren't available in
      // the browser. The browser will first attempt to load these modules, if
      // it fails it will load the fallback.
      fallback: {
        // #region conditionally remove developer tooling
        'react-devtools': isDevelopment
          ? require.resolve('react-devtools')
          : false,
        // remove remote-redux-devtools unless METAMASK_DEBUG is enabled
        'remote-redux-devtools': ENV.METAMASK_DEBUG
          ? require.resolve('remote-redux-devtools')
          : false,
        // #endregion conditionally remove developer tooling

        // #region node polyfills
        crypto: require.resolve('crypto-browserify'),
        fs: false,
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        path: require.resolve('path-browserify'),
        stream: require.resolve('stream-browserify'),
        vm: false,
        zlib: false,
        // #endregion node polyfills
      },
    },

    module: {
      // an important note: loaders in a `use` array are applied in *reverse*
      // order, i.e., bottom to top, (or right to left depending on the current
      // formatting of the file)
      rules: [
        // html: use the Squirrelly template engine for html files
        {
          test: /\.html?$/u,
          loader: require.resolve('./utils/loaders/squirrellyHtmlLoader'),
          options: {
            isMMI: false,
            isSnowing: conf.snow,
          },
        },
        // json
        { test: /\.json$/u, type: 'json' },
        // own typescript, and own typescript with jsx
        {
          test: /\.(?:ts|mts|tsx)$/u,
          exclude: NODE_MODULES_RE,
          use: [
            getSwcLoader('typescript', true, conf, envsStringified),
            codeFenceLoader,
          ],
        },
        // own javascript, and own javascript with jsx
        {
          test: /\.(?:js|mjs|jsx)$/u,
          exclude: NODE_MODULES_RE,
          use: [
            getSwcLoader('ecmascript', true, conf, envsStringified),
            codeFenceLoader,
          ],
        },
        // vendor javascript
        {
          test: /\.(?:js|mjs)$/u,
          include: NODE_MODULES_RE,
          // never process `@lavamoat/snow/**.*`
          exclude: /^.*\/node_modules\/@lavamoat\/snow\/.*$/u,
          resolve: {
            // ESM is the worst thing to happen to JavaScript since JavaScript.
            fullySpecified: false,
          },
          use: [getSwcLoader('ecmascript', false, conf, envsStringified)],
        },
        // css, sass/scss
        {
          test: /\.(css|sass|scss)$/u,
          use: [
            // Resolves CSS `@import` and `url()` paths and loads the files.
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    autoprefixer({ overrideBrowserslist: browsersListQuery }),
                    rtlCss({ processEnv: false }),
                  ],
                },
              },
            },
            // Compiles Sass to CSS
            {
              loader: 'sass-loader',
              options: {
                sassOptions: {
                  api: 'modern',

                  // We don't need to specify the charset because the HTML
                  // already does and browsers use the HTML's charset for CSS.
                  // Additionally, webpack + sass can cause problems with the
                  // charset placement, as described here:
                  // https://github.com/webpack-contrib/css-loader/issues/1212
                  charset: false,

                  // Use 'sass-embedded', as it is usually faster than 'sass'
                  implementation: 'sass-embedded',

                  // The order of includePaths is important; prefer our own
                  // folders over `node_modules`
                  includePaths: [
                    // enables aliases to `@use design - system`,
                    // `@use utilities`, etc.
                    './ui/css',
                    './node_modules',
                  ],

                  // Disable the webpackImporter, as we:
                  //  a) don't want to rely on it in case we want to switch in
                  //     the future
                  //  b) the sass importer is faster
                  //  c) the "modern" sass api doesn't work with the
                  //     webpackImporter, but we switch to "modern" before it is
                  //     supported it'd be nice to not have to finagle things.
                  webpackImporter: false,
                },
              },
            },
            codeFenceLoader,
          ],
        },
        // images, fonts, wasm, etc.
        {
          test: /\.(?:png|jpe?g|ico|webp|svg|gif|ttf|eot|woff2?|wasm)$/u,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name].[contenthash][ext]',
          },
        },
      ],
    },

    node: {
      // eventually we should avoid any code that uses node globals `__dirname`,
      // `__filename`, and `global`. But for now, just warn about their use.
      __dirname: 'warn-mock',
      __filename: 'warn-mock',
      // Hopefully in the the future we won't need to polyfill node `global`, as
      // a browser version, `globalThis`, already exists and we should use it
      // instead.
      global: true,
    },

    optimization: {
      // only enable sideEffects, providedExports, removeAvailableModules, and
      // usedExports for production, as these options slow down the build
      sideEffects: !isDevelopment,
      providedExports: !isDevelopment,
      removeAvailableModules: !isDevelopment,
      usedExports: !isDevelopment,

      // 'deterministic' results in faster recompilations in cases where a child
      // chunk changes, but the parent chunk does not.
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      minimize: conf.minify,
      minimizer: conf.minify ? getMinimizers() : [],

      // Make most chunks share a single runtime file, which contains the
      // webpack "runtime". The exception is @lavamoat/snow and all scripts
      // found in the extension manifest; these scripts must be self-contained
      // and cannot share code with other scripts - as the browser extension
      // platform is responsible for loading them and splitting these files
      // would require updating the manifest to include the other chunks.
      runtimeChunk: {
        name(entry: Chunk) {
          return canBeChunked(entry) ? `runtime` : false;
        },
      },
      splitChunks: {
        // Impose a 4MB JS file size limit due to Firefox limitations
        // https://github.com/mozilla/addons-linter/issues/4942
        maxSize: 1 << 22,
        minSize: 1,
        // Optimize duplication and caching by splitting chunks by shared
        // modules and cache group.
        cacheGroups: {
          js: {
            // only our own ts/mts/tsx/js/mjs/jsx files (not in node_modules)
            test: /(?!.*\/node_modules\/).+\.(?:m?[tj]s|[tj]sx?)?$/u,
            name: 'js',
            chunks: canBeChunked,
          },
          vendor: {
            // js/mjs files in node_modules or subdirectories of node_modules
            test: /[\\/]node_modules[\\/].*?\.m?js$/u,
            name: 'vendor',
            chunks: canBeChunked,
          },
        },
      },
    },

    // TODO: look into using SourceMapDevToolPlugin and its exclude option to speed up the build
    // TODO: put source maps in an upper level directory (like the gulp build does now)
    // see: https://webpack.js.org/plugins/source-map-dev-tool-plugin/#host-source-maps-externally
    devtool: conf.devtool === 'none' ? false : conf.devtool,

    watchOptions: {
      aggregateTimeout: 5,
      // ignore node_modules, to avoid `fs.inotify.max_user_watches` issues
      ignored: NODE_MODULES_RE,
    },
  } as const satisfies Configuration;

  if (HMR_READY && conf.watch) {
    // Use `webpack-dev-server` to enable HMR
    const WebpackDevServer: typeof WebpackDevServerType = require('webpack-dev-server');
    const options = {
      hot: isDevelopment,
      liveReload: isDevelopment,
      server: {
        // TODO: is there any benefit to using https?
        type: 'https',
      },
      // always use loopback, as 0.0.0.0 tends to fail on some machines (WSL2?)
      host: 'localhost',
      devMiddleware: {
        // browsers need actual files on disk
        writeToDisk: true,
      },
      // we don't need/have a "static" directory, so disable it
      static: false,
      allowedHosts: 'all',
    } as const satisfies WebpackDevServerType.Configuration;

    const server = new WebpackDevServer(options, webpack(webpackOptions));
    server.start();
  } else {
    console.error(`🦊 Running ${conf.env} build…`);

    const compiler = webpack(webpackOptions);
    if (conf.watch) {
      // once HMR is ready (HMR_READY variable), this section should be removed.
      compiler.watch(webpackOptions.watchOptions, (err, stats) => {
        logSummary(conf.stats, err, stats);
        console.error('🦊 Watching for changes…');
      });
    } else {
      compiler.run((err, stats) => {
        logSummary(conf.stats, err, stats);
        onBuild();
        compiler.close(noop);
      });
    }
  }
}
