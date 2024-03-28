import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getEnvironmentType } from '../../../../../../app/scripts/lib/util';
import { ENVIRONMENT_TYPE_FULLSCREEN } from '../../../../../../shared/constants/app';
import {
  HardwareTransportStates,
  LEDGER_USB_VENDOR_ID_NUMERIC,
  LedgerTransportTypes,
  WebHIDConnectedStatuses,
} from '../../../../../../shared/constants/hardware-wallets';
import {
  BannerAlert,
  BannerAlertSeverity,
  ButtonLink,
  Text,
} from '../../../../../components/component-library';
import {
  getLedgerTransportStatus,
  getLedgerWebHidConnectedStatus,
  setLedgerWebHidConnectedStatus,
} from '../../../../../ducks/app/app';
import { getLedgerTransportType } from '../../../../../ducks/metamask/metamask';
import {
  FontWeight,
  TextAlign,
  TextVariant,
} from '../../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import useLedgerConnection from '../../../hooks/useLedgerConnection';

const LedgerInfo: React.FC = () => {
  const { isLedgerWallet } = useLedgerConnection();
  const t = useI18nContext();
  const dispatch = useDispatch();

  const webHidConnectedStatus = useSelector(getLedgerWebHidConnectedStatus);
  const ledgerTransportType = useSelector(getLedgerTransportType);
  const transportStatus = useSelector(getLedgerTransportStatus);
  const environmentType = getEnvironmentType();
  const environmentTypeIsFullScreen =
    environmentType === ENVIRONMENT_TYPE_FULLSCREEN;

  if (!isLedgerWallet) {
    return null;
  }

  const usingWebHID = ledgerTransportType === LedgerTransportTypes.webhid;

  return (
    <BannerAlert severity={BannerAlertSeverity.Info}>
      <Text variant={TextVariant.headingSm} fontWeight={FontWeight.Medium}>
        {t('ledgerConnectionInstructionHeader')}
      </Text>
      <ul style={{ listStyle: 'disc' }}>
        <li>
          <Text variant={TextVariant.bodyMd}>
            {t('ledgerConnectionInstructionStepThree')}
          </Text>
        </li>
        <li>
          <Text variant={TextVariant.bodyMd}>
            {t('ledgerConnectionInstructionStepFour')}
          </Text>
        </li>
      </ul>
      {transportStatus === HardwareTransportStates.deviceOpenFailure && (
        <ButtonLink
          textAlign={TextAlign.Left}
          onClick={async () => {
            if (environmentTypeIsFullScreen) {
              window.location.reload();
            } else {
              (global.platform as any).openExtensionInBrowser(null, null, true);
            }
          }}
        >
          {t('ledgerConnectionInstructionCloseOtherApps')}
        </ButtonLink>
      )}
      {usingWebHID &&
        webHidConnectedStatus === WebHIDConnectedStatuses.notConnected && (
          <ButtonLink
            textAlign={TextAlign.Left}
            onClick={async () => {
              if (environmentTypeIsFullScreen) {
                const connectedDevices =
                  await window.navigator.hid.requestDevice({
                    filters: [{ vendorId: LEDGER_USB_VENDOR_ID_NUMERIC }],
                  });
                const webHidIsConnected = connectedDevices.some(
                  (device) =>
                    device.vendorId === Number(LEDGER_USB_VENDOR_ID_NUMERIC),
                );
                dispatch(
                  setLedgerWebHidConnectedStatus(
                    webHidIsConnected
                      ? WebHIDConnectedStatuses.connected
                      : WebHIDConnectedStatuses.notConnected,
                  ),
                );
              } else {
                (global.platform as any).openExtensionInBrowser(
                  null,
                  null,
                  true,
                );
              }
            }}
          >
            {environmentTypeIsFullScreen
              ? t('clickToConnectLedgerViaWebHID')
              : t('openFullScreenForLedgerWebHid')}
          </ButtonLink>
        )}
    </BannerAlert>
  );
};

export default LedgerInfo;
