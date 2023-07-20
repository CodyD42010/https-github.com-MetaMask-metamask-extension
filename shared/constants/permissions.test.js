import { endowmentPermissionBuilders } from '@metamask/snaps-controllers';
import { restrictedMethodPermissionBuilders } from '@metamask/rpc-methods';
import {
  EndowmentPermissions,
  ExcludedSnapEndowments,
  ExcludedSnapPermissions,
  RestrictedMethods,
} from './permissions';

describe('EndowmentPermissions', () => {
  it('has the expected permission keys', () => {
    // Since long-running is fenced out this causes problems with the test, we re-add it here.
    expect(Object.keys(EndowmentPermissions).sort()).toStrictEqual(
      [
        'endowment:long-running',
        ...Object.keys(endowmentPermissionBuilders).filter(
          (targetName) =>
            !Object.keys(ExcludedSnapEndowments).includes(targetName),
        ),
      ].sort(),
    );
  });
});

describe('RestrictedMethods', () => {
  it('has the expected permission keys', () => {
    // this is done because we there is a difference between flask and stable permissions
    // the code fence in `shared/constants/snaps/permissions.ts` is not supported in jest
    const mainBuildRestrictedMethodPermissions = Object.keys(RestrictedMethods)
      .filter((key) => key !== 'snap_manageAccounts')
      .sort();

    expect(mainBuildRestrictedMethodPermissions).toStrictEqual(
      [
        'eth_accounts',
        ...Object.keys(restrictedMethodPermissionBuilders).filter(
          (targetName) =>
            !Object.keys(ExcludedSnapPermissions).includes(targetName),
        ),
      ].sort(),
    );
  });
});

// Kept here because code fences are not supported in jest.
// rpc methods flask has more restricted endowment permission builders
jest.mock('@metamask/rpc-methods', () =>
  jest.requireActual('@metamask/rpc-methods-flask'),
);

describe('Flask Restricted Methods', () => {
  it('has the expected flask permission keys', () => {
    const flaskExcludedSnapPermissions = Object.keys(
      ExcludedSnapPermissions,
    ).filter((key) => key !== 'snap_manageAccounts');

    expect(Object.keys(RestrictedMethods).sort()).toStrictEqual(
      [
        'eth_accounts',
        ...Object.keys(restrictedMethodPermissionBuilders).filter(
          (targetName) => !flaskExcludedSnapPermissions.includes(targetName),
        ),
      ].sort(),
    );
  });
});
