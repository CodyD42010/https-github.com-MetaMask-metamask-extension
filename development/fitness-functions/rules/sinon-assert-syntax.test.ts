import { generateModifyFilesDiff } from '../common/test-data';
import { preventSinonAssertSyntax } from './sinon-assert-syntax';

describe('preventSinonAssertSyntax()', (): void => {
  it('should pass when receiving an empty diff', (): void => {
    const testDiff = '';

    const hasRulePassed = preventSinonAssertSyntax(testDiff);

    expect(hasRulePassed).toBe(true);
  });

  it('should not pass when receiving a diff with one of the blocked expressions', (): void => {
    const infringingExpression = 'assert.equal';
    const testDiff = [
      generateModifyFilesDiff('new-file.ts', 'foo', 'bar'),
      generateModifyFilesDiff('old-file.js', undefined, 'pong'),
      generateModifyFilesDiff(
        'test.js',
        `yada yada ${infringingExpression} yada yada`,
        undefined,
      ),
    ].join('');

    const hasRulePassed = preventSinonAssertSyntax(testDiff);

    expect(hasRulePassed).toBe(false);
  });
});
