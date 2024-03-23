import { describe, it } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import * as git from '../utils/git';

describe('git', () => {
  const mocks = ['loose', 'pack', 'ref'];
  mocks.forEach((mock) => {
    const gitDir = join(__dirname, `./fixtures/git/${mock}`);
    it('should get the latest commit hash', () => {
      const gitHash = '82f8d685e4619bd93dd86b6942ebdb344e3861c5';
      const commitHash = git.getLastCommitHash(gitDir);
      assert.strictEqual(commitHash, gitHash);
    });

    it('should get getLastCommitTimestamp', () => {
      const gitTimestamp = 1711062839;
      const timestamp = git.getCommitTimestamp(null, gitDir);
      // our timestamps have millisecond precision, because: JavaScript.
      assert.strictEqual(timestamp, Number(gitTimestamp) * 1000);
    });

    it(`should throw if the commit doesn't exist`, () => {
      assert.throws(
        () =>
          git.getCommitTimestamp(
            '0000000000000000000000000000000000000000',
            gitDir,
          ),
        /commit 0000000000000000000000000000000000000000 not found/u,
      );
    });
  });

  it('should throw if there is no HEAD file', () => {
    const gitDir = join(__dirname, `./fixtures/git/doesnt-exist`);
    assert.throws(
      () => git.getCommitTimestamp(null, gitDir),
      /ENOENT: no such file or directory/u,
    );
    assert.throws(
      () => git.getCommitTimestamp(undefined, gitDir),
      /ENOENT: no such file or directory/u,
    );
  });

  it('should throw if there are no commits', () => {
    const gitDir = join(__dirname, `./fixtures/git/no-commit`);
    assert.throws(
      () => git.getCommitTimestamp(null, gitDir),
      /ENOENT: no such file or directory/u,
    );
    assert.throws(
      () => git.getCommitTimestamp(undefined, gitDir),
      /ENOENT: no such file or directory/u,
    );
  });
});
