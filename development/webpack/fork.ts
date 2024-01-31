const launchPid = Number(process.env.LAUNCHPID);
if (isNaN(launchPid) || launchPid !== process.ppid) {
  throw new Error(
    `${__filename} must be run with a \`LAUNCHPID\` environment variable0. See ${__dirname}/launch.ts for an example.`,
  );
}

require('./build').build(() => {
  // stop writing, as once the parent goes away the tty can be ignored.
  [process.stdout, process.stderr].forEach(out => out.cork());
  process.kill(launchPid, "SIGUSR2");
});
