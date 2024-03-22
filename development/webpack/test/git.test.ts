import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import * as git from '../utils/git';
import { join } from 'node:path';

describe('git', () => {
  const mocks = ["loose", "pack"];
  mocks.forEach((mock) => {
    const gitDir = join(__dirname, `./mocks/git/${mock}`);
    it('should get the latest commit hash', () => {
      const gitHash = "82f8d685e4619bd93dd86b6942ebdb344e3861c5";
      const commitHash = git.getLastCommitHash(gitDir);
      assert.strictEqual(commitHash, gitHash);
    });

    it('should get getLastCommitTimestamp', () => {
      const gitTimestamp = 1711062839;
      const timestamp = git.getCommitTimestamp(null, gitDir);
      // our timestamps have millisecond precision, because: JavaScript.
      assert.strictEqual(timestamp, Number(gitTimestamp) * 1000);
    });
  });
});
