import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { captureException } from '@sentry/browser';
import BlockaidPackage from '@blockaid/ppom_release/package.json';

import { NETWORK_TO_NAME_MAP } from '../../../../../shared/constants/network';
import {
  OverflowWrap,
  Severity,
} from '../../../../helpers/constants/design-system';
import { I18nContext } from '../../../../contexts/i18n';
import {
  BlockaidReason,
  BlockaidResultType,
  SecurityProvider,
} from '../../../../../shared/constants/security-provider';
import { Text } from '../../../component-library';

import SecurityProviderBannerAlert from '../security-provider-banner-alert';
import { getReportUrl } from './blockaid-banner-utils';

const zlib = require('zlib');

/** Reason to description translation key mapping. Grouped by translations. */
const REASON_TO_DESCRIPTION_TKEY = Object.freeze({
  [BlockaidReason.approvalFarming]: 'blockaidDescriptionApproveFarming',
  [BlockaidReason.permitFarming]: 'blockaidDescriptionApproveFarming',
  [BlockaidReason.setApprovalForAll]: 'blockaidDescriptionApproveFarming',

  [BlockaidReason.blurFarming]: 'blockaidDescriptionBlurFarming',

  [BlockaidReason.failed]: 'blockaidDescriptionFailed',

  [BlockaidReason.seaportFarming]: 'blockaidDescriptionSeaportFarming',

  [BlockaidReason.maliciousDomain]: 'blockaidDescriptionMaliciousDomain',

  [BlockaidReason.rawSignatureFarming]: 'blockaidDescriptionMightLoseAssets',
  [BlockaidReason.tradeOrderFarming]: 'blockaidDescriptionMightLoseAssets',

  [BlockaidReason.rawNativeTokenTransfer]: 'blockaidDescriptionTransferFarming',
  [BlockaidReason.transferFarming]: 'blockaidDescriptionTransferFarming',
  [BlockaidReason.transferFromFarming]: 'blockaidDescriptionTransferFarming',

  [BlockaidReason.other]: 'blockaidDescriptionMightLoseAssets',
});

/** Reason to title translation key mapping. */
const REASON_TO_TITLE_TKEY = Object.freeze({
  [BlockaidReason.failed]: 'blockaidTitleMayNotBeSafe',
  [BlockaidReason.rawSignatureFarming]: 'blockaidTitleSuspicious',
});

function BlockaidBannerAlert({ txData, ...props }) {
  const { securityAlertResponse, origin, msgParams, type, txParams, chainId } =
    txData;

  const t = useContext(I18nContext);

  if (!securityAlertResponse) {
    return null;
  }

  const {
    reason,
    result_type: resultType,
    features,
    block,
  } = securityAlertResponse;

  if (resultType === BlockaidResultType.Benign) {
    return null;
  }

  if (!REASON_TO_DESCRIPTION_TKEY[reason]) {
    captureException(`BlockaidBannerAlert: Unidentified reason '${reason}'`);
  }

  const description = t(
    REASON_TO_DESCRIPTION_TKEY[reason] || REASON_TO_DESCRIPTION_TKEY.other,
  );

  const details = features?.length ? (
    <Text as="ul" overflowWrap={OverflowWrap.BreakWord}>
      {features.map((feature, i) => (
        <li key={`blockaid-detail-${i}`}>• {feature}</li>
      ))}
    </Text>
  ) : null;

  const isFailedResultType = resultType === BlockaidResultType.Failed;

  const severity =
    resultType === BlockaidResultType.Malicious
      ? Severity.Danger
      : Severity.Warning;

  const title = t(REASON_TO_TITLE_TKEY[reason] || 'blockaidTitleDeceptive');

  const reportUrl = (() => {
    const reportData = {
      domain: origin ?? msgParams?.origin,
      jsonRpcMethod: type,
      jsonRpcParams: JSON.stringify(txParams ?? msgParams),
      blockNumber: block,
      chain: NETWORK_TO_NAME_MAP[chainId],
      classification: reason,
      blockaidVersion: BlockaidPackage.version,
      resultType,
      reproduce: JSON.stringify(features),
    };

    const jsonData = JSON.stringify(reportData);

    const encodedData = zlib?.gzipSync?.(jsonData) ?? jsonData;

    return getReportUrl(encodedData);
  })();

  return (
    <SecurityProviderBannerAlert
      description={description}
      details={details}
      provider={isFailedResultType ? null : SecurityProvider.Blockaid}
      severity={severity}
      title={title}
      reportUrl={reportUrl}
      {...props}
    />
  );
}

BlockaidBannerAlert.propTypes = {
  txData: PropTypes.object,
};

export default BlockaidBannerAlert;
