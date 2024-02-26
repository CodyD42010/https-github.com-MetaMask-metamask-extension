const pify = require('pify');
const gulp = require('gulp');
const autoprefixer = require('autoprefixer');
const gulpStylelint = require('gulp-stylelint');
const watch = require('gulp-watch');
const sourcemaps = require('gulp-sourcemaps');
const rtlcss = require('postcss-rtlcss');
const postcss = require('gulp-postcss');
const urlrewrite = require('postcss-urlrewrite');
const pump = pify(require('pump'));
const sass = require('sass-embedded');
const gulpSass = require('gulp-sass')(sass);
const { TASKS } = require('./constants');
const { createTask } = require('./task');

// scss compilation and autoprefixing tasks
module.exports = createStyleTasks;

function createStyleTasks({ livereload }) {
  const prod = createTask(
    TASKS.STYLES_PROD,
    createScssBuildTask({
      src: 'ui/css/index.scss',
      dest: 'ui/css/output',
      devMode: false,
    }),
  );

  const dev = createTask(
    TASKS.STYLES_DEV,
    createScssBuildTask({
      src: 'ui/css/index.scss',
      dest: 'ui/css/output',
      devMode: true,
      pattern: 'ui/**/*.scss',
    }),
  );

  const lint = createTask(TASKS.LINT_SCSS, function () {
    return gulp.src('ui/css/itcss/**/*.scss').pipe(
      gulpStylelint({
        reporters: [{ formatter: 'string', console: true }],
        fix: true,
      }),
    );
  });

  return { prod, dev, lint };

  function createScssBuildTask({ src, dest, devMode, pattern }) {
    return async function () {
      if (devMode) {
        watch(pattern, async (event) => {
          await buildScss();
          livereload.changed(event.path);
        });
      }
      await buildScss();
    };

    async function buildScss() {
      await buildScssPipeline(src, dest, devMode);
    }
  }
}

async function buildScssPipeline(src, dest, devMode) {
  await pump(
    ...[
      // pre-process
      gulp.src(src),
      devMode && sourcemaps.init(),
      gulpSass({
        // The order of includePaths is important; prefer our own
        // folders over `node_modules`
        includePaths: [
          // enables shortcuts to `@use design-system`, `@use utilities`, etc.
          'ui/css/',
          'node_modules/',
        ],
        functions: {
          /**
           * Tell Sass where to find the font-awesome font files. Update this
           * location in static.js if it changes.
           *
           * @returns {sass.SassString}
           */
          '-mm-fa-path()': () => new sass.SassString('./fonts/fontawesome'),
        },
      }).on('error', gulpSass.logError),
      postcss([
        urlrewrite({
          rules: [
            {
              from: /^\/app\/images\//u,
              to: 'images/',
            },
          ],
        }),
        autoprefixer(),
        rtlcss(),
      ]),
      devMode && sourcemaps.write(),
      gulp.dest(dest),
    ].filter(Boolean),
  );
}
