import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import * as git from '../utils/git';

describe('git', () => {
  it('should get the latest commit hash', () => {
    const gitHash = execSync('git rev-parse HEAD').toString().trim();
    const commitHash = git.getLastCommitHash();
    assert.strictEqual(commitHash, gitHash);
  });

  it('should get getLastCommitTimestamp', () => {
    const gitTimestamp = execSync('git log -1 --format=%at').toString().trim();
    const timestamp = git.getCommitTimestamp();
    assert.strictEqual(timestamp, Number(gitTimestamp) * 1000);
  });
});
