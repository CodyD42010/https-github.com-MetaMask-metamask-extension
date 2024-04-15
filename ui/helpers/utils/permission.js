import deepFreeze from 'deep-freeze-strict';
import React from 'react';

///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { getRpcCaveatOrigins } from '@metamask/snaps-rpc-methods';
import {
  SnapCaveatType,
  getSlip44ProtocolName,
  getSnapDerivationPathName,
} from '@metamask/snaps-utils';
import { isNonEmptyArray } from '@metamask/controller-utils';
///: END:ONLY_INCLUDE_IF
import classnames from 'classnames';
import {
  RestrictedMethods,
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  EndowmentPermissions,
  ///: END:ONLY_INCLUDE_IF
} from '../../../shared/constants/permissions';
import Tooltip from '../../components/ui/tooltip';
import {
  AvatarIcon,
  AvatarIconSize,
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  Icon,
  Text,
  ///: END:ONLY_INCLUDE_IF
  IconName,
  IconSize,
} from '../../components/component-library';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import {
  FontWeight,
  IconColor,
  TextColor,
  TextVariant,
} from '../constants/design-system';
///: END:ONLY_INCLUDE_IF

const UNKNOWN_PERMISSION = Symbol('unknown');

///: BEGIN:ONLY_INCLUDE_IF(snaps)
const RIGHT_INFO_ICON = (
  <Icon name={IconName.Info} size={IconSize.Sm} color={IconColor.iconMuted} />
);
///: END:ONLY_INCLUDE_IF

function getLeftIcon(iconName) {
  return (
    <AvatarIcon
      iconName={iconName}
      size={AvatarIconSize.Sm}
      iconProps={{
        size: IconSize.Xs,
      }}
    />
  );
}

function getSnapNameComponent(snapName) {
  return (
    <Text
      fontWeight={FontWeight.Medium}
      variant={TextVariant.inherit}
      color={TextColor.inherit}
    >
      {snapName}
    </Text>
  );
}

export const PERMISSION_DESCRIPTIONS = deepFreeze({
  [RestrictedMethods.eth_accounts]: ({ t }) => ({
    label: t('permission_ethereumAccounts'),
    leftIcon: getLeftIcon(IconName.Eye),
    rightIcon: null,
    weight: 3,
  }),
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  [RestrictedMethods.snap_dialog]: ({ t, subjectName }) => ({
    label: t('permission_dialog'),
    description: t('permission_dialogDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.Messages,
    weight: 4,
  }),
  [RestrictedMethods.snap_notify]: ({ t, subjectName }) => ({
    label: t('permission_notifications'),
    description: t('permission_notificationsDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.Notification,
    weight: 4,
  }),
  [RestrictedMethods.snap_getBip32PublicKey]: ({
    t,
    permissionValue,
    subjectName,
  }) =>
    permissionValue.caveats[0].value.map(({ path, curve }, i) => {
      const baseDescription = {
        leftIcon: IconName.SecuritySearch,
        weight: 2,
        id: `public-key-access-bip32-${path
          .join('-')
          ?.replace(/'/gu, 'h')}-${curve}-${i}`,
        warningMessageSubject:
          getSnapDerivationPathName(path, curve) ??
          `${t('unknownNetworkForKeyEntropy')}  ${path.join('/')} (${curve})`,
      };

      const friendlyName = getSnapDerivationPathName(path, curve);
      if (friendlyName) {
        return {
          ...baseDescription,
          label: t('permission_viewNamedBip32PublicKeys', [
            <Text
              color={TextColor.inherit}
              variant={TextVariant.inherit}
              fontWeight={FontWeight.Medium}
              key={path.join('/')}
            >
              {friendlyName}
            </Text>,
          ]),
          description: t('permission_viewBip32PublicKeysDescription', [
            <Text
              color={TextColor.inherit}
              variant={TextVariant.inherit}
              fontWeight={FontWeight.Medium}
              key={`description-${path.join('/')}`}
            >
              {friendlyName}
            </Text>,
            getSnapNameComponent(subjectName),
          ]),
        };
      }

      return {
        ...baseDescription,
        label: t('permission_viewBip32PublicKeys', [
          <Text
            color={TextColor.inherit}
            variant={TextVariant.inherit}
            fontWeight={FontWeight.Medium}
            key={path.join('/')}
          >
            {`${t('unknownNetworkForKeyEntropy')} `} {path.join('/')}
          </Text>,
          curve,
        ]),
        description: t('permission_viewBip32PublicKeysDescription', [
          <Text
            color={TextColor.inherit}
            variant={TextVariant.inherit}
            fontWeight={FontWeight.Medium}
            key={`description-${path.join('/')}`}
          >
            {path.join('/')}
          </Text>,
          getSnapNameComponent(subjectName),
        ]),
      };
    }),
  [RestrictedMethods.snap_getBip32Entropy]: ({
    t,
    permissionValue,
    subjectName,
  }) =>
    permissionValue.caveats[0].value.map(({ path, curve }, i) => {
      const baseDescription = {
        leftIcon: IconName.Key,
        weight: 1,
        id: `key-access-bip32-${path
          .join('-')
          ?.replace(/'/gu, 'h')}-${curve}-${i}`,
        warningMessageSubject:
          getSnapDerivationPathName(path, curve) ??
          `${t('unknownNetworkForKeyEntropy')} ${path.join('/')} (${curve})`,
      };

      const friendlyName = getSnapDerivationPathName(path, curve);
      if (friendlyName) {
        return {
          ...baseDescription,
          label: t('permission_manageBip32Keys', [
            <Text
              color={TextColor.inherit}
              variant={TextVariant.inherit}
              fontWeight={FontWeight.Medium}
              key={path.join('/')}
            >
              {friendlyName}
            </Text>,
          ]),
          description: t('permission_manageBip44AndBip32KeysDescription', [
            getSnapNameComponent(subjectName),
          ]),
        };
      }

      return {
        ...baseDescription,
        label: t('permission_manageBip32Keys', [
          <Text
            color={TextColor.inherit}
            variant={TextVariant.inherit}
            fontWeight={FontWeight.Medium}
            key={path.join('/')}
          >
            {`${t('unknownNetworkForKeyEntropy')} ${path.join('/')} (${curve})`}
          </Text>,
        ]),
        description: t('permission_manageBip44AndBip32KeysDescription', [
          getSnapNameComponent(subjectName),
        ]),
      };
    }),
  [RestrictedMethods.snap_getBip44Entropy]: ({
    t,
    permissionValue,
    subjectName,
  }) =>
    permissionValue.caveats[0].value.map(({ coinType }, i) => ({
      label: t('permission_manageBip44Keys', [
        <Text
          color={TextColor.inherit}
          variant={TextVariant.inherit}
          fontWeight={FontWeight.Medium}
          key={`coin-type-${coinType}`}
        >
          {getSlip44ProtocolName(coinType) ??
            `${t('unknownNetworkForKeyEntropy')} m/44'/${coinType}'`}
        </Text>,
      ]),
      description: t('permission_manageBip44AndBip32KeysDescription', [
        getSnapNameComponent(subjectName),
      ]),
      leftIcon: IconName.Key,
      weight: 1,
      id: `key-access-bip44-${coinType}-${i}`,
      warningMessageSubject:
        getSlip44ProtocolName(coinType) ??
        `${t('unknownNetworkForKeyEntropy')} m/44'/${coinType}'`,
    })),
  [RestrictedMethods.snap_getEntropy]: ({ t, subjectName }) => ({
    label: t('permission_getEntropy', [getSnapNameComponent(subjectName)]),
    description: t('permission_getEntropyDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.SecurityKey,
    weight: 4,
  }),

  [RestrictedMethods.snap_manageState]: ({ t, subjectName }) => ({
    label: t('permission_manageState'),
    description: t('permission_manageStateDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.AddSquare,
    weight: 4,
  }),
  [RestrictedMethods.snap_getLocale]: ({ t, subjectName }) => ({
    label: t('permission_getLocale'),
    description: t('permission_getLocaleDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.Global,
    weight: 4,
  }),
  [RestrictedMethods.wallet_snap]: ({ t, permissionValue, getSubjectName }) => {
    const snaps = permissionValue.caveats[0].value;
    const baseDescription = {
      leftIcon: getLeftIcon(IconName.Flash),
      rightIcon: RIGHT_INFO_ICON,
    };

    return Object.keys(snaps).map((snapId) => {
      const snapName = getSubjectName(snapId);
      if (snapName) {
        return {
          ...baseDescription,
          label: t('permission_accessNamedSnap', [
            <Text
              color={TextColor.inherit}
              variant={TextVariant.inherit}
              fontWeight={FontWeight.Medium}
              key={snapId}
            >
              {snapName}
            </Text>,
          ]),
          description: t('permission_accessSnapDescription', [snapName]),
        };
      }

      return {
        ...baseDescription,
        label: t('permission_accessSnap', [snapId]),
        description: t('permission_accessSnapDescription', [snapId]),
      };
    });
  },
  [EndowmentPermissions['endowment:network-access']]: ({ t, subjectName }) => ({
    label: t('permission_accessNetwork'),
    description: t('permission_accessNetworkDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.Wifi,
    weight: 3,
  }),
  [EndowmentPermissions['endowment:webassembly']]: ({ t, subjectName }) => ({
    label: t('permission_webAssembly'),
    description: t('permission_webAssemblyDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.DocumentCode,
    rightIcon: null,
    weight: 3,
  }),
  [EndowmentPermissions['endowment:transaction-insight']]: ({
    t,
    permissionValue,
    subjectName,
  }) => {
    const baseDescription = {
      leftIcon: IconName.Speedometer,
      weight: 4,
    };

    const result = [
      {
        ...baseDescription,
        label: t('permission_transactionInsight'),
        description: t('permission_transactionInsightDescription', [
          getSnapNameComponent(subjectName),
        ]),
      },
    ];

    if (
      isNonEmptyArray(permissionValue.caveats) &&
      permissionValue.caveats[0].type === SnapCaveatType.TransactionOrigin &&
      permissionValue.caveats[0].value
    ) {
      result.push({
        ...baseDescription,
        label: t('permission_transactionInsightOrigin'),
        description: t('permission_transactionInsightOriginDescription', [
          getSnapNameComponent(subjectName),
        ]),
        leftIcon: IconName.Explore,
      });
    }

    return result;
  },
  [EndowmentPermissions['endowment:cronjob']]: ({ t, subjectName }) => ({
    label: t('permission_cronjob'),
    description: t('permission_cronjobDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.Clock,
    weight: 3,
  }),
  [EndowmentPermissions['endowment:ethereum-provider']]: ({
    t,
    subjectName,
  }) => ({
    label: t('permission_ethereumProvider'),
    description: t('permission_ethereumProviderDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.Ethereum,
    weight: 3,
    id: 'ethereum-provider-access',
    message: t('ethereumProviderAccess', [getSnapNameComponent(subjectName)]),
  }),
  [EndowmentPermissions['endowment:rpc']]: ({
    t,
    permissionValue,
    subjectName,
  }) => {
    const baseDescription = {
      leftIcon: IconName.Hierarchy,
      weight: 3,
    };

    const { snaps, dapps, allowedOrigins } =
      getRpcCaveatOrigins(permissionValue);
    const results = [];
    if (snaps) {
      results.push({
        ...baseDescription,
        label: t('permission_rpc', [
          t('otherSnaps'),
          getSnapNameComponent(subjectName),
        ]),
        description: t('permission_rpcDescription', [
          t('otherSnaps'),
          getSnapNameComponent(subjectName),
        ]),
      });
    }

    if (dapps) {
      results.push({
        ...baseDescription,
        label: t('permission_rpc', [
          t('websites'),
          getSnapNameComponent(subjectName),
        ]),
        description: t('permission_rpcDescription', [
          t('websites'),
          getSnapNameComponent(subjectName),
        ]),
      });
    }

    if (allowedOrigins?.length > 0) {
      let originsMessage;

      if (allowedOrigins.length === 1) {
        originsMessage = (
          <Text
            color={TextColor.inherit}
            variant={TextVariant.inherit}
            fontWeight={FontWeight.Medium}
          >
            {allowedOrigins[0]}
          </Text>
        );
      } else {
        const lastOrigin = allowedOrigins.slice(-1);

        const originList = allowedOrigins.slice(0, -1).map((origin) => (
          <>
            <Text
              color={TextColor.inherit}
              variant={TextVariant.inherit}
              fontWeight={FontWeight.Medium}
            >
              {origin}
            </Text>
            {', '}
          </>
        ));

        originsMessage = t('permission_rpcDescriptionOriginList', [
          originList,
          <Text
            color={TextColor.inherit}
            variant={TextVariant.inherit}
            fontWeight={FontWeight.Medium}
            key="2"
          >
            {lastOrigin}
          </Text>,
        ]);
      }
      results.push({
        ...baseDescription,
        label: t('permission_rpc', [
          originsMessage,
          getSnapNameComponent(subjectName),
        ]),
        description: t('permission_rpcDescription', [
          originsMessage,
          getSnapNameComponent(subjectName),
        ]),
      });
    }

    return results;
  },
  [EndowmentPermissions['endowment:lifecycle-hooks']]: ({
    t,
    subjectName,
  }) => ({
    label: t('permission_lifecycleHooks'),
    description: t('permission_lifecycleHooksDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.Hierarchy,
    weight: 4,
  }),
  [EndowmentPermissions['endowment:page-home']]: ({ t, subjectName }) => ({
    label: t('permission_homePage'),
    description: t('permission_homePageDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: IconName.Home,
    weight: 4,
  }),
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  [RestrictedMethods.snap_manageAccounts]: ({ t, subjectName }) => ({
    label: t('permission_manageAccounts'),
    description: t('permission_manageAccountsDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: getLeftIcon(IconName.UserCircleAdd),
    rightIcon: null,
    weight: 3,
  }),
  [EndowmentPermissions['endowment:keyring']]: ({ t, subjectName }) => ({
    label: t('permission_keyring'),
    description: t('permission_keyringDescription', [
      getSnapNameComponent(subjectName),
    ]),
    leftIcon: getLeftIcon(IconName.UserCircleAdd),
    rightIcon: null,
    weight: 3,
  }),
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(build-flask)
  [EndowmentPermissions['endowment:name-lookup']]: ({ t }) => ({
    label: t('permission_nameLookup'),
    description: t('permission_nameLookupDescription'),
    leftIcon: getLeftIcon(IconName.Search),
    weight: 4,
  }),
  [EndowmentPermissions['endowment:signature-insight']]: ({
    t,
    permissionValue,
    subjectName,
  }) => {
    const baseDescription = {
      leftIcon: IconName.Warning,
      weight: 3,
    };

    const result = [
      {
        ...baseDescription,
        label: t('permission_signatureInsight'),
        description: t('permission_signatureInsightDescription', [
          getSnapNameComponent(subjectName),
        ]),
      },
    ];

    if (
      isNonEmptyArray(permissionValue.caveats) &&
      permissionValue.caveats.find((caveat) => {
        return caveat.type === SnapCaveatType.SignatureOrigin && caveat.value;
      })
    ) {
      result.push({
        ...baseDescription,
        label: t('permission_signatureInsightOrigin'),
        description: t('permission_signatureInsightOriginDescription', [
          getSnapNameComponent(subjectName),
        ]),
        leftIcon: IconName.Explore,
      });
    }

    return result;
  },
  ///: END:ONLY_INCLUDE_IF
  [UNKNOWN_PERMISSION]: ({ t, permissionName }) => ({
    label: t('permission_unknown', [permissionName ?? 'undefined']),
    leftIcon: getLeftIcon(IconName.Question),
    rightIcon: null,
    weight: 5,
  }),
});

/**
 * @typedef {object} PermissionLabelObject
 * @property {string} label - The text label.
 * @property {string} [description] - An optional description, shown when the
 * `rightIcon` is hovered.
 * @property {string} leftIcon - The left icon.
 * @property {string} rightIcon - The right icon.
 * @property {number} weight - The weight of the permission.
 * @property {string} permissionName - The name of the permission.
 * @property {string} permissionValue - The raw value of the permission.
 */

/**
 * @typedef {object} PermissionDescriptionParamsObject
 * @property {Function} t - The translation function.
 * @property {string} permissionName - The name of the permission.
 * @property {object} permissionValue - The permission object.
 * @property {string} subjectName - The name of the subject.
 * @property {Function} getSubjectName - The function used to get the subject name.
 */

/**
 * @param {PermissionDescriptionParamsObject} params - The permission description params object.
 * @returns {PermissionLabelObject[]}
 */
export const getPermissionDescription = ({
  t,
  permissionName,
  permissionValue,
  subjectName,
  getSubjectName,
}) => {
  let value = PERMISSION_DESCRIPTIONS[UNKNOWN_PERMISSION];

  if (Object.hasOwnProperty.call(PERMISSION_DESCRIPTIONS, permissionName)) {
    value = PERMISSION_DESCRIPTIONS[permissionName];
  }

  const result = value({
    t,
    permissionName,
    permissionValue,
    subjectName,
    getSubjectName,
  });
  if (!Array.isArray(result)) {
    return [{ ...result, permissionName, permissionValue }];
  }

  return result.map((item) => ({
    ...item,
    permissionName,
    permissionValue,
  }));
};

/**
 * @typedef {object} WeightedPermissionDescriptionParamsObject
 * @property {Function} t - The translation function.
 * @property {string} permissions - The permissions object.
 * @property {Function} [getSubjectName] - The function to get a subject name.
 * @property {string} [subjectName] - The name of the subject.
 */

/**
 * Get the weighted permissions from a permissions object. The weight is used to
 * sort the permissions in the UI.
 *
 * @param {WeightedPermissionDescriptionParamsObject} parms - The weighted permissions params object.
 * @returns {PermissionLabelObject[]}
 */
export function getWeightedPermissions({
  t,
  permissions,
  getSubjectName,
  subjectName,
}) {
  return Object.entries(permissions)
    .reduce(
      (target, [permissionName, permissionValue]) =>
        target.concat(
          getPermissionDescription({
            t,
            permissionName,
            permissionValue,
            subjectName,
            getSubjectName,
          }),
        ),
      [],
    )
    .sort((left, right) => left.weight - right.weight);
}

/**
 * Get the right icon for a permission. If a description is provided, the icon
 * will be wrapped in a tooltip. Otherwise, the icon will be rendered as-is. If
 * there's no right icon, this function will return null.
 *
 * If the weight is 1, the icon will be rendered with a warning color.
 *
 * @param {PermissionLabelObject} permission - The permission object.
 * @param {JSX.Element | string} permission.rightIcon - The right icon.
 * @param {string} permission.description - The description.
 * @param {number} permission.weight - The weight.
 * @returns {JSX.Element | null} The right icon, or null if there's no
 * right icon.
 */
export function getRightIcon({ rightIcon, description, weight }) {
  if (rightIcon && description) {
    return (
      <Tooltip
        wrapperClassName={classnames(
          'permission__tooltip-icon',
          weight === 1 && 'permission__tooltip-icon__warning',
        )}
        html={<div>{description}</div>}
        position="bottom"
      >
        {typeof rightIcon === 'string' ? (
          <i className={rightIcon} />
        ) : (
          rightIcon
        )}
      </Tooltip>
    );
  }

  if (rightIcon) {
    if (typeof rightIcon === 'string') {
      return (
        <i className={classnames(rightIcon, 'permission__tooltip-icon')} />
      );
    }

    return rightIcon;
  }

  return null;
}
